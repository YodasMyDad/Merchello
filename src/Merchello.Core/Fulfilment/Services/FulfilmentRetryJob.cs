using Merchello.Core.Fulfilment.Notifications;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Notifications.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Fulfilment.Services;

/// <summary>
/// Background service that retries failed fulfilment submissions.
/// Runs periodically to check for orders that need retry and submits them to their configured 3PL.
/// </summary>
public class FulfilmentRetryJob(
    IServiceScopeFactory serviceScopeFactory,
    IOptions<FulfilmentSettings> settings,
    ILogger<FulfilmentRetryJob> logger) : BackgroundService
{
    private readonly FulfilmentSettings _settings = settings.Value;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);
    private readonly TimeSpan _initialDelay = TimeSpan.FromMinutes(2);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_settings.Enabled)
        {
            logger.LogInformation("FulfilmentRetryJob disabled - fulfilment system is not enabled");
            return;
        }

        logger.LogInformation("FulfilmentRetryJob started, waiting for database to be ready...");

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
                await ProcessRetryQueueAsync(stoppingToken);
            }
            catch (Exception ex) when (IsDatabaseNotReadyException(ex))
            {
                // Database not ready yet (migrations still running), silently skip this cycle
                logger.LogDebug("Database not ready yet, skipping fulfilment retry check");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing fulfilment retry queue");
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

        logger.LogInformation("FulfilmentRetryJob stopped");
    }

    private static bool IsDatabaseNotReadyException(Exception ex)
    {
        // Check if this is a "table doesn't exist" error (migrations not yet complete)
        return ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) ||
               ex.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) ||
               ex.InnerException?.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) == true ||
               ex.InnerException?.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) == true;
    }

    private async Task ProcessRetryQueueAsync(CancellationToken stoppingToken)
    {
        using var scope = serviceScopeFactory.CreateScope();
        var fulfilmentService = scope.ServiceProvider.GetRequiredService<IFulfilmentService>();
        var notificationPublisher = scope.ServiceProvider.GetRequiredService<IMerchelloNotificationPublisher>();

        // Get orders ready for retry
        var ordersToRetry = await fulfilmentService.GetOrdersReadyForRetryAsync(stoppingToken);

        if (ordersToRetry.Count == 0)
        {
            return;
        }

        logger.LogInformation("Found {Count} orders ready for fulfilment retry", ordersToRetry.Count);

        foreach (var order in ordersToRetry)
        {
            if (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                logger.LogInformation("Retrying fulfilment submission for order {OrderId} (attempt {Attempt}/{MaxAttempts})",
                    order.Id, order.FulfilmentRetryCount + 1, _settings.MaxRetryAttempts);

                var result = await fulfilmentService.SubmitOrderAsync(order.Id, stoppingToken);

                if (result.Successful && !string.IsNullOrEmpty(result.ResultObject?.FulfilmentProviderReference))
                {
                    logger.LogInformation("Fulfilment retry successful for order {OrderId}. Reference: {Reference}",
                        order.Id, result.ResultObject.FulfilmentProviderReference);

                    // Resolve provider config for notification
                    var providerConfig = await fulfilmentService.ResolveProviderForWarehouseAsync(
                        order.WarehouseId, stoppingToken);

                    if (providerConfig != null)
                    {
                        await notificationPublisher.PublishAsync(
                            new FulfilmentSubmittedNotification(result.ResultObject, providerConfig),
                            stoppingToken);
                    }
                }
                else if (result.ResultObject?.Status == Accounting.Models.OrderStatus.FulfilmentFailed)
                {
                    logger.LogError("Fulfilment retry failed for order {OrderId} after {RetryCount} attempts. Max retries exceeded.",
                        order.Id, result.ResultObject.FulfilmentRetryCount);

                    // Resolve provider config for notification
                    var providerConfig = await fulfilmentService.ResolveProviderForWarehouseAsync(
                        order.WarehouseId, stoppingToken);

                    if (providerConfig != null)
                    {
                        await notificationPublisher.PublishAsync(
                            new FulfilmentSubmissionFailedNotification(
                                result.ResultObject,
                                providerConfig,
                                result.ResultObject.FulfilmentErrorMessage ?? "Unknown error"),
                            stoppingToken);
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Exception during fulfilment retry for order {OrderId}", order.Id);
            }
        }
    }
}
