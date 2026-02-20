using System.Reflection;
using System.Text.Json;
using Merchello.Core.Data;
using Merchello.Core.Email.Attachments;
using Merchello.Core.Email.Interfaces;
using Merchello.Core.Email.Dtos;
using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Notifications.Base;
using Merchello.Core.Settings.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
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
    IEmailAttachmentStorageService attachmentStorageService,
    IEmailTemplateRenderer templateRenderer,
    IEmailSender emailSender,
    ISampleNotificationFactory sampleNotificationFactory,
    IOptions<EmailSettings> emailSettings,
    IOptions<MerchelloSettings> merchelloSettings,
    ILogger<EmailService> logger,
    IMerchelloStoreSettingsService? storeSettingsService = null) : IEmailService
{
    private readonly EmailSettings _settings = emailSettings.Value;
    private readonly StoreSettings _store = merchelloSettings.Value.Store;
    private readonly IMerchelloStoreSettingsService? _storeSettingsService = storeSettingsService;
    private static readonly MethodInfo ResolveTokensGenericMethod =
        typeof(IEmailTokenResolver).GetMethod(nameof(IEmailTokenResolver.ResolveTokens))
        ?? throw new InvalidOperationException("Could not locate ResolveTokens<TNotification> method");
    private static readonly MethodInfo GenerateAttachmentsGenericMethod =
        typeof(IEmailAttachmentResolver).GetMethod(nameof(IEmailAttachmentResolver.GenerateAttachmentsAsync))
        ?? throw new InvalidOperationException("Could not locate GenerateAttachmentsAsync<TNotification> method");

    public async Task<OutboundDelivery> QueueDeliveryAsync<TNotification>(
        EmailConfiguration config,
        TNotification notification,
        Guid? entityId = null,
        string? entityType = null,
        CancellationToken ct = default) where TNotification : MerchelloNotification
    {
        var context = CreateRuntimeEmailContext(config, notification);
        var resolved = ResolveEmailFields(config, context);

        // Render the template
        string? body = null;
        string? templateError = null;
        try
        {
            body = await RenderTemplateRuntimeAsync(config, context, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to render email template {TemplatePath}", config.TemplatePath);
            templateError = $"Template render failed: {ex.Message}";
        }

        // Generate delivery ID upfront so we can use it for attachment storage
        var deliveryId = GuidExtensions.NewSequentialGuid;

        // Generate attachments if configured - save to temp files
        List<StoredAttachmentReference>? storedAttachments = null;
        if (config.AttachmentAliases.Count > 0 && templateError == null)
        {
            try
            {
                var attachmentResults = await GenerateAttachmentResultsRuntimeAsync(config, context, ct);

                if (attachmentResults.Count > 0)
                {
                    storedAttachments = await SaveAttachmentResultsAsync(deliveryId, attachmentResults, ct);

                    logger.LogDebug(
                        "Saved {Count} attachments to temp storage for email configuration {ConfigurationId}",
                        storedAttachments.Count, config.Id);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to generate attachments for email configuration {ConfigurationId}", config.Id);
                // Clean up any partially saved attachments
                attachmentStorageService.DeleteDeliveryAttachments(deliveryId);
                // Continue without attachments - don't fail the email
            }
        }

        // Create the delivery record - mark as failed if template couldn't render
        var extendedData = new Dictionary<string, object>
        {
            ["cc"] = resolved.Cc ?? string.Empty,
            ["bcc"] = resolved.Bcc ?? string.Empty
        };

        if (storedAttachments != null && storedAttachments.Count > 0)
        {
            extendedData["attachments"] = JsonSerializer.Serialize(storedAttachments);
        }

        var delivery = new OutboundDelivery
        {
            Id = deliveryId,
            DeliveryType = OutboundDeliveryType.Email,
            ConfigurationId = config.Id,
            Topic = config.Topic,
            EntityId = entityId,
            EntityType = entityType,
            Status = templateError != null ? OutboundDeliveryStatus.Failed : OutboundDeliveryStatus.Pending,
            ErrorMessage = templateError,
            EmailRecipients = resolved.To,
            EmailSubject = resolved.Subject,
            EmailFrom = resolved.From,
            EmailBody = body,
            DateCreated = DateTime.UtcNow,
            AttemptNumber = 0,
            ExtendedData = extendedData
        };

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.OutboundDeliveries.Add(delivery);
            await db.SaveChangesAsync(ct);
            return true;
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
                delivery.Id, config.Id, resolved.To);
        }

        return delivery;
    }

    public async Task<bool> SendImmediateAsync<TNotification>(
        EmailConfiguration config,
        TNotification notification,
        CancellationToken ct = default) where TNotification : MerchelloNotification
    {
        var context = CreateRuntimeEmailContext(config, notification);

        try
        {
            var resolved = ResolveEmailFields(config, context);

            // Render the template
            var body = await RenderTemplateRuntimeAsync(config, context, ct);

            // Generate attachments if configured
            IEnumerable<EmailMessageAttachment>? emailAttachments = null;
            if (config.AttachmentAliases.Count > 0)
            {
                try
                {
                    var attachmentResults = await GenerateAttachmentResultsRuntimeAsync(config, context, ct);
                    emailAttachments = ToEmailMessageAttachments(attachmentResults);

                    if (attachmentResults.Count > 0)
                    {
                        logger.LogDebug("Generated {Count} attachments for immediate email", attachmentResults.Count);
                    }
                }
                catch (Exception ex)
                {
                    logger.LogWarning(
                        ex,
                        "Failed to generate attachments for immediate email configuration {ConfigurationId}, continuing without attachments",
                        config.Id);
                }
            }

            // Send the email
            var message = new EmailMessage(
                resolved.From,
                SplitAddresses(resolved.To),
                SplitAddressesOrNull(resolved.Cc),
                SplitAddressesOrNull(resolved.Bcc),
                null, // replyTo
                resolved.Subject,
                body,
                true, // isBodyHtml
                emailAttachments
            );

            await emailSender.SendAsync(message, "MerchelloEmail", enableNotification: true, expires: null);

            // Update configuration stats
            await configurationService.IncrementSentCountAsync(config.Id, ct);

            logger.LogInformation(
                "Sent immediate email for configuration {ConfigurationId} to {Recipients}",
                config.Id, resolved.To);

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

            var ccAddress = delivery.ExtendedData.TryGetValue("cc", out var cc)
                ? cc.UnwrapJsonElement()?.ToString()
                : null;
            var bccAddress = delivery.ExtendedData.TryGetValue("bcc", out var bcc)
                ? bcc.UnwrapJsonElement()?.ToString()
                : null;

            // Load attachments from temp file storage
            IEnumerable<EmailMessageAttachment>? emailAttachments = null;
            var attachmentsStr = delivery.ExtendedData.TryGetValue("attachments", out var attachmentsJson)
                ? attachmentsJson.UnwrapJsonElement()?.ToString()
                : null;
            if (!string.IsNullOrWhiteSpace(attachmentsStr))
            {
                try
                {
                    var attachmentRefs = JsonSerializer.Deserialize<List<StoredAttachmentReference>>(attachmentsStr);
                    if (attachmentRefs != null && attachmentRefs.Count > 0)
                    {
                        var loadedAttachments = new List<EmailMessageAttachment>();
                        foreach (var attachment in attachmentRefs)
                        {
                            var content = await attachmentStorageService.LoadAttachmentAsync(
                                attachment.StoragePath, ct);
                            if (content != null)
                            {
                                loadedAttachments.Add(new EmailMessageAttachment(
                                    new MemoryStream(content), attachment.FileName));
                            }
                            else
                            {
                                logger.LogWarning(
                                    "Attachment file not found: {StoragePath} for delivery {DeliveryId}",
                                    attachment.StoragePath, deliveryId);
                            }
                        }

                        if (loadedAttachments.Count > 0)
                        {
                            emailAttachments = loadedAttachments;
                            logger.LogDebug(
                                "Loaded {Count} attachments from temp storage for delivery {DeliveryId}",
                                loadedAttachments.Count, deliveryId);
                        }
                    }
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to load attachments for delivery {DeliveryId}", deliveryId);
                    // Continue without attachments
                }
            }

            var message = new EmailMessage(
                delivery.EmailFrom,
                SplitAddresses(delivery.EmailRecipients),
                SplitAddressesOrNull(ccAddress),
                SplitAddressesOrNull(bccAddress),
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

            // Clean up temp attachment files after successful delivery
            attachmentStorageService.DeleteDeliveryAttachments(deliveryId);

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

                // Clean up temp attachment files on permanent failure
                attachmentStorageService.DeleteDeliveryAttachments(deliveryId);

                // Update configuration stats
                await configurationService.IncrementFailedCountAsync(delivery.ConfigurationId, ct);

                logger.LogError(ex,
                    "Email delivery {DeliveryId} failed permanently after {Attempts} attempts",
                    deliveryId, delivery.AttemptNumber);
            }
        }

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.OutboundDeliveries.Update(delivery);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        return delivery.Status == OutboundDeliveryStatus.Succeeded;
    }

    public async Task<string> RenderTemplateAsync<TNotification>(
        string templatePath,
        EmailModel<TNotification> model,
        CancellationToken ct = default) where TNotification : MerchelloNotification
    {
        return await templateRenderer.RenderAsync(templatePath, model, ct);
    }

    public async Task<EmailSendTestResultDto> SendTestEmailAsync(
        Guid configurationId,
        string testRecipient,
        CancellationToken ct = default)
    {
        var result = new EmailSendTestResultDto { Recipient = testRecipient };

        var loaded = await LoadSampleContextAsync(configurationId, ct);
        if (loaded.Error != null || loaded.Config == null || loaded.Context == null)
        {
            result.ErrorMessage = loaded.Error ?? "Failed to load email configuration";
            return result;
        }
        var config = loaded.Config;
        var context = loaded.Context;

        try
        {
            var resolved = ResolveEmailFields(
                config,
                context,
                toOverride: testRecipient,
                includeCcBcc: false,
                subjectPrefix: "[TEST] ");

            // Render the template
            var body = await RenderTemplateRuntimeAsync(config, context, ct);

            // Generate attachments if configured
            IEnumerable<EmailMessageAttachment>? emailAttachments = null;
            if (config.AttachmentAliases.Count > 0)
            {
                try
                {
                    var attachmentResults = await GenerateAttachmentResultsRuntimeAsync(config, context, ct);
                    emailAttachments = ToEmailMessageAttachments(attachmentResults);

                    if (attachmentResults.Count > 0)
                    {
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
                resolved.From,
                SplitAddresses(resolved.To),
                null,
                null,
                null,
                resolved.Subject,
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

        var loaded = await LoadSampleContextAsync(configurationId, ct);
        if (loaded.Error != null || loaded.Config == null || loaded.Context == null)
        {
            result.ErrorMessage = loaded.Error ?? "Failed to load email configuration";
            return result;
        }
        var config = loaded.Config;
        var context = loaded.Context;

        try
        {
            var resolved = ResolveEmailFields(config, context);
            result.To = resolved.To;
            result.Cc = resolved.Cc;
            result.Bcc = resolved.Bcc;
            result.From = resolved.From;
            result.Subject = resolved.Subject;

            // Render the template
            try
            {
                result.Body = await RenderTemplateRuntimeAsync(config, context, ct);
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
                           (x.Status == OutboundDeliveryStatus.Pending ||
                            (x.Status == OutboundDeliveryStatus.Retrying && x.NextRetryUtc <= DateTime.UtcNow)))
                .OrderBy(x => x.DateCreated)
                .Take(50) // Process in batches
                .ToListAsync(ct));
        scope.Complete();

        foreach (var delivery in pendingDeliveries)
        {
            await DeliverAsync(delivery.Id, ct);
        }

        if (pendingDeliveries.Count > 0)
        {
            logger.LogInformation("Processed {Count} pending email deliveries", pendingDeliveries.Count);
        }
    }

    public EmailStoreContext GetStoreContext()
    {
        var store = GetEffectiveStoreSettings();

        return new EmailStoreContext
        {
            Name = store.Name ?? string.Empty,
            Email = store.Email ?? string.Empty,
            LogoUrl = store.LogoUrl,
            WebsiteUrl = store.WebsiteUrl,
            Phone = store.Phone
        };
    }

    private RuntimeEmailContext CreateRuntimeEmailContext(EmailConfiguration config, MerchelloNotification notification)
    {
        var storeContext = GetStoreContext();
        return new RuntimeEmailContext
        {
            StoreContext = storeContext,
            NotificationType = notification.GetType(),
            EmailModel = CreateRuntimeEmailModel(notification, storeContext, config)
        };
    }

    private static object CreateRuntimeEmailModel(
        MerchelloNotification notification,
        EmailStoreContext storeContext,
        EmailConfiguration config)
    {
        var emailModelType = typeof(EmailModel<>).MakeGenericType(notification.GetType());
        var emailModel = Activator.CreateInstance(emailModelType)
            ?? throw new InvalidOperationException($"Failed to create EmailModel for {notification.GetType().Name}");
        emailModelType.GetProperty(nameof(EmailModel.Notification))!.SetValue(emailModel, notification);
        emailModelType.GetProperty(nameof(EmailModel.Store))!.SetValue(emailModel, storeContext);
        emailModelType.GetProperty(nameof(EmailModel.Configuration))!.SetValue(emailModel, config);
        return emailModel;
    }

    private ResolvedEmailFields ResolveEmailFields(
        EmailConfiguration config,
        RuntimeEmailContext context,
        string? toOverride = null,
        bool includeCcBcc = true,
        string? subjectPrefix = null)
    {
        var to = toOverride ?? ResolveTokensRuntime(config.ToExpression, context.EmailModel, context.NotificationType);
        var cc = includeCcBcc && !string.IsNullOrWhiteSpace(config.CcExpression)
            ? ResolveTokensRuntime(config.CcExpression, context.EmailModel, context.NotificationType)
            : null;
        var bcc = includeCcBcc && !string.IsNullOrWhiteSpace(config.BccExpression)
            ? ResolveTokensRuntime(config.BccExpression, context.EmailModel, context.NotificationType)
            : null;
        var effectiveEmail = GetEffectiveEmailSettings();
        var from = !string.IsNullOrWhiteSpace(config.FromExpression)
            ? ResolveTokensRuntime(config.FromExpression, context.EmailModel, context.NotificationType)
            : effectiveEmail.DefaultFromAddress ?? context.StoreContext.Email ?? "noreply@example.com";
        var subject = ResolveTokensRuntime(config.SubjectExpression, context.EmailModel, context.NotificationType);
        if (!string.IsNullOrWhiteSpace(subjectPrefix))
        {
            subject = $"{subjectPrefix}{subject}";
        }

        return new ResolvedEmailFields
        {
            To = to,
            Cc = cc,
            Bcc = bcc,
            From = from,
            Subject = subject
        };
    }

    private string ResolveTokensRuntime(string template, object emailModel, Type notificationType)
    {
        if (string.IsNullOrEmpty(template))
            return template;

        var method = ResolveTokensGenericMethod.MakeGenericMethod(notificationType);
        var resolved = method.Invoke(tokenResolver, [template, emailModel]) as string;
        return resolved ?? template;
    }

    private async Task<string> RenderTemplateRuntimeAsync(
        EmailConfiguration config,
        RuntimeEmailContext context,
        CancellationToken ct)
    {
        return await templateRenderer.RenderAsync(config.TemplatePath, context.EmailModel, ct);
    }

    private async Task<IReadOnlyList<EmailAttachmentResult>> GenerateAttachmentResultsRuntimeAsync(
        EmailConfiguration config,
        RuntimeEmailContext context,
        CancellationToken ct)
    {
        if (config.AttachmentAliases.Count == 0)
        {
            return [];
        }

        var method = GenerateAttachmentsGenericMethod.MakeGenericMethod(context.NotificationType);
        var task = (Task)method.Invoke(attachmentResolver, [context.EmailModel, config.AttachmentAliases, ct])!;
        await task;

        var resultProperty = task.GetType().GetProperty("Result")
            ?? throw new InvalidOperationException("Could not access attachment generation result");
        var attachmentResults = resultProperty.GetValue(task) as IReadOnlyList<EmailAttachmentResult>;

        return attachmentResults ?? [];
    }

    private async Task<List<StoredAttachmentReference>> SaveAttachmentResultsAsync(
        Guid deliveryId,
        IReadOnlyList<EmailAttachmentResult> attachmentResults,
        CancellationToken ct)
    {
        var attachmentRefs = new List<StoredAttachmentReference>(attachmentResults.Count);
        foreach (var attachmentResult in attachmentResults)
        {
            var reference = await attachmentStorageService.SaveAttachmentAsync(
                deliveryId, attachmentResult, ct);
            attachmentRefs.Add(reference);
        }

        return attachmentRefs;
    }

    private static IEnumerable<EmailMessageAttachment>? ToEmailMessageAttachments(
        IReadOnlyList<EmailAttachmentResult> attachmentResults)
    {
        if (attachmentResults.Count == 0)
        {
            return null;
        }

        var attachments = new List<EmailMessageAttachment>(attachmentResults.Count);
        foreach (var attachment in attachmentResults)
        {
            attachments.Add(new EmailMessageAttachment(new MemoryStream(attachment.Content), attachment.FileName));
        }

        return attachments;
    }

    private static string[] SplitAddresses(string addresses)
    {
        return addresses.Split([',', ';'],
            StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }

    private static string[]? SplitAddressesOrNull(string? addresses)
    {
        if (string.IsNullOrWhiteSpace(addresses))
        {
            return null;
        }

        return SplitAddresses(addresses);
    }

    private async Task<(EmailConfiguration? Config, RuntimeEmailContext? Context, string? Error)> LoadSampleContextAsync(
        Guid configurationId,
        CancellationToken ct)
    {
        var config = await configurationService.GetByIdAsync(configurationId, ct);
        if (config == null)
        {
            return (null, null, "Email configuration not found");
        }

        var sampleNotification = sampleNotificationFactory.CreateSampleNotification(config.Topic);
        if (sampleNotification == null)
        {
            return (config, null, $"Cannot create sample notification for topic: {config.Topic}");
        }

        var context = CreateRuntimeEmailContext(config, sampleNotification);
        return (config, context, null);
    }

    private EmailSettings GetEffectiveEmailSettings()
    {
        if (_storeSettingsService == null)
        {
            return _settings;
        }

        try
        {
            var runtime = _storeSettingsService.GetRuntimeSettings();
            return runtime.Email;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Failed to resolve DB-backed email settings, falling back to appsettings.");
            return _settings;
        }
    }

    private StoreSettings GetEffectiveStoreSettings()
    {
        if (_storeSettingsService == null)
        {
            return _store;
        }

        try
        {
            var runtime = _storeSettingsService.GetRuntimeSettings();
            return runtime.Merchello.Store ?? _store;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Failed to resolve DB-backed store settings for email context, falling back to appsettings.");
            return _store;
        }
    }
}
