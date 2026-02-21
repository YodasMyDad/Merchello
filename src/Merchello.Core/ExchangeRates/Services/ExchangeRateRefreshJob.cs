using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.ExchangeRates.Notifications;
using Merchello.Core.ExchangeRates.Providers;
using Merchello.Core.ExchangeRates.Providers.Interfaces;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Services;

namespace Merchello.Core.ExchangeRates.Services;

public class ExchangeRateRefreshJob(
    IServiceScopeFactory serviceScopeFactory,
    IOptions<MerchelloSettings> merchelloSettings,
    IOptions<ExchangeRateOptions> options,
    IRuntimeState runtimeState,
    ILogger<ExchangeRateRefreshJob> logger) : BackgroundService
{
    private readonly MerchelloSettings _settings = merchelloSettings.Value;
    private readonly ExchangeRateOptions _options = options.Value;
    private int _consecutiveFailures;

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
        => HostedServiceRuntimeGate.RunIsolatedAsync(ExecuteCoreAsync, stoppingToken);

    private async Task ExecuteCoreAsync(CancellationToken stoppingToken)
    {
        if (!await HostedServiceRuntimeGate.WaitForRunLevelAsync(
                runtimeState,
                logger,
                nameof(ExchangeRateRefreshJob),
                stoppingToken))
        {
            return;
        }

        var interval = TimeSpan.FromMinutes(Math.Max(1, _options.RefreshIntervalMinutes));
        using var timer = new PeriodicTimer(interval);

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await HostedServiceRuntimeGate.ExecuteWithSqliteLockRetryAsync(
                    () => RefreshOnceAsync(stoppingToken),
                    logger,
                    "exchange rate refresh",
                    stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Expected during shutdown.
        }
    }

    private async Task RefreshOnceAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceScopeFactory.CreateScope();
        var providerManager = scope.ServiceProvider.GetRequiredService<IExchangeRateProviderManager>();
        var exchangeRateCache = scope.ServiceProvider.GetRequiredService<IExchangeRateCache>();
        var notificationPublisher = scope.ServiceProvider.GetRequiredService<IMerchelloNotificationPublisher>();

        var active = await providerManager.GetActiveProviderAsync(cancellationToken);
        if (active == null)
        {
            logger.LogWarning("Exchange rate refresh skipped - no active provider configured.");
            return;
        }

        var baseCurrency = _settings.StoreCurrencyCode.ToUpperInvariant();

        try
        {
            var result = await active.Provider.GetRatesAsync(baseCurrency, cancellationToken);
            if (!result.Success || result.Rates.Count == 0)
            {
                _consecutiveFailures++;
                await notificationPublisher.PublishAsync(
                    new ExchangeRateFetchFailedNotification(
                        active.Metadata.Alias,
                        baseCurrency,
                        result.ErrorMessage,
                        _consecutiveFailures),
                    cancellationToken);

                logger.LogWarning(
                    "Exchange rate refresh failed ({Failures} consecutive) for {ProviderAlias}: {Error}",
                    _consecutiveFailures,
                    active.Metadata.Alias,
                    result.ErrorMessage ?? "Unknown error");
                return;
            }

            _consecutiveFailures = 0;

            await exchangeRateCache.SetSnapshotAsync(
                new ExchangeRateSnapshot(
                    active.Metadata.Alias,
                    result.BaseCurrency.ToUpperInvariant(),
                    result.Rates,
                    result.TimestampUtc),
                cancellationToken);

            await notificationPublisher.PublishAsync(
                new ExchangeRatesRefreshedNotification(
                    active.Metadata.Alias,
                    result.BaseCurrency.ToUpperInvariant(),
                    result.TimestampUtc,
                    result.Rates.Count),
                cancellationToken);

            logger.LogInformation(
                "Exchange rates refreshed from {ProviderAlias} ({RateCount} rates, base {BaseCurrency})",
                active.Metadata.Alias,
                result.Rates.Count,
                result.BaseCurrency);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Expected during shutdown.
        }
        catch (Exception ex) when (HostedServiceRuntimeGate.IsTransientSqliteLockException(ex))
        {
            throw;
        }
        catch (Exception ex)
        {
            _consecutiveFailures++;
            await notificationPublisher.PublishAsync(
                new ExchangeRateFetchFailedNotification(
                    active.Metadata.Alias,
                    baseCurrency,
                    ex.Message,
                    _consecutiveFailures),
                cancellationToken);
            logger.LogWarning(ex, "Exchange rate refresh error for {ProviderAlias}", active.Metadata.Alias);
        }
    }
}
