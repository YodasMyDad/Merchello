using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Shared.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Services;

namespace Merchello.Core.Accounting.Services;

/// <summary>
/// Background service that sends payment reminder and overdue notifications for invoices.
/// Runs daily (configurable) to check for invoices needing reminders.
/// </summary>
public class InvoiceReminderJob(
    IServiceScopeFactory serviceScopeFactory,
    IOptions<InvoiceReminderSettings> settings,
    IRuntimeState runtimeState,
    ILogger<InvoiceReminderJob> logger) : BackgroundService
{
    private readonly InvoiceReminderSettings _settings = settings.Value;
    private readonly TimeSpan _initialDelay = TimeSpan.FromMinutes(5);

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
        => HostedServiceRuntimeGate.RunIsolatedAsync(ExecuteCoreAsync, stoppingToken);

    private async Task ExecuteCoreAsync(CancellationToken stoppingToken)
    {
        if (!await HostedServiceRuntimeGate.WaitForRunLevelAsync(
                runtimeState,
                logger,
                nameof(InvoiceReminderJob),
                stoppingToken))
        {
            return;
        }

        logger.LogInformation("InvoiceReminderJob started, waiting for database to be ready...");

        // Wait for migrations to complete before first check
        try
        {
            await Task.Delay(_initialDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        var checkInterval = TimeSpan.FromHours(_settings.CheckIntervalHours);
        using var timer = new PeriodicTimer(checkInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessInvoiceRemindersAsync(stoppingToken);
            }
            catch (Exception ex) when (IsDatabaseNotReadyException(ex))
            {
                logger.LogDebug("Database not ready yet, skipping invoice reminder check");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing invoice reminders");
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

        logger.LogInformation("InvoiceReminderJob stopped");
    }

    private static bool IsDatabaseNotReadyException(Exception ex)
    {
        return ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) ||
               ex.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) ||
               ex.InnerException?.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) == true ||
               ex.InnerException?.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) == true;
    }

    private async Task ProcessInvoiceRemindersAsync(CancellationToken stoppingToken)
    {
        using var scope = serviceScopeFactory.CreateScope();
        var reminderService = scope.ServiceProvider.GetRequiredService<IInvoiceReminderService>();

        var result = await reminderService.ProcessRemindersAsync(_settings, stoppingToken);

        if (result.DueSoonRemindersSent > 0 || result.OverdueRemindersSent > 0)
        {
            logger.LogInformation(
                "Invoice reminder job complete: {RemindersSent} due-soon reminders, {OverdueRemindersSent} overdue reminders sent",
                result.DueSoonRemindersSent, result.OverdueRemindersSent);
        }
    }
}
