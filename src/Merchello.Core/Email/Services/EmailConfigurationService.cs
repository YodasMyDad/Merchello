using Merchello.Core.Data;
using Merchello.Core.Email.Attachments;
using Merchello.Core.Email.Interfaces;
using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Email.Services.Parameters;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Email.Services;

/// <summary>
/// Service for managing email configurations.
/// </summary>
public class EmailConfigurationService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IEmailTopicRegistry topicRegistry,
    IEmailTemplateDiscoveryService templateDiscovery,
    IEmailAttachmentResolver attachmentResolver,
    ILogger<EmailConfigurationService> logger) : IEmailConfigurationService
{
    public async Task<EmailConfiguration?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.EmailConfigurations.FirstOrDefaultAsync(x => x.Id == id, ct));
        scope.Complete();
        return result;
    }

    public async Task<IReadOnlyList<EmailConfiguration>> GetByTopicAsync(string topic, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.EmailConfigurations
                .Where(x => x.Topic == topic)
                .OrderBy(x => x.Name)
                .ToListAsync(ct));
        scope.Complete();
        return result;
    }

    public async Task<IReadOnlyList<EmailConfiguration>> GetEnabledByTopicAsync(string topic, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.EmailConfigurations
                .Where(x => x.Topic == topic && x.Enabled)
                .OrderBy(x => x.Name)
                .ToListAsync(ct));
        scope.Complete();
        return result;
    }

    public async Task<PaginatedList<EmailConfiguration>> QueryAsync(
        EmailConfigurationQueryParameters parameters,
        CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.EmailConfigurations.AsQueryable();

            // Apply filters
            if (!string.IsNullOrWhiteSpace(parameters.Topic))
                query = query.Where(x => x.Topic == parameters.Topic);

            if (!string.IsNullOrWhiteSpace(parameters.Category))
            {
                var topicsInCategory = topicRegistry.GetTopicsByCategory()
                    .FirstOrDefault(g => g.Key == parameters.Category)?
                    .Select(t => t.Topic)
                    .ToList() ?? [];

                if (topicsInCategory.Count > 0)
                    query = query.Where(x => topicsInCategory.Contains(x.Topic));
            }

            if (parameters.Enabled.HasValue)
                query = query.Where(x => x.Enabled == parameters.Enabled.Value);

            if (!string.IsNullOrWhiteSpace(parameters.SearchTerm))
            {
                var term = parameters.SearchTerm.ToLower();
                query = query.Where(x =>
                    x.Name.ToLower().Contains(term) ||
                    (x.Description != null && x.Description.ToLower().Contains(term)));
            }

            // Get total count
            var totalCount = await query.CountAsync(ct);

            // Apply sorting
            query = parameters.SortBy?.ToLowerInvariant() switch
            {
                "topic" => parameters.SortDirection?.ToLowerInvariant() == "desc"
                    ? query.OrderByDescending(x => x.Topic)
                    : query.OrderBy(x => x.Topic),
                "datecreated" => parameters.SortDirection?.ToLowerInvariant() == "desc"
                    ? query.OrderByDescending(x => x.DateCreated)
                    : query.OrderBy(x => x.DateCreated),
                "datemodified" => parameters.SortDirection?.ToLowerInvariant() == "desc"
                    ? query.OrderByDescending(x => x.DateModified)
                    : query.OrderBy(x => x.DateModified),
                "lastsentutc" => parameters.SortDirection?.ToLowerInvariant() == "desc"
                    ? query.OrderByDescending(x => x.LastSentUtc)
                    : query.OrderBy(x => x.LastSentUtc),
                _ => parameters.SortDirection?.ToLowerInvariant() == "desc"
                    ? query.OrderByDescending(x => x.Name)
                    : query.OrderBy(x => x.Name)
            };

            // Apply pagination
            var items = await query
                .Skip((parameters.Page - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
                .ToListAsync(ct);

            return new PaginatedList<EmailConfiguration>(items, totalCount, parameters.Page, parameters.PageSize);
        });

        scope.Complete();
        return result;
    }

    public async Task<CrudResult<EmailConfiguration>> CreateAsync(
        CreateEmailConfigurationParameters parameters,
        CancellationToken ct = default)
    {
        var result = new CrudResult<EmailConfiguration>();

        // Validate required fields
        if (string.IsNullOrWhiteSpace(parameters.Name))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "Name is required." });
            return result;
        }

        if (string.IsNullOrWhiteSpace(parameters.Topic))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "Topic is required." });
            return result;
        }

        if (string.IsNullOrWhiteSpace(parameters.TemplatePath))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "Template path is required." });
            return result;
        }

        if (string.IsNullOrWhiteSpace(parameters.ToExpression))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "To expression is required." });
            return result;
        }

        if (string.IsNullOrWhiteSpace(parameters.SubjectExpression))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "Subject expression is required." });
            return result;
        }

        // Validate topic exists
        if (!topicRegistry.TopicExists(parameters.Topic))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = $"Invalid topic: {parameters.Topic}" });
            return result;
        }

        // Validate template exists
        if (!templateDiscovery.TemplateExists(parameters.TemplatePath))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Warning, Message = $"Template not found: {parameters.TemplatePath}. Email will fail until template is created." });
        }

        // Validate attachment aliases
        var attachmentAliases = parameters.AttachmentAliases ?? [];
        if (attachmentAliases.Count > 0)
        {
            var invalidAliases = attachmentResolver.ValidateAliases(attachmentAliases, parameters.Topic);
            if (invalidAliases.Count > 0)
            {
                var invalidList = string.Join(", ", (IEnumerable<string>)invalidAliases);
                result.Messages.Add(new ResultMessage
                {
                    ResultMessageType = ResultMessageType.Error,
                    Message = $"Invalid or incompatible attachment aliases: {invalidList}"
                });
                return result;
            }
        }

        var configuration = new EmailConfiguration
        {
            Id = GuidExtensions.NewSequentialGuid,
            Name = parameters.Name,
            Topic = parameters.Topic,
            TemplatePath = parameters.TemplatePath,
            ToExpression = parameters.ToExpression,
            SubjectExpression = parameters.SubjectExpression,
            Enabled = parameters.Enabled,
            CcExpression = parameters.CcExpression,
            BccExpression = parameters.BccExpression,
            FromExpression = parameters.FromExpression,
            Description = parameters.Description,
            AttachmentAliases = attachmentAliases,
            DateCreated = DateTime.UtcNow,
            DateModified = DateTime.UtcNow
        };

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.EmailConfigurations.Add(configuration);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        logger.LogInformation("Created email configuration {ConfigurationId} for topic {Topic}", configuration.Id, configuration.Topic);

        result.ResultObject = configuration;
        result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Success, Message = "Email configuration created successfully." });
        return result;
    }

    public async Task<CrudResult<EmailConfiguration>> UpdateAsync(
        UpdateEmailConfigurationParameters parameters,
        CancellationToken ct = default)
    {
        var result = new CrudResult<EmailConfiguration>();

        // Validate required fields
        if (string.IsNullOrWhiteSpace(parameters.Name))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "Name is required." });
            return result;
        }

        if (string.IsNullOrWhiteSpace(parameters.Topic))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "Topic is required." });
            return result;
        }

        if (string.IsNullOrWhiteSpace(parameters.TemplatePath))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "Template path is required." });
            return result;
        }

        if (string.IsNullOrWhiteSpace(parameters.ToExpression))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "To expression is required." });
            return result;
        }

        if (string.IsNullOrWhiteSpace(parameters.SubjectExpression))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "Subject expression is required." });
            return result;
        }

        // Validate topic exists
        if (!topicRegistry.TopicExists(parameters.Topic))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = $"Invalid topic: {parameters.Topic}" });
            return result;
        }

        // Validate template exists
        if (!templateDiscovery.TemplateExists(parameters.TemplatePath))
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Warning, Message = $"Template not found: {parameters.TemplatePath}. Email will fail until template is created." });
        }

        // Validate attachment aliases
        var attachmentAliases = parameters.AttachmentAliases ?? [];
        if (attachmentAliases.Count > 0)
        {
            var invalidAliases = attachmentResolver.ValidateAliases(attachmentAliases, parameters.Topic);
            if (invalidAliases.Count > 0)
            {
                var invalidList = string.Join(", ", (IEnumerable<string>)invalidAliases);
                result.Messages.Add(new ResultMessage
                {
                    ResultMessageType = ResultMessageType.Error,
                    Message = $"Invalid or incompatible attachment aliases: {invalidList}"
                });
                return result;
            }
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var configuration = await scope.ExecuteWithContextAsync(async db =>
            await db.EmailConfigurations.FirstOrDefaultAsync(x => x.Id == parameters.Id, ct));

        if (configuration == null)
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "Email configuration not found." });
            scope.Complete();
            return result;
        }

        configuration.Name = parameters.Name;
        configuration.Topic = parameters.Topic;
        configuration.TemplatePath = parameters.TemplatePath;
        configuration.ToExpression = parameters.ToExpression;
        configuration.SubjectExpression = parameters.SubjectExpression;
        configuration.Enabled = parameters.Enabled;
        configuration.CcExpression = parameters.CcExpression;
        configuration.BccExpression = parameters.BccExpression;
        configuration.FromExpression = parameters.FromExpression;
        configuration.Description = parameters.Description;
        configuration.AttachmentAliases = attachmentAliases;
        configuration.DateModified = DateTime.UtcNow;

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.EmailConfigurations.Update(configuration);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        logger.LogInformation("Updated email configuration {ConfigurationId}", configuration.Id);

        result.ResultObject = configuration;
        result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Success, Message = "Email configuration updated successfully." });
        return result;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var deleted = await scope.ExecuteWithContextAsync(async db =>
        {
            var configuration = await db.EmailConfigurations.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (configuration == null)
                return false;

            db.EmailConfigurations.Remove(configuration);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        if (deleted)
            logger.LogInformation("Deleted email configuration {ConfigurationId}", id);

        return deleted;
    }

    public async Task<CrudResult<EmailConfiguration>> ToggleEnabledAsync(Guid id, CancellationToken ct = default)
    {
        var result = new CrudResult<EmailConfiguration>();

        using var scope = efCoreScopeProvider.CreateScope();
        var configuration = await scope.ExecuteWithContextAsync(async db =>
            await db.EmailConfigurations.FirstOrDefaultAsync(x => x.Id == id, ct));

        if (configuration == null)
        {
            result.Messages.Add(new ResultMessage { ResultMessageType = ResultMessageType.Error, Message = "Email configuration not found." });
            scope.Complete();
            return result;
        }

        configuration.Enabled = !configuration.Enabled;
        configuration.DateModified = DateTime.UtcNow;

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.EmailConfigurations.Update(configuration);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        logger.LogInformation("Toggled email configuration {ConfigurationId} enabled to {Enabled}", id, configuration.Enabled);

        result.ResultObject = configuration;
        result.Messages.Add(new ResultMessage
        {
            ResultMessageType = ResultMessageType.Success,
            Message = configuration.Enabled ? "Email configuration enabled." : "Email configuration disabled."
        });
        return result;
    }

    public async Task IncrementSentCountAsync(Guid id, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var configuration = await db.EmailConfigurations.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (configuration != null)
            {
                configuration.TotalSent++;
                configuration.LastSentUtc = DateTime.UtcNow;
                await db.SaveChangesAsync(ct);
            }
            return true;
        });
        scope.Complete();
    }

    public async Task IncrementFailedCountAsync(Guid id, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var configuration = await db.EmailConfigurations.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (configuration != null)
            {
                configuration.TotalFailed++;
                await db.SaveChangesAsync(ct);
            }
            return true;
        });
        scope.Complete();
    }

    public async Task<IReadOnlyDictionary<string, IReadOnlyList<EmailConfiguration>>> GetByCategoryAsync(
        CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var allConfigurations = await scope.ExecuteWithContextAsync(async db =>
            await db.EmailConfigurations.OrderBy(x => x.Name).ToListAsync(ct));
        scope.Complete();

        var result = new Dictionary<string, IReadOnlyList<EmailConfiguration>>();

        foreach (var categoryGroup in topicRegistry.GetTopicsByCategory())
        {
            var topicsInCategory = categoryGroup.Select(t => t.Topic).ToHashSet();
            var configurationsInCategory = allConfigurations
                .Where(c => topicsInCategory.Contains(c.Topic))
                .ToList();

            if (configurationsInCategory.Count > 0)
                result[categoryGroup.Key] = configurationsInCategory;
        }

        return result;
    }
}
