using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Settings.Services.Interfaces;
using Merchello.Core.Shared.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Services;

namespace Merchello.Core.Checkout.Services;

/// <summary>
/// Background job that handles abandoned checkout detection and recovery email scheduling.
/// Responsibilities:
/// 1. Detect abandonment - Mark checkouts as abandoned after inactivity threshold
/// 2. Send recovery emails - Fire notifications for scheduled emails in the sequence
/// 3. Expire old recoveries - Clean up expired recovery tokens
/// </summary>
public class AbandonedCheckoutDetectionJob(
    IServiceScopeFactory serviceScopeFactory,
    IOptions<AbandonedCheckoutSettings> options,
    IRuntimeState runtimeState,
    ILogger<AbandonedCheckoutDetectionJob> logger) : BackgroundService
{
    private readonly AbandonedCheckoutSettings _settings = options.Value;

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
        => HostedServiceRuntimeGate.RunIsolatedAsync(ExecuteCoreAsync, stoppingToken);

    private async Task ExecuteCoreAsync(CancellationToken stoppingToken)
    {
        if (!await HostedServiceRuntimeGate.WaitForRunLevelAsync(
                runtimeState,
                logger,
                nameof(AbandonedCheckoutDetectionJob),
                stoppingToken))
        {
            return;
        }

        // Wait a bit before first run to allow app startup to complete.
        // Cancellation can happen during startup/shutdown transitions, which is expected.
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                var effectiveSettings = await GetEffectiveSettingsAsync(stoppingToken);
                var checkInterval = TimeSpan.FromMinutes(Math.Max(5, effectiveSettings.CheckIntervalMinutes));
                var abandonmentThreshold = TimeSpan.FromHours(Math.Max(0.5, effectiveSettings.AbandonmentThresholdHours));
                var expiryThreshold = TimeSpan.FromDays(Math.Max(1, effectiveSettings.RecoveryExpiryDays));

                await HostedServiceRuntimeGate.ExecuteWithSqliteLockRetryAsync(
                    () => RunDetectionCycleAsync(abandonmentThreshold, expiryThreshold, stoppingToken),
                    logger,
                    "abandoned checkout detection cycle",
                    stoppingToken);
                await Task.Delay(checkInterval, stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Expected during shutdown
            logger.LogInformation("Abandoned checkout detection stopped");
        }
    }

    private async Task RunDetectionCycleAsync(
        TimeSpan abandonmentThreshold,
        TimeSpan expiryThreshold,
        CancellationToken ct)
    {
        try
        {
            using var scope = serviceScopeFactory.CreateScope();
            var service = scope.ServiceProvider.GetRequiredService<IAbandonedCheckoutService>();

            // Step 1: Detect new abandoned checkouts
            await service.DetectAbandonedCheckoutsAsync(abandonmentThreshold, ct);

            // Step 2: Send scheduled recovery emails
            await service.SendScheduledRecoveryEmailsAsync(ct);

            // Step 3: Expire old recoveries
            await service.ExpireOldRecoveriesAsync(expiryThreshold, ct);
        }
        catch (Exception ex) when (HostedServiceRuntimeGate.IsTransientSqliteLockException(ex))
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in abandoned checkout detection cycle");
        }
    }

    private async Task<AbandonedCheckoutSettings> GetEffectiveSettingsAsync(CancellationToken ct)
    {
        try
        {
            using var scope = serviceScopeFactory.CreateScope();
            var storeSettingsService = scope.ServiceProvider.GetService<IMerchelloStoreSettingsService>();
            if (storeSettingsService == null)
            {
                return _settings;
            }

            var runtime = await storeSettingsService.GetRuntimeSettingsAsync(ct);
            return runtime.AbandonedCheckout;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Failed to resolve DB-backed abandoned checkout settings, falling back to appsettings.");
            return _settings;
        }
    }
}
