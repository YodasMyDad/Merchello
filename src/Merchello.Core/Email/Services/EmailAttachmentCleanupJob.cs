using Merchello.Core.Email.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Email.Services;

/// <summary>
/// Background service that cleans up orphaned email attachment temp files.
/// Files are deleted when they exceed the retention period.
/// </summary>
public class EmailAttachmentCleanupJob(
    IServiceScopeFactory serviceScopeFactory,
    IOptions<EmailSettings> settings,
    ILogger<EmailAttachmentCleanupJob> logger) : BackgroundService
{
    private readonly EmailSettings _settings = settings.Value;
    private readonly TimeSpan _cleanupInterval = TimeSpan.FromHours(6);
    private readonly TimeSpan _initialDelay = TimeSpan.FromMinutes(15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_settings.Enabled)
        {
            logger.LogInformation("EmailAttachmentCleanupJob disabled - email system is not enabled");
            return;
        }

        logger.LogInformation(
            "EmailAttachmentCleanupJob started with {Interval} hour cleanup interval, {Retention} hour retention",
            _cleanupInterval.TotalHours, _settings.AttachmentRetentionHours);

        // Wait for application to fully start
        try
        {
            await Task.Delay(_initialDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        using var timer = new PeriodicTimer(_cleanupInterval);

        // Run cleanup immediately on first iteration
        var firstRun = true;

        while (!stoppingToken.IsCancellationRequested)
        {
            if (!firstRun)
            {
                try
                {
                    await timer.WaitForNextTickAsync(stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }

            firstRun = false;

            try
            {
                await CleanupOrphanedAttachmentsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error during email attachment cleanup");
            }
        }

        logger.LogInformation("EmailAttachmentCleanupJob stopped");
    }

    private Task CleanupOrphanedAttachmentsAsync(CancellationToken stoppingToken)
    {
        using var scope = serviceScopeFactory.CreateScope();
        var storageService = scope.ServiceProvider.GetRequiredService<IEmailAttachmentStorageService>();

        var expiredFolders = storageService.GetExpiredDeliveryFolders(_settings.AttachmentRetentionHours).ToList();

        if (expiredFolders.Count == 0)
        {
            return Task.CompletedTask;
        }

        var deletedCount = 0;
        foreach (var folderName in expiredFolders)
        {
            if (stoppingToken.IsCancellationRequested)
                break;

            if (Guid.TryParse(folderName, out var deliveryId))
            {
                storageService.DeleteDeliveryAttachments(deliveryId);
                deletedCount++;
            }
        }

        if (deletedCount > 0)
        {
            logger.LogInformation(
                "Cleaned up {Count} orphaned email attachment folders older than {Hours} hours",
                deletedCount, _settings.AttachmentRetentionHours);
        }

        return Task.CompletedTask;
    }
}
