using System.Text.Json;
using Merchello.Core.Data;
using Merchello.Core.Email.Attachments;
using Merchello.Core.Email.Interfaces;
using Merchello.Core.Email.Dtos;
using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Notifications.Base;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Webhooks.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Mail;
using Umbraco.Cms.Core.Models.Email;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Email.Services;

/// <summary>
/// Service for sending and managing email deliveries.
/// </summary>
public class EmailService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IEmailConfigurationService configurationService,
    IEmailTokenResolver tokenResolver,
    IEmailAttachmentResolver attachmentResolver,
    IEmailSender emailSender,
    IOptions<EmailSettings> emailSettings,
    ILogger<EmailService> logger) : IEmailService
{
    private readonly EmailSettings _settings = emailSettings.Value;

    // Note: IEmailRazorViewRenderer is injected separately in the web project
    // because it requires ASP.NET Core MVC dependencies
    private Func<string, object, CancellationToken, Task<string>>? _renderTemplate;

    /// <summary>
    /// Sets the template renderer function. Called during DI setup.
    /// </summary>
    public void SetTemplateRenderer(Func<string, object, CancellationToken, Task<string>> renderer)
    {
        _renderTemplate = renderer;
    }

    public async Task<OutboundDelivery> QueueDeliveryAsync<TNotification>(
        EmailConfiguration config,
        TNotification notification,
        Guid? entityId = null,
        string? entityType = null,
        CancellationToken ct = default) where TNotification : MerchelloNotification
    {
        var storeContext = GetStoreContext();
        var emailModel = new EmailModel<TNotification>
        {
            Notification = notification,
            Store = storeContext,
            Configuration = config
        };

        // Resolve token expressions
        var toAddress = tokenResolver.ResolveTokens(config.ToExpression, emailModel);
        var ccAddress = !string.IsNullOrWhiteSpace(config.CcExpression)
            ? tokenResolver.ResolveTokens(config.CcExpression, emailModel)
            : null;
        var bccAddress = !string.IsNullOrWhiteSpace(config.BccExpression)
            ? tokenResolver.ResolveTokens(config.BccExpression, emailModel)
            : null;
        var fromAddress = !string.IsNullOrWhiteSpace(config.FromExpression)
            ? tokenResolver.ResolveTokens(config.FromExpression, emailModel)
            : _settings.DefaultFromAddress ?? storeContext.Email;
        var subject = tokenResolver.ResolveTokens(config.SubjectExpression, emailModel);

        // Render the template
        string? body = null;
        string? templateError = null;
        if (_renderTemplate != null)
        {
            try
            {
                body = await _renderTemplate(config.TemplatePath, emailModel, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to render email template {TemplatePath}", config.TemplatePath);
                templateError = $"Template render failed: {ex.Message}";
            }
        }
        else
        {
            templateError = "Template renderer not configured";
        }

        // Generate attachments if configured
        List<StoredAttachment>? storedAttachments = null;
        if (config.AttachmentAliases.Count > 0 && templateError == null)
        {
            try
            {
                var attachmentResults = await attachmentResolver.GenerateAttachmentsAsync(
                    emailModel, config.AttachmentAliases, ct);

                if (attachmentResults.Count > 0)
                {
                    storedAttachments = attachmentResults
                        .Select(StoredAttachment.FromResult)
                        .ToList();

                    logger.LogDebug(
                        "Generated {Count} attachments for email configuration {ConfigurationId}",
                        storedAttachments.Count, config.Id);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to generate attachments for email configuration {ConfigurationId}", config.Id);
                // Continue without attachments - don't fail the email
            }
        }

        // Create the delivery record - mark as failed if template couldn't render
        var extendedData = new Dictionary<string, object>
        {
            ["cc"] = ccAddress ?? string.Empty,
            ["bcc"] = bccAddress ?? string.Empty
        };

        if (storedAttachments != null && storedAttachments.Count > 0)
        {
            extendedData["attachments"] = JsonSerializer.Serialize(storedAttachments);
        }

        var delivery = new OutboundDelivery
        {
            Id = GuidExtensions.NewSequentialGuid,
            DeliveryType = OutboundDeliveryType.Email,
            ConfigurationId = config.Id,
            Topic = config.Topic,
            EntityId = entityId,
            EntityType = entityType,
            Status = templateError != null ? OutboundDeliveryStatus.Failed : OutboundDeliveryStatus.Pending,
            ErrorMessage = templateError,
            EmailRecipients = toAddress,
            EmailSubject = subject,
            EmailFrom = fromAddress,
            EmailBody = body,
            DateCreated = DateTime.UtcNow,
            AttemptNumber = 0,
            ExtendedData = extendedData
        };

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.OutboundDeliveries.Add(delivery);
            await db.SaveChangesAsync(ct);
        });
        scope.Complete();

        if (templateError != null)
        {
            logger.LogWarning(
                "Created failed email delivery {DeliveryId} for configuration {ConfigurationId}: {Error}",
                delivery.Id, config.Id, templateError);
        }
        else
        {
            logger.LogInformation(
                "Queued email delivery {DeliveryId} for configuration {ConfigurationId} to {Recipients}",
                delivery.Id, config.Id, toAddress);
        }

        return delivery;
    }

    public async Task<bool> SendImmediateAsync<TNotification>(
        EmailConfiguration config,
        TNotification notification,
        CancellationToken ct = default) where TNotification : MerchelloNotification
    {
        var storeContext = GetStoreContext();
        var emailModel = new EmailModel<TNotification>
        {
            Notification = notification,
            Store = storeContext,
            Configuration = config
        };

        try
        {
            // Resolve token expressions
            var toAddress = tokenResolver.ResolveTokens(config.ToExpression, emailModel);
            var ccAddress = !string.IsNullOrWhiteSpace(config.CcExpression)
                ? tokenResolver.ResolveTokens(config.CcExpression, emailModel)
                : null;
            var bccAddress = !string.IsNullOrWhiteSpace(config.BccExpression)
                ? tokenResolver.ResolveTokens(config.BccExpression, emailModel)
                : null;
            var fromAddress = !string.IsNullOrWhiteSpace(config.FromExpression)
                ? tokenResolver.ResolveTokens(config.FromExpression, emailModel)
                : _settings.DefaultFromAddress ?? storeContext.Email;
            var subject = tokenResolver.ResolveTokens(config.SubjectExpression, emailModel);

            // Render the template
            if (_renderTemplate == null)
            {
                logger.LogError("Template renderer not configured");
                return false;
            }

            var body = await _renderTemplate(config.TemplatePath, emailModel, ct);

            // Send the email
            var message = new EmailMessage(
                fromAddress,
                toAddress.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries),
                ccAddress?.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries),
                bccAddress?.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries),
                null, // replyTo
                subject,
                body,
                true, // isBodyHtml
                null  // attachments
            );

            await emailSender.SendAsync(message, "MerchelloEmail", enableNotification: true, expires: null);

            // Update configuration stats
            await configurationService.IncrementSentCountAsync(config.Id, ct);

            logger.LogInformation(
                "Sent immediate email for configuration {ConfigurationId} to {Recipients}",
                config.Id, toAddress);

            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send immediate email for configuration {ConfigurationId}", config.Id);
            await configurationService.IncrementFailedCountAsync(config.Id, ct);
            return false;
        }
    }

    public async Task<bool> DeliverAsync(Guid deliveryId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var delivery = await scope.ExecuteWithContextAsync(async db =>
            await db.OutboundDeliveries.FirstOrDefaultAsync(x => x.Id == deliveryId, ct));

        if (delivery == null)
        {
            logger.LogWarning("Delivery {DeliveryId} not found", deliveryId);
            scope.Complete();
            return false;
        }

        if (delivery.DeliveryType != OutboundDeliveryType.Email)
        {
            logger.LogWarning("Delivery {DeliveryId} is not an email delivery", deliveryId);
            scope.Complete();
            return false;
        }

        delivery.AttemptNumber++;
        delivery.DateSent = DateTime.UtcNow;

        try
        {
            if (string.IsNullOrWhiteSpace(delivery.EmailRecipients))
            {
                throw new InvalidOperationException("Email recipients not set");
            }

            if (string.IsNullOrWhiteSpace(delivery.EmailBody))
            {
                throw new InvalidOperationException("Email body not rendered");
            }

            var ccAddress = delivery.ExtendedData.TryGetValue("cc", out var cc) ? cc?.ToString() : null;
            var bccAddress = delivery.ExtendedData.TryGetValue("bcc", out var bcc) ? bcc?.ToString() : null;

            // Deserialize attachments if present
            IEnumerable<EmailMessageAttachment>? emailAttachments = null;
            if (delivery.ExtendedData.TryGetValue("attachments", out var attachmentsJson) &&
                attachmentsJson is string attachmentsStr &&
                !string.IsNullOrWhiteSpace(attachmentsStr))
            {
                try
                {
                    var storedAttachments = JsonSerializer.Deserialize<List<StoredAttachment>>(attachmentsStr);
                    if (storedAttachments != null && storedAttachments.Count > 0)
                    {
                        var loadedAttachments = new List<EmailMessageAttachment>();
                        foreach (var attachment in storedAttachments)
                        {
                            if (attachment.TryGetContent(out var content))
                            {
                                loadedAttachments.Add(new EmailMessageAttachment(
                                    new MemoryStream(content), attachment.FileName));
                            }
                            else
                            {
                                logger.LogWarning(
                                    "Failed to decode attachment {FileName} for delivery {DeliveryId} - invalid base64",
                                    attachment.FileName, deliveryId);
                            }
                        }

                        if (loadedAttachments.Count > 0)
                        {
                            emailAttachments = loadedAttachments;
                            logger.LogDebug(
                                "Loaded {Count} attachments for delivery {DeliveryId}",
                                loadedAttachments.Count, deliveryId);
                        }
                    }
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to deserialize attachments for delivery {DeliveryId}", deliveryId);
                    // Continue without attachments
                }
            }

            var message = new EmailMessage(
                delivery.EmailFrom,
                delivery.EmailRecipients.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries),
                !string.IsNullOrWhiteSpace(ccAddress)
                    ? ccAddress.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries)
                    : null,
                !string.IsNullOrWhiteSpace(bccAddress)
                    ? bccAddress.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries)
                    : null,
                null, // replyTo
                delivery.EmailSubject,
                delivery.EmailBody,
                true, // isBodyHtml
                emailAttachments
            );

            var startTime = DateTime.UtcNow;
            await emailSender.SendAsync(message, "MerchelloEmail", enableNotification: true, expires: null);
            delivery.DurationMs = (int)(DateTime.UtcNow - startTime).TotalMilliseconds;

            delivery.Status = OutboundDeliveryStatus.Succeeded;
            delivery.DateCompleted = DateTime.UtcNow;
            delivery.ResponseStatusCode = 200; // Success indicator for emails

            // Update configuration stats
            await configurationService.IncrementSentCountAsync(delivery.ConfigurationId, ct);

            logger.LogInformation(
                "Delivered email {DeliveryId} to {Recipients}",
                deliveryId, delivery.EmailRecipients);
        }
        catch (Exception ex)
        {
            delivery.ErrorMessage = ex.Message;

            // Determine if we should retry
            if (delivery.AttemptNumber < _settings.MaxRetries)
            {
                delivery.Status = OutboundDeliveryStatus.Retrying;
                var delayIndex = Math.Min(delivery.AttemptNumber - 1, _settings.RetryDelaysSeconds.Length - 1);
                var delaySeconds = _settings.RetryDelaysSeconds[delayIndex];
                delivery.NextRetryUtc = DateTime.UtcNow.AddSeconds(delaySeconds);

                logger.LogWarning(ex,
                    "Email delivery {DeliveryId} failed (attempt {Attempt}/{MaxAttempts}), will retry at {NextRetry}",
                    deliveryId, delivery.AttemptNumber, _settings.MaxRetries, delivery.NextRetryUtc);
            }
            else
            {
                delivery.Status = OutboundDeliveryStatus.Failed;
                delivery.DateCompleted = DateTime.UtcNow;

                // Update configuration stats
                await configurationService.IncrementFailedCountAsync(delivery.ConfigurationId, ct);

                logger.LogError(ex,
                    "Email delivery {DeliveryId} failed permanently after {Attempts} attempts",
                    deliveryId, delivery.AttemptNumber);
            }
        }

        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            db.OutboundDeliveries.Update(delivery);
            await db.SaveChangesAsync(ct);
        });
        scope.Complete();

        return delivery.Status == OutboundDeliveryStatus.Succeeded;
    }

    public async Task<string> RenderTemplateAsync<TNotification>(
        string templatePath,
        EmailModel<TNotification> model,
        CancellationToken ct = default) where TNotification : MerchelloNotification
    {
        if (_renderTemplate == null)
        {
            throw new InvalidOperationException("Template renderer not configured");
        }

        return await _renderTemplate(templatePath, model, ct);
    }

    public async Task<EmailSendTestResultDto> SendTestEmailAsync(
        Guid configurationId,
        string testRecipient,
        CancellationToken ct = default)
    {
        var result = new EmailSendTestResultDto { Recipient = testRecipient };

        var config = await configurationService.GetByIdAsync(configurationId, ct);
        if (config == null)
        {
            result.ErrorMessage = "Email configuration not found";
            return result;
        }

        try
        {
            var storeContext = GetStoreContext();

            // Create a sample notification for testing
            var sampleNotification = CreateSampleNotification(config.Topic);
            if (sampleNotification == null)
            {
                result.ErrorMessage = $"Cannot create sample notification for topic: {config.Topic}";
                return result;
            }

            // Build a non-generic EmailModel using reflection
            var emailModelType = typeof(EmailModel<>).MakeGenericType(sampleNotification.GetType());
            var emailModel = Activator.CreateInstance(emailModelType);
            emailModelType.GetProperty("Notification")!.SetValue(emailModel, sampleNotification);
            emailModelType.GetProperty("Store")!.SetValue(emailModel, storeContext);
            emailModelType.GetProperty("Configuration")!.SetValue(emailModel, config);

            // Create a non-generic model for token resolution
            var nonGenericModel = new EmailModel
            {
                Notification = sampleNotification,
                Store = storeContext,
                Configuration = config
            };

            // Resolve tokens using non-generic methods
            var fromAddress = !string.IsNullOrWhiteSpace(config.FromExpression)
                ? ResolveTokensNonGeneric(config.FromExpression, nonGenericModel)
                : _settings.DefaultFromAddress ?? storeContext.Email;
            var subject = ResolveTokensNonGeneric(config.SubjectExpression, nonGenericModel);

            // Render the template
            if (_renderTemplate == null)
            {
                result.ErrorMessage = "Template renderer not configured";
                return result;
            }

            var body = await _renderTemplate(config.TemplatePath, emailModel!, ct);

            // Generate attachments if configured
            IEnumerable<EmailMessageAttachment>? emailAttachments = null;
            if (config.AttachmentAliases.Count > 0)
            {
                try
                {
                    // Use reflection to call the generic GenerateAttachmentsAsync method
                    var notificationType = sampleNotification.GetType();
                    var method = typeof(IEmailAttachmentResolver)
                        .GetMethod(nameof(IEmailAttachmentResolver.GenerateAttachmentsAsync))!
                        .MakeGenericMethod(notificationType);

                    var task = (Task)method.Invoke(attachmentResolver, [emailModel, config.AttachmentAliases, ct])!;
                    await task;

                    // Get the result from the task
                    var resultProperty = task.GetType().GetProperty("Result")!;
                    var attachmentResults = (IReadOnlyList<EmailAttachmentResult>)resultProperty.GetValue(task)!;

                    if (attachmentResults.Count > 0)
                    {
                        var attachmentList = new List<EmailMessageAttachment>();
                        foreach (var attachment in attachmentResults)
                        {
                            byte[] content = attachment.Content;
                            attachmentList.Add(new EmailMessageAttachment(
                                new MemoryStream(content),
                                attachment.FileName));
                        }
                        emailAttachments = attachmentList;

                        logger.LogDebug("Generated {Count} attachments for test email", attachmentResults.Count);
                    }
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to generate attachments for test email, continuing without attachments");
                    // Continue without attachments - don't fail the test email
                }
            }

            // Send to test recipient
            var message = new EmailMessage(
                fromAddress,
                [testRecipient],
                null,
                null,
                null,
                $"[TEST] {subject}",
                body,
                true,
                emailAttachments
            );

            await emailSender.SendAsync(message, "MerchelloEmailTest", enableNotification: true, expires: null);

            result.Success = true;
            logger.LogInformation("Sent test email for configuration {ConfigurationId} to {Recipient}",
                configurationId, testRecipient);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send test email for configuration {ConfigurationId}", configurationId);
            result.ErrorMessage = ex.Message;
        }

        return result;
    }

    public async Task<EmailPreviewDto> PreviewAsync(Guid configurationId, CancellationToken ct = default)
    {
        var result = new EmailPreviewDto();

        var config = await configurationService.GetByIdAsync(configurationId, ct);
        if (config == null)
        {
            result.ErrorMessage = "Email configuration not found";
            return result;
        }

        try
        {
            var storeContext = GetStoreContext();

            // Create a sample notification for preview
            var sampleNotification = CreateSampleNotification(config.Topic);
            if (sampleNotification == null)
            {
                result.ErrorMessage = $"Cannot create sample notification for topic: {config.Topic}";
                return result;
            }

            // Create a non-generic model for token resolution
            var nonGenericModel = new EmailModel
            {
                Notification = sampleNotification,
                Store = storeContext,
                Configuration = config
            };

            // Resolve tokens
            result.To = ResolveTokensNonGeneric(config.ToExpression, nonGenericModel);
            result.Cc = !string.IsNullOrWhiteSpace(config.CcExpression)
                ? ResolveTokensNonGeneric(config.CcExpression, nonGenericModel)
                : null;
            result.Bcc = !string.IsNullOrWhiteSpace(config.BccExpression)
                ? ResolveTokensNonGeneric(config.BccExpression, nonGenericModel)
                : null;
            result.From = !string.IsNullOrWhiteSpace(config.FromExpression)
                ? ResolveTokensNonGeneric(config.FromExpression, nonGenericModel)
                : _settings.DefaultFromAddress ?? storeContext.Email ?? "noreply@example.com";
            result.Subject = ResolveTokensNonGeneric(config.SubjectExpression, nonGenericModel);

            // Render the template
            if (_renderTemplate != null)
            {
                try
                {
                    // Build a generic EmailModel using reflection
                    var emailModelType = typeof(EmailModel<>).MakeGenericType(sampleNotification.GetType());
                    var emailModel = Activator.CreateInstance(emailModelType);
                    emailModelType.GetProperty("Notification")!.SetValue(emailModel, sampleNotification);
                    emailModelType.GetProperty("Store")!.SetValue(emailModel, storeContext);
                    emailModelType.GetProperty("Configuration")!.SetValue(emailModel, config);

                    result.Body = await _renderTemplate(config.TemplatePath, emailModel!, ct);
                }
                catch (FileNotFoundException)
                {
                    result.Warnings.Add($"Template not found: {config.TemplatePath}");
                    result.Body = $"<p style='color: red;'>Template not found: {config.TemplatePath}</p>";
                }
                catch (Exception ex)
                {
                    result.Warnings.Add($"Template render error: {ex.Message}");
                    result.Body = $"<p style='color: red;'>Template render error: {ex.Message}</p>";
                }
            }
            else
            {
                result.Warnings.Add("Template renderer not configured");
                result.Body = "<p style='color: orange;'>Template renderer not configured</p>";
            }

            result.Success = true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to preview email for configuration {ConfigurationId}", configurationId);
            result.ErrorMessage = ex.Message;
        }

        return result;
    }

    public async Task ProcessPendingRetriesAsync(CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var pendingDeliveries = await scope.ExecuteWithContextAsync(async db =>
            await db.OutboundDeliveries
                .Where(x => x.DeliveryType == OutboundDeliveryType.Email &&
                           x.Status == OutboundDeliveryStatus.Retrying &&
                           x.NextRetryUtc <= DateTime.UtcNow)
                .OrderBy(x => x.NextRetryUtc)
                .Take(50) // Process in batches
                .ToListAsync(ct));
        scope.Complete();

        foreach (var delivery in pendingDeliveries)
        {
            await DeliverAsync(delivery.Id, ct);
        }

        if (pendingDeliveries.Count > 0)
        {
            logger.LogInformation("Processed {Count} pending email retries", pendingDeliveries.Count);
        }
    }

    public EmailStoreContext GetStoreContext()
    {
        return new EmailStoreContext
        {
            Name = _settings.Store.Name ?? string.Empty,
            Email = _settings.Store.Email ?? string.Empty,
            LogoUrl = _settings.Store.LogoUrl,
            WebsiteUrl = _settings.Store.WebsiteUrl,
            SupportEmail = _settings.Store.SupportEmail,
            Phone = _settings.Store.Phone
        };
    }

    /// <summary>
    /// Resolves tokens using non-generic model (for preview and test scenarios).
    /// </summary>
    private static string ResolveTokensNonGeneric(string template, EmailModel model)
    {
        if (string.IsNullOrEmpty(template))
            return template;

        // Simple token replacement using reflection
        return System.Text.RegularExpressions.Regex.Replace(template, @"\{\{([a-zA-Z0-9_.]+)\}\}", match =>
        {
            var path = match.Groups[1].Value;
            var value = ResolvePathNonGeneric(path, model);
            return value ?? match.Value;
        });
    }

    /// <summary>
    /// Resolves a token path on a non-generic model.
    /// </summary>
    private static string? ResolvePathNonGeneric(string path, EmailModel model)
    {
        var parts = path.Split('.');
        if (parts.Length == 0)
            return null;

        object? current = parts[0].ToLowerInvariant() switch
        {
            "store" => model.Store,
            "config" or "configuration" => model.Configuration,
            "notification" => model.Notification,
            _ => GetPropertyValue(model.Notification, parts[0]) ?? GetPropertyValue(model.Store, parts[0])
        };

        if (current == null)
            return null;

        var startIndex = parts[0].ToLowerInvariant() switch
        {
            "store" or "config" or "configuration" or "notification" => 1,
            _ => 1
        };

        for (var i = startIndex; i < parts.Length; i++)
        {
            current = GetPropertyValue(current, parts[i]);
            if (current == null)
                return null;
        }

        return current?.ToString();
    }

    private static object? GetPropertyValue(object? obj, string propertyName)
    {
        if (obj == null)
            return null;

        var type = obj.GetType();
        var property = type.GetProperty(propertyName,
            System.Reflection.BindingFlags.Public |
            System.Reflection.BindingFlags.Instance |
            System.Reflection.BindingFlags.IgnoreCase);

        return property?.GetValue(obj);
    }

    /// <summary>
    /// Creates a sample notification for preview/test purposes.
    /// </summary>
    private MerchelloNotification? CreateSampleNotification(string topic)
    {
        // This creates minimal sample notifications for testing
        // In a real scenario, you might want to load actual sample data

        // For now, return a basic notification that can be used with reflection
        // The EmailTopicRegistry should be used to get the actual notification type
        return new SampleNotification();
    }

    /// <summary>
    /// Sample notification for preview/test scenarios.
    /// </summary>
    private class SampleNotification : MerchelloNotification
    {
        public string OrderNumber { get; set; } = "ORD-12345";
        public string CustomerEmail { get; set; } = "customer@example.com";
        public string CustomerName { get; set; } = "John Doe";
        public decimal Total { get; set; } = 99.99m;
        public string FormattedTotal { get; set; } = "$99.99";
    }
}
