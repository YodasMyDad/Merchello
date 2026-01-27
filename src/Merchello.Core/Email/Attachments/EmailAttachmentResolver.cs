using System.Text.RegularExpressions;
using Merchello.Core.Email.Models;
using Merchello.Core.Email.Interfaces;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Notifications.Base;
using Merchello.Core.Shared.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Email.Attachments;

/// <summary>
/// Service that resolves and executes attachment generators.
/// Discovers attachments via ExtensionManager and validates aliases at registration.
/// </summary>
public class EmailAttachmentResolver : IEmailAttachmentResolver, IDisposable
{
    private static readonly Regex AliasPattern = new(@"^[a-z][a-z0-9]*(-[a-z0-9]+)*$", RegexOptions.Compiled);

    private readonly Dictionary<string, IEmailAttachment> _attachmentsByAlias = new();
    private readonly Dictionary<Type, List<IEmailAttachment>> _attachmentsByNotificationType = new();
    private readonly Dictionary<string, List<EmailAttachmentInfo>> _attachmentInfoByTopic = new();
    private readonly List<EmailAttachmentInfo> _allAttachmentInfo = [];
    private readonly IEmailTopicRegistry _topicRegistry;
    private readonly EmailSettings _settings;
    private readonly ILogger<EmailAttachmentResolver> _logger;
    private readonly IServiceScope _attachmentScope;
    private bool _disposed;

    public EmailAttachmentResolver(
        ExtensionManager extensionManager,
        IServiceScopeFactory serviceScopeFactory,
        IEmailTopicRegistry topicRegistry,
        IOptions<EmailSettings> emailSettings,
        ILogger<EmailAttachmentResolver> logger)
    {
        _topicRegistry = topicRegistry;
        _settings = emailSettings.Value;
        _logger = logger;

        // Create a scope that lives as long as this resolver (singleton lifetime)
        _attachmentScope = serviceScopeFactory.CreateScope();

        // Discover all IEmailAttachment implementations via ExtensionManager
        var attachments = extensionManager.GetInstances<IEmailAttachment>(
            predicate: null,
            useCaching: true,
            serviceProvider: _attachmentScope.ServiceProvider);

        foreach (var attachment in attachments)
        {
            if (attachment == null) continue;

            try
            {
                ValidateAndRegisterAttachment(attachment);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to register attachment {AttachmentType}", attachment.GetType().Name);
                throw;
            }
        }

        _logger.LogInformation("Registered {Count} email attachment types", _attachmentsByAlias.Count);
    }

    private void ValidateAndRegisterAttachment(IEmailAttachment attachment)
    {
        // Validate alias format
        if (string.IsNullOrWhiteSpace(attachment.Alias))
        {
            throw new InvalidOperationException(
                $"Attachment {attachment.GetType().Name} has an empty alias");
        }

        if (!AliasPattern.IsMatch(attachment.Alias))
        {
            throw new InvalidOperationException(
                $"Attachment alias '{attachment.Alias}' must be lowercase-kebab-case (e.g., 'order-invoice-pdf')");
        }

        // Check for duplicate aliases
        if (_attachmentsByAlias.ContainsKey(attachment.Alias))
        {
            throw new InvalidOperationException(
                $"Duplicate attachment alias '{attachment.Alias}' - aliases must be globally unique");
        }

        // Find the topic for this notification type
        var topic = FindTopicForNotificationType(attachment.NotificationType);
        if (topic == null)
        {
            _logger.LogWarning(
                "Attachment {Alias} registered for notification type {NotificationType} which has no associated email topic",
                attachment.Alias, attachment.NotificationType.Name);
            topic = attachment.NotificationType.Name; // Use type name as fallback
        }

        // Register the attachment
        _attachmentsByAlias[attachment.Alias] = attachment;

        if (!_attachmentsByNotificationType.ContainsKey(attachment.NotificationType))
        {
            _attachmentsByNotificationType[attachment.NotificationType] = [];
        }
        _attachmentsByNotificationType[attachment.NotificationType].Add(attachment);

        // Create info record
        var info = new EmailAttachmentInfo
        {
            Alias = attachment.Alias,
            DisplayName = attachment.DisplayName,
            Description = attachment.Description,
            IconSvg = attachment.IconSvg,
            NotificationType = attachment.NotificationType,
            NotificationTypeName = attachment.NotificationType.Name,
            Topic = topic
        };

        _allAttachmentInfo.Add(info);

        if (!_attachmentInfoByTopic.ContainsKey(topic))
        {
            _attachmentInfoByTopic[topic] = [];
        }
        _attachmentInfoByTopic[topic].Add(info);

        _logger.LogDebug(
            "Registered attachment {Alias} ({DisplayName}) for topic {Topic}",
            attachment.Alias, attachment.DisplayName, topic);
    }

    private string? FindTopicForNotificationType(Type notificationType)
    {
        // Search through all topics to find one that matches this notification type
        foreach (var topic in _topicRegistry.GetAllTopics())
        {
            if (topic.NotificationType == notificationType)
            {
                return topic.Topic;
            }
        }
        return null;
    }

    public IReadOnlyList<EmailAttachmentInfo> GetAllAttachments()
    {
        return _allAttachmentInfo
            .OrderBy(a => a.DisplayName)
            .ToList();
    }

    public IReadOnlyList<EmailAttachmentInfo> GetAttachmentsForNotificationType(Type notificationType)
    {
        if (!_attachmentsByNotificationType.TryGetValue(notificationType, out var attachments))
        {
            return [];
        }

        return attachments
            .Select(a => _allAttachmentInfo.First(i => i.Alias == a.Alias))
            .OrderBy(a => a.DisplayName)
            .ToList();
    }

    public IReadOnlyList<EmailAttachmentInfo> GetAttachmentsForTopic(string topic)
    {
        if (!_attachmentInfoByTopic.TryGetValue(topic, out var attachments))
        {
            return [];
        }

        return attachments
            .OrderBy(a => a.DisplayName)
            .ToList();
    }

    public EmailAttachmentInfo? GetAttachment(string alias)
    {
        return _allAttachmentInfo.FirstOrDefault(a => a.Alias == alias);
    }

    public IReadOnlyList<string> ValidateAliases(IEnumerable<string> aliases, string topic)
    {
        var availableAliases = GetAttachmentsForTopic(topic)
            .Select(a => a.Alias)
            .ToHashSet();

        return aliases
            .Where(a => !availableAliases.Contains(a))
            .ToList();
    }

    public async Task<IReadOnlyList<EmailAttachmentResult>> GenerateAttachmentsAsync<TNotification>(
        EmailModel<TNotification> model,
        IEnumerable<string> attachmentAliases,
        CancellationToken ct = default) where TNotification : MerchelloNotification
    {
        var results = new List<EmailAttachmentResult>();
        var aliasesList = attachmentAliases.ToList();

        if (aliasesList.Count == 0)
        {
            return results;
        }

        // Get attachments that match the aliases and are compatible with the notification type
        var selectedAttachments = aliasesList
            .Select(alias => _attachmentsByAlias.GetValueOrDefault(alias))
            .Where(a => a != null && a.NotificationType == typeof(TNotification))
            .Cast<IEmailAttachment<TNotification>>()
            .OrderBy(a => a.Alias) // Sort alphabetically by alias for consistent order
            .ToList();

        if (selectedAttachments.Count == 0)
        {
            _logger.LogDebug(
                "No compatible attachments found for aliases [{Aliases}] with notification type {NotificationType}",
                string.Join(", ", aliasesList), typeof(TNotification).Name);
            return results;
        }

        long totalSize = 0;

        // Process attachments sequentially
        foreach (var attachment in selectedAttachments)
        {
            if (ct.IsCancellationRequested)
            {
                break;
            }

            try
            {
                var result = await attachment.GenerateAsync(model, ct);

                if (result == null)
                {
                    // Null means skip (conditional attachment)
                    _logger.LogDebug(
                        "Attachment {Alias} returned null, skipping",
                        attachment.Alias);
                    continue;
                }

                // Check per-attachment size limit
                if (result.Content.Length > _settings.MaxAttachmentSizeBytes)
                {
                    _logger.LogWarning(
                        "Attachment {Alias} exceeds size limit ({Size} bytes > {Limit} bytes), skipping",
                        attachment.Alias, result.Content.Length, _settings.MaxAttachmentSizeBytes);
                    continue;
                }

                // Check total size limit
                if (totalSize + result.Content.Length > _settings.MaxTotalAttachmentSizeBytes)
                {
                    _logger.LogWarning(
                        "Attachment {Alias} would exceed total size limit ({CurrentTotal} + {Size} > {Limit} bytes), skipping",
                        attachment.Alias, totalSize, result.Content.Length, _settings.MaxTotalAttachmentSizeBytes);
                    continue;
                }

                totalSize += result.Content.Length;
                results.Add(result);

                _logger.LogDebug(
                    "Generated attachment {Alias} ({FileName}, {Size} bytes)",
                    attachment.Alias, result.FileName, result.Content.Length);
            }
            catch (Exception ex)
            {
                // Log error but continue with remaining attachments
                _logger.LogError(ex,
                    "Failed to generate attachment {Alias} for email, skipping",
                    attachment.Alias);
            }
        }

        _logger.LogDebug(
            "Generated {Count} attachments ({TotalSize} bytes total) for email",
            results.Count, totalSize);

        return results;
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        // Dispose any attachments that implement IDisposable
        foreach (var attachment in _attachmentsByAlias.Values)
        {
            if (attachment is IDisposable disposable)
            {
                try
                {
                    disposable.Dispose();
                }
                catch
                {
                    // Ignore disposal errors
                }
            }
        }

        _attachmentScope.Dispose();

        GC.SuppressFinalize(this);
    }
}
