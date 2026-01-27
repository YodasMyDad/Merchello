using Merchello.Core.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Fulfilment.Services;

/// <summary>
/// Background service that cleans up old fulfilment sync logs and webhook logs
/// based on retention settings.
/// </summary>
public class FulfilmentCleanupJob(
    IServiceScopeFactory serviceScopeFactory,
    IOptions<FulfilmentSettings> settings,
    ILogger<FulfilmentCleanupJob> logger) : BackgroundService
{
    private readonly FulfilmentSettings _settings = settings.Value;
    private readonly TimeSpan _cleanupInterval = TimeSpan.FromHours(24);
    private readonly TimeSpan _initialDelay = TimeSpan.FromMinutes(10);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_settings.Enabled)
        {
            logger.LogInformation("FulfilmentCleanupJob disabled - fulfilment system is not enabled");
            return;
        }

        logger.LogInformation("FulfilmentCleanupJob started with {Interval} hour cleanup interval",
            _cleanupInterval.TotalHours);

        // Wait for migrations to complete before first cleanup
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
                await CleanupOldLogsAsync(stoppingToken);
            }
            catch (Exception ex) when (IsDatabaseNotReadyException(ex))
            {
                logger.LogDebug("Database not ready yet, skipping fulfilment log cleanup");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error during fulfilment log cleanup");
            }
        }

        logger.LogInformation("FulfilmentCleanupJob stopped");
    }

    private static bool IsDatabaseNotReadyException(Exception ex)
    {
        return ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) ||
               ex.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) ||
               ex.InnerException?.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) == true ||
               ex.InnerException?.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) == true;
    }

    private async Task CleanupOldLogsAsync(CancellationToken stoppingToken)
    {
        using var diScope = serviceScopeFactory.CreateScope();
        var efCoreScopeProvider = diScope.ServiceProvider.GetRequiredService<IEFCoreScopeProvider<MerchelloDbContext>>();

        var now = DateTime.UtcNow;

        using var scope = efCoreScopeProvider.CreateScope();

        // Clean up old sync logs based on retention period
        var syncLogCutoff = now.AddDays(-_settings.SyncLogRetentionDays);
        var deletedSyncLogs = await scope.ExecuteWithContextAsync(async db =>
            await db.FulfilmentSyncLogs
                .Where(l => l.StartedAt < syncLogCutoff)
                .ExecuteDeleteAsync(stoppingToken));

        if (deletedSyncLogs > 0)
        {
            logger.LogInformation("Cleaned up {Count} fulfilment sync logs older than {Days} days",
                deletedSyncLogs, _settings.SyncLogRetentionDays);
        }

        // Clean up expired webhook logs (they have an explicit ExpiresAt field)
        var deletedWebhookLogs = await scope.ExecuteWithContextAsync(async db =>
            await db.FulfilmentWebhookLogs
                .Where(l => l.ExpiresAt < now)
                .ExecuteDeleteAsync(stoppingToken));

        if (deletedWebhookLogs > 0)
        {
            logger.LogInformation("Cleaned up {Count} expired fulfilment webhook logs",
                deletedWebhookLogs);
        }

        scope.Complete();
    }
}
