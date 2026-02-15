using Merchello.Core.Data;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shared.Services;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Upsells.Services;

/// <summary>
/// Background service that transitions Scheduled→Active and Active→Expired upsell rules,
/// and periodically cleans up old analytics events.
/// </summary>
public class UpsellStatusJob(
    IServiceScopeFactory serviceScopeFactory,
    ISeedDataInstallationState seedDataInstallationState,
    IOptions<UpsellSettings> upsellSettings,
    IRuntimeState runtimeState,
    ILogger<UpsellStatusJob> logger) : BackgroundService
{
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);
    private readonly TimeSpan _initialDelay = TimeSpan.FromSeconds(30);
    private readonly UpsellSettings _settings = upsellSettings.Value;
    private DateTime _lastCleanup = DateTime.MinValue;

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
        => HostedServiceRuntimeGate.RunIsolatedAsync(ExecuteCoreAsync, stoppingToken);

    private async Task ExecuteCoreAsync(CancellationToken stoppingToken)
    {
        if (!await HostedServiceRuntimeGate.WaitForRunLevelAsync(
                runtimeState,
                logger,
                nameof(UpsellStatusJob),
                stoppingToken))
        {
            return;
        }

        logger.LogInformation("UpsellStatusJob started, waiting for database to be ready...");

        try
        {
            await Task.Delay(_initialDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        using var timer = new PeriodicTimer(_checkInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (seedDataInstallationState.IsInstalling)
                {
                    logger.LogDebug("Seed data installation in progress, skipping upsell status check");
                }
                else
                {
                    await UpdateExpiredUpsellsAsync(stoppingToken);

                    // Run event cleanup once per hour
                    if (DateTime.UtcNow - _lastCleanup > TimeSpan.FromHours(1))
                    {
                        await CleanupOldEventsAsync(stoppingToken);
                        _lastCleanup = DateTime.UtcNow;
                    }
                }
            }
            catch (Exception ex) when (IsDatabaseNotReadyException(ex))
            {
                logger.LogDebug("Database not ready yet, skipping upsell status check");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in UpsellStatusJob");
            }

            try
            {
                await timer.WaitForNextTickAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        logger.LogInformation("UpsellStatusJob stopped");
    }

    private async Task UpdateExpiredUpsellsAsync(CancellationToken ct)
    {
        using var scope = serviceScopeFactory.CreateScope();
        var upsellService = scope.ServiceProvider.GetRequiredService<IUpsellService>();
        await upsellService.UpdateExpiredUpsellsAsync(ct);
    }

    private async Task CleanupOldEventsAsync(CancellationToken ct)
    {
        using var diScope = serviceScopeFactory.CreateScope();
        var efCoreScopeProvider = diScope.ServiceProvider.GetRequiredService<IEFCoreScopeProvider<MerchelloDbContext>>();
        var cutoff = DateTime.UtcNow.AddDays(-_settings.EventRetentionDays);

        using var scope = efCoreScopeProvider.CreateScope();
        var deleted = await scope.ExecuteWithContextAsync(async db =>
            await db.UpsellEvents
                .Where(e => e.DateCreated < cutoff)
                .ExecuteDeleteAsync(ct));
        scope.Complete();

        if (deleted > 0)
            logger.LogInformation("Cleaned up {Count} old upsell analytics events", deleted);
    }

    private static bool IsDatabaseNotReadyException(Exception ex) =>
        ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) ||
        ex.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) ||
        ex.InnerException?.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) == true ||
        ex.InnerException?.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) == true;
}
