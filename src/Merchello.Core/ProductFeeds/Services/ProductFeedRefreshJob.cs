using Merchello.Core.ProductFeeds.Services.Interfaces;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Services;

namespace Merchello.Core.ProductFeeds.Services;

/// <summary>
/// Background service that periodically rebuilds enabled product feeds to keep product and promotions snapshots current.
/// </summary>
public class ProductFeedRefreshJob(
    IServiceScopeFactory serviceScopeFactory,
    ISeedDataInstallationState seedDataInstallationState,
    IOptions<ProductFeedSettings> options,
    IRuntimeState runtimeState,
    ILogger<ProductFeedRefreshJob> logger) : BackgroundService
{
    private readonly ProductFeedSettings _settings = options.Value;
    private readonly TimeSpan _initialDelay = TimeSpan.FromMinutes(2);

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
        => HostedServiceRuntimeGate.RunIsolatedAsync(ExecuteCoreAsync, stoppingToken);

    private async Task ExecuteCoreAsync(CancellationToken stoppingToken)
    {
        if (!await HostedServiceRuntimeGate.WaitForRunLevelAsync(
                runtimeState,
                logger,
                nameof(ProductFeedRefreshJob),
                stoppingToken))
        {
            return;
        }

        if (!_settings.AutoRefreshEnabled)
        {
            logger.LogInformation("ProductFeedRefreshJob disabled (Merchello:ProductFeeds:AutoRefreshEnabled=false).");
            return;
        }

        logger.LogInformation(
            "ProductFeedRefreshJob started (refresh interval: {RefreshIntervalHours}h)",
            Math.Max(1, _settings.RefreshIntervalHours));

        try
        {
            await Task.Delay(_initialDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        var interval = TimeSpan.FromHours(Math.Max(1, _settings.RefreshIntervalHours));
        using var timer = new PeriodicTimer(interval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (seedDataInstallationState.IsInstalling)
                {
                    logger.LogDebug("Seed data installation in progress, skipping product feed refresh run");
                }
                else
                {
                    await RefreshEnabledFeedsAsync(stoppingToken);
                }
            }
            catch (Exception ex) when (IsDatabaseNotReadyException(ex))
            {
                logger.LogDebug("Database not ready yet, skipping product feed refresh run");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error while refreshing product feeds");
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

        logger.LogInformation("ProductFeedRefreshJob stopped");
    }

    private async Task RefreshEnabledFeedsAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceScopeFactory.CreateScope();
        var productFeedService = scope.ServiceProvider.GetRequiredService<IProductFeedService>();

        var feeds = await productFeedService.GetFeedsAsync(cancellationToken);
        var enabledFeeds = feeds.Where(x => x.IsEnabled).ToList();
        if (enabledFeeds.Count == 0)
        {
            logger.LogDebug("No enabled product feeds found for scheduled refresh.");
            return;
        }

        var successCount = 0;
        var failureCount = 0;

        foreach (var feed in enabledFeeds)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var rebuild = await productFeedService.RebuildAsync(feed.Id, cancellationToken);
            if (rebuild is { Success: true })
            {
                successCount++;
                continue;
            }

            failureCount++;
            logger.LogWarning(
                "Scheduled product feed refresh failed for feed {FeedId} ({FeedName}): {Error}",
                feed.Id,
                feed.Name,
                rebuild?.Error ?? "Unknown error");
        }

        logger.LogInformation(
            "Scheduled product feed refresh complete: {SuccessCount}/{TotalCount} succeeded, {FailureCount} failed.",
            successCount,
            enabledFeeds.Count,
            failureCount);
    }

    private static bool IsDatabaseNotReadyException(Exception ex)
    {
        return ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) ||
               ex.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) ||
               ex.InnerException?.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) == true ||
               ex.InnerException?.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) == true;
    }
}
