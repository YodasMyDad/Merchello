using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Shared.Services;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Services;

namespace Merchello.Core.Fulfilment.Services;

/// <summary>
/// Background service that polls fulfilment providers for order status updates.
/// Runs periodically to check for status changes on orders submitted to 3PLs.
/// Only polls providers that support polling and have orders in relevant statuses.
/// </summary>
public class FulfilmentPollingJob(
    IServiceScopeFactory serviceScopeFactory,
    IOptions<FulfilmentSettings> settings,
    IRuntimeState runtimeState,
    ILogger<FulfilmentPollingJob> logger) : BackgroundService
{
    private readonly FulfilmentSettings _settings = settings.Value;
    private readonly TimeSpan _initialDelay = TimeSpan.FromMinutes(3);

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
        => HostedServiceRuntimeGate.RunIsolatedAsync(ExecuteCoreAsync, stoppingToken);

    private async Task ExecuteCoreAsync(CancellationToken stoppingToken)
    {
        if (!await HostedServiceRuntimeGate.WaitForRunLevelAsync(
                runtimeState,
                logger,
                nameof(FulfilmentPollingJob),
                stoppingToken))
        {
            return;
        }

        logger.LogInformation("FulfilmentPollingJob started with {Interval} minute polling interval",
            _settings.PollingIntervalMinutes);

        // Wait for migrations to complete before first check
        try
        {
            await Task.Delay(_initialDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        var pollingInterval = TimeSpan.FromMinutes(_settings.PollingIntervalMinutes);
        using var timer = new PeriodicTimer(pollingInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PollAllProvidersAsync(stoppingToken);
            }
            catch (Exception ex) when (IsDatabaseNotReadyException(ex))
            {
                // Database not ready yet (migrations still running), silently skip this cycle
                logger.LogDebug("Database not ready yet, skipping fulfilment polling");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error during fulfilment status polling");
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

        logger.LogInformation("FulfilmentPollingJob stopped");
    }

    private static bool IsDatabaseNotReadyException(Exception ex)
    {
        // Check if this is a "table doesn't exist" error (migrations not yet complete)
        return ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) ||
               ex.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) ||
               ex.InnerException?.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) == true ||
               ex.InnerException?.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) == true;
    }

    private async Task PollAllProvidersAsync(CancellationToken stoppingToken)
    {
        using var scope = serviceScopeFactory.CreateScope();
        var providerManager = scope.ServiceProvider.GetRequiredService<IFulfilmentProviderManager>();
        var fulfilmentService = scope.ServiceProvider.GetRequiredService<IFulfilmentService>();

        // Get all enabled providers that support polling
        var providers = await providerManager.GetEnabledProvidersAsync(stoppingToken);
        var pollingProviders = providers
            .Where(p => p.Metadata.SupportsPolling && p.Configuration != null)
            .ToList();

        if (pollingProviders.Count == 0)
        {
            logger.LogDebug("No enabled fulfilment providers support polling, skipping cycle");
            return;
        }

        logger.LogDebug("Polling {Count} fulfilment providers for order status updates", pollingProviders.Count);

        foreach (var registeredProvider in pollingProviders)
        {
            if (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                await PollProviderAsync(registeredProvider, fulfilmentService, stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error polling provider {ProviderKey}", registeredProvider.Metadata.Key);
            }
        }
    }

    private async Task PollProviderAsync(
        RegisteredFulfilmentProvider registeredProvider,
        IFulfilmentService fulfilmentService,
        CancellationToken stoppingToken)
    {
        var providerKey = registeredProvider.Metadata.Key;
        var configId = registeredProvider.Configuration!.Id;

        // Get orders that need polling for this provider
        var orders = await fulfilmentService.GetOrdersForPollingAsync(configId, stoppingToken);

        if (orders.Count == 0)
        {
            logger.LogDebug("No orders to poll for provider {ProviderKey}", providerKey);
            return;
        }

        // Extract provider references
        var providerReferences = orders
            .Where(o => !string.IsNullOrEmpty(o.FulfilmentProviderReference))
            .Select(o => o.FulfilmentProviderReference!)
            .Distinct()
            .ToList();

        if (providerReferences.Count == 0)
        {
            return;
        }

        logger.LogDebug("Polling {Count} orders from provider {ProviderKey}", providerReferences.Count, providerKey);

        // Poll the provider
        var statusUpdates = await registeredProvider.Provider.PollOrderStatusAsync(providerReferences, stoppingToken);

        if (statusUpdates.Count == 0)
        {
            logger.LogDebug("No status updates from provider {ProviderKey}", providerKey);
            return;
        }

        logger.LogInformation("Received {Count} status updates from provider {ProviderKey}",
            statusUpdates.Count, providerKey);

        // Process each status update
        foreach (var update in statusUpdates)
        {
            if (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                var result = await fulfilmentService.ProcessStatusUpdateAsync(update, stoppingToken);

                if (result.Success)
                {
                    logger.LogDebug("Processed status update for order reference {Reference}: {Status}",
                        update.ProviderReference, update.MappedStatus);
                }
                else
                {
                    logger.LogWarning("Failed to process status update for reference {Reference}: {Errors}",
                        update.ProviderReference, string.Join(", ", result.Messages.Select(m => m.Message)));
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Exception processing status update for reference {Reference}",
                    update.ProviderReference);
            }
        }
    }
}
