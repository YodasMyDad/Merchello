using Merchello.Core.Checkout.Services.Interfaces;
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

        // Ensure reasonable minimum values
        var checkInterval = TimeSpan.FromMinutes(Math.Max(5, _settings.CheckIntervalMinutes));
        var abandonmentThreshold = TimeSpan.FromHours(Math.Max(0.5, _settings.AbandonmentThresholdHours));
        var expiryThreshold = TimeSpan.FromDays(Math.Max(1, _settings.RecoveryExpiryDays));

        logger.LogInformation(
            "Abandoned checkout detection started. Check interval: {Interval}min, Abandonment threshold: {Threshold}h",
            _settings.CheckIntervalMinutes, _settings.AbandonmentThresholdHours);

        // Wait a bit before first run to allow app startup to complete
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        using var timer = new PeriodicTimer(checkInterval);

        try
        {
            // Run immediately on startup, then on interval
            await RunDetectionCycleAsync(abandonmentThreshold, expiryThreshold, stoppingToken);

            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await RunDetectionCycleAsync(abandonmentThreshold, expiryThreshold, stoppingToken);
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
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in abandoned checkout detection cycle");
        }
    }
}
