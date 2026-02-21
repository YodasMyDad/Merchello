using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shared.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Services;

namespace Merchello.Core.Discounts.Services;

/// <summary>
/// Background service that updates expired discount statuses.
/// Runs periodically to set Active discounts with passed EndsAt to Expired status.
/// </summary>
public class DiscountStatusJob(
    IServiceScopeFactory serviceScopeFactory,
    ISeedDataInstallationState seedDataInstallationState,
    IRuntimeState runtimeState,
    ILogger<DiscountStatusJob> logger) : BackgroundService
{
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);
    private readonly TimeSpan _initialDelay = TimeSpan.FromSeconds(30);

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
        => HostedServiceRuntimeGate.RunIsolatedAsync(ExecuteCoreAsync, stoppingToken);

    private async Task ExecuteCoreAsync(CancellationToken stoppingToken)
    {
        if (!await HostedServiceRuntimeGate.WaitForRunLevelAsync(
                runtimeState,
                logger,
                nameof(DiscountStatusJob),
                stoppingToken))
        {
            return;
        }

        logger.LogInformation("DiscountStatusJob started, waiting for database to be ready...");

        // Wait for migrations to complete before first check
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
                    logger.LogDebug("Seed data installation in progress, skipping discount expiry check");
                }
                else
                {
                    await HostedServiceRuntimeGate.ExecuteWithSqliteLockRetryAsync(
                        () => UpdateExpiredDiscountsAsync(stoppingToken),
                        logger,
                        "discount expiry check",
                        stoppingToken);
                }
            }
            catch (Exception ex) when (IsDatabaseNotReadyException(ex))
            {
                // Database not ready yet (migrations still running), silently skip this cycle
                logger.LogDebug("Database not ready yet, skipping discount expiry check");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error updating expired discounts");
            }

            try
            {
                await timer.WaitForNextTickAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Expected when stoppingToken is cancelled
                break;
            }
        }

        logger.LogInformation("DiscountStatusJob stopped");
    }

    private static bool IsDatabaseNotReadyException(Exception ex)
    {
        // Check if this is a "table doesn't exist" error (migrations not yet complete)
        return ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) ||
               ex.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) ||
               ex.InnerException?.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) == true ||
               ex.InnerException?.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) == true;
    }

    private async Task UpdateExpiredDiscountsAsync(CancellationToken stoppingToken)
    {
        using var scope = serviceScopeFactory.CreateScope();
        var discountService = scope.ServiceProvider.GetRequiredService<IDiscountService>();

        await discountService.UpdateExpiredDiscountsAsync(stoppingToken);
    }
}
