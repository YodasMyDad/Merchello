using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shared.Services;
using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Webhooks.Services;

/// <summary>
/// Background service that processes pending outbound delivery retries (webhooks and emails)
/// and cleans up old delivery logs.
/// </summary>
public class OutboundDeliveryJob(
    IServiceScopeFactory serviceScopeFactory,
    ISeedDataInstallationState seedDataInstallationState,
    IOptions<WebhookSettings> options,
    Umbraco.Cms.Core.Services.IRuntimeState runtimeState,
    ILogger<OutboundDeliveryJob> logger) : BackgroundService
{
    private readonly WebhookSettings _settings = options.Value;
    private readonly TimeSpan _initialDelay = TimeSpan.FromSeconds(30);

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
        => HostedServiceRuntimeGate.RunIsolatedAsync(ExecuteCoreAsync, stoppingToken);

    private async Task ExecuteCoreAsync(CancellationToken stoppingToken)
    {
        if (!await HostedServiceRuntimeGate.WaitForRunLevelAsync(
                runtimeState,
                logger,
                nameof(OutboundDeliveryJob),
                stoppingToken))
        {
            return;
        }

        logger.LogInformation("OutboundDeliveryJob started, waiting for database to be ready...");

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
                if (seedDataInstallationState.IsInstalling)
                {
                    logger.LogDebug("Seed data installation in progress, skipping outbound delivery retry processing");
                }
                else
                {
                    await ProcessPendingRetriesAsync(stoppingToken);
                }
            }
            catch (Exception ex) when (IsDatabaseNotReadyException(ex))
            {
                // Database not ready yet (migrations still running), silently skip this cycle
                logger.LogDebug("Database not ready yet, skipping outbound delivery retry processing");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing outbound delivery retries");
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

        logger.LogInformation("OutboundDeliveryJob stopped");
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

        // Process webhook retries
        var webhookService = scope.ServiceProvider.GetRequiredService<IWebhookService>();
        await webhookService.ProcessPendingRetriesAsync(stoppingToken);

        // Process email retries
        var emailService = scope.ServiceProvider.GetService<IEmailService>();
        if (emailService != null)
        {
            await emailService.ProcessPendingRetriesAsync(stoppingToken);
        }
    }
}
