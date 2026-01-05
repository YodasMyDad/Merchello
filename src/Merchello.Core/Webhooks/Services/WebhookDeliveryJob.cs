using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Webhooks.Services;

/// <summary>
/// Background service that processes pending webhook retries and cleans up old delivery logs.
/// </summary>
public class WebhookDeliveryJob(
    IServiceScopeFactory serviceScopeFactory,
    IOptions<WebhookSettings> options,
    ILogger<WebhookDeliveryJob> logger) : BackgroundService
{
    private readonly WebhookSettings _settings = options.Value;
    private readonly TimeSpan _initialDelay = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_settings.Enabled)
        {
            logger.LogInformation("WebhookDeliveryJob disabled, exiting");
            return;
        }

        logger.LogInformation("WebhookDeliveryJob started, waiting for database to be ready...");

        // Wait for migrations to complete before first run
        try
        {
            await Task.Delay(_initialDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        var interval = TimeSpan.FromSeconds(Math.Max(5, _settings.DeliveryIntervalSeconds));
        using var timer = new PeriodicTimer(interval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingRetriesAsync(stoppingToken);
            }
            catch (Exception ex) when (IsDatabaseNotReadyException(ex))
            {
                // Database not ready yet (migrations still running), silently skip this cycle
                logger.LogDebug("Database not ready yet, skipping webhook retry processing");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing webhook retries");
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

        logger.LogInformation("WebhookDeliveryJob stopped");
    }

    private static bool IsDatabaseNotReadyException(Exception ex)
    {
        // Check if this is a "table doesn't exist" error (migrations not yet complete)
        return ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) ||
               ex.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) ||
               ex.InnerException?.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) == true ||
               ex.InnerException?.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) == true;
    }

    private async Task ProcessPendingRetriesAsync(CancellationToken stoppingToken)
    {
        using var scope = serviceScopeFactory.CreateScope();
        var webhookService = scope.ServiceProvider.GetRequiredService<IWebhookService>();

        await webhookService.ProcessPendingRetriesAsync(stoppingToken);
    }
}
