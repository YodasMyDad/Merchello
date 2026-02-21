using Merchello.Core.ProductSync.Services.Interfaces;
using Merchello.Core.Shared.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Services;

namespace Merchello.Core.ProductSync.Services;

public class ProductSyncCleanupJob(
    IServiceScopeFactory serviceScopeFactory,
    IRuntimeState runtimeState,
    ILogger<ProductSyncCleanupJob> logger) : BackgroundService
{
    private readonly TimeSpan _cleanupInterval = TimeSpan.FromHours(24);
    private readonly TimeSpan _initialDelay = TimeSpan.FromMinutes(10);

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
        => HostedServiceRuntimeGate.RunIsolatedAsync(ExecuteCoreAsync, stoppingToken);

    private async Task ExecuteCoreAsync(CancellationToken stoppingToken)
    {
        if (!await HostedServiceRuntimeGate.WaitForRunLevelAsync(
                runtimeState,
                logger,
                nameof(ProductSyncCleanupJob),
                stoppingToken))
        {
            return;
        }

        logger.LogInformation("ProductSyncCleanupJob started.");

        try
        {
            await Task.Delay(_initialDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        using var timer = new PeriodicTimer(_cleanupInterval);
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
                using var scope = serviceScopeFactory.CreateScope();
                var productSyncService = scope.ServiceProvider.GetRequiredService<IProductSyncService>();
                await HostedServiceRuntimeGate.ExecuteWithSqliteLockRetryAsync(
                    () => productSyncService.CleanupRunsAsync(stoppingToken),
                    logger,
                    "product sync cleanup",
                    stoppingToken);
            }
            catch (Exception ex) when (IsDatabaseNotReadyException(ex))
            {
                logger.LogDebug("Database not ready yet, skipping product sync cleanup.");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error while cleaning old product sync runs.");
            }
        }

        logger.LogInformation("ProductSyncCleanupJob stopped.");
    }

    private static bool IsDatabaseNotReadyException(Exception ex)
    {
        return ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) ||
               ex.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) ||
               ex.InnerException?.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) == true ||
               ex.InnerException?.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) == true;
    }
}
