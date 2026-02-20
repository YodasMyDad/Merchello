using Merchello.Core.ProductSync.Services.Interfaces;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Services;

namespace Merchello.Core.ProductSync.Services;

public class ProductSyncWorkerJob(
    IServiceScopeFactory serviceScopeFactory,
    ISeedDataInstallationState seedDataInstallationState,
    IOptions<ProductSyncSettings> settings,
    IRuntimeState runtimeState,
    ILogger<ProductSyncWorkerJob> logger) : BackgroundService
{
    private readonly ProductSyncSettings _settings = settings.Value;
    private readonly TimeSpan _initialDelay = TimeSpan.FromMinutes(2);

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
        => HostedServiceRuntimeGate.RunIsolatedAsync(ExecuteCoreAsync, stoppingToken);

    private async Task ExecuteCoreAsync(CancellationToken stoppingToken)
    {
        if (!await HostedServiceRuntimeGate.WaitForRunLevelAsync(
                runtimeState,
                logger,
                nameof(ProductSyncWorkerJob),
                stoppingToken))
        {
            return;
        }

        logger.LogInformation(
            "ProductSyncWorkerJob started (interval: {IntervalSeconds}s)",
            Math.Max(2, _settings.WorkerIntervalSeconds));

        try
        {
            await Task.Delay(_initialDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        var interval = TimeSpan.FromSeconds(Math.Max(2, _settings.WorkerIntervalSeconds));
        using var timer = new PeriodicTimer(interval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (!seedDataInstallationState.IsInstalling)
                {
                    using var scope = serviceScopeFactory.CreateScope();
                    var productSyncService = scope.ServiceProvider.GetRequiredService<IProductSyncService>();
                    var processed = await HostedServiceRuntimeGate.ExecuteWithSqliteLockRetryAsync(
                        () => productSyncService.TryProcessNextQueuedRunAsync(stoppingToken),
                        logger,
                        "product sync worker cycle",
                        stoppingToken);
                    if (processed)
                    {
                        continue;
                    }
                }
            }
            catch (Exception ex) when (IsDatabaseNotReadyException(ex))
            {
                logger.LogDebug("Database not ready yet, skipping product sync worker cycle.");
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error while processing product sync queue.");
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

        logger.LogInformation("ProductSyncWorkerJob stopped.");
    }

    private static bool IsDatabaseNotReadyException(Exception ex)
    {
        return ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) ||
               ex.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) ||
               ex.InnerException?.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) == true ||
               ex.InnerException?.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) == true;
    }
}
