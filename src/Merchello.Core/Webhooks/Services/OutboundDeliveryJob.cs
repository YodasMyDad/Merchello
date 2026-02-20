using Merchello.Core.Data;
using Merchello.Core.Email;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Services.Interfaces;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Webhooks.Services;

/// <summary>
/// Background service that processes pending outbound delivery retries (webhooks and emails)
/// and cleans up old delivery logs.
/// </summary>
public class OutboundDeliveryJob(
    IServiceScopeFactory serviceScopeFactory,
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ISeedDataInstallationState seedDataInstallationState,
    IOptions<WebhookSettings> webhookOptions,
    IOptions<EmailSettings> emailOptions,
    Umbraco.Cms.Core.Services.IRuntimeState runtimeState,
    ILogger<OutboundDeliveryJob> logger) : BackgroundService
{
    private readonly WebhookSettings _webhookSettings = webhookOptions.Value;
    private readonly EmailSettings _emailSettings = emailOptions.Value;
    private readonly TimeSpan _initialDelay = TimeSpan.FromSeconds(30);
    private const int SqliteLockRetryAttempts = 4;

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

        var interval = TimeSpan.FromSeconds(Math.Max(5, _webhookSettings.DeliveryIntervalSeconds));
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
                    await HostedServiceRuntimeGate.ExecuteWithSqliteLockRetryAsync(
                        () => ProcessPendingRetriesAsync(stoppingToken),
                        logger,
                        "outbound delivery retry processing",
                        stoppingToken);
                    await HostedServiceRuntimeGate.ExecuteWithSqliteLockRetryAsync(
                        () => CleanupOldDeliveriesAsync(stoppingToken),
                        logger,
                        "outbound delivery cleanup",
                        stoppingToken);
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

    private async Task CleanupOldDeliveriesAsync(CancellationToken stoppingToken)
    {
        var activeStatuses = new[]
        {
            OutboundDeliveryStatus.Pending,
            OutboundDeliveryStatus.Retrying,
            OutboundDeliveryStatus.Sending
        };

        var now = DateTime.UtcNow;
        var webhookRetentionDays = Math.Max(1, _webhookSettings.DeliveryLogRetentionDays);
        var emailRetentionDays = Math.Max(1, _emailSettings.DeliveryRetentionDays);
        var webhookCutoff = now.AddDays(-webhookRetentionDays);
        var emailCutoff = now.AddDays(-emailRetentionDays);

        var (deletedWebhookRows, deletedEmailRows) = await ExecuteWithSqliteLockRetryAsync(async () =>
        {
            using var scope = efCoreScopeProvider.CreateScope();
            var deletedWebhookRows = await scope.ExecuteWithContextAsync(async db =>
                await db.OutboundDeliveries
                    .Where(d => d.DeliveryType == OutboundDeliveryType.Webhook &&
                                d.DateCreated < webhookCutoff &&
                                !activeStatuses.Contains(d.Status))
                    .ExecuteDeleteAsync(stoppingToken));

            var deletedEmailRows = await scope.ExecuteWithContextAsync(async db =>
                await db.OutboundDeliveries
                    .Where(d => d.DeliveryType == OutboundDeliveryType.Email &&
                                d.DateCreated < emailCutoff &&
                                !activeStatuses.Contains(d.Status))
                    .ExecuteDeleteAsync(stoppingToken));
            scope.Complete();
            return (deletedWebhookRows, deletedEmailRows);
        }, stoppingToken);

        if (deletedWebhookRows > 0 || deletedEmailRows > 0)
        {
            logger.LogInformation(
                "Cleaned up outbound deliveries: {WebhookCount} webhook rows older than {WebhookRetentionDays}d, {EmailCount} email rows older than {EmailRetentionDays}d",
                deletedWebhookRows,
                webhookRetentionDays,
                deletedEmailRows,
                emailRetentionDays);
        }
    }

    private async Task<T> ExecuteWithSqliteLockRetryAsync<T>(
        Func<Task<T>> operation,
        CancellationToken cancellationToken)
    {
        for (var attempt = 1; ; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                return await operation();
            }
            catch (Exception ex) when (IsTransientSqliteLockException(ex) && attempt < SqliteLockRetryAttempts)
            {
                var delay = GetSqliteLockRetryDelay(attempt);
                logger.LogWarning(
                    ex,
                    "SQLite lock contention during outbound delivery cleanup (attempt {Attempt}/{MaxAttempts}). Retrying in {DelayMs}ms.",
                    attempt,
                    SqliteLockRetryAttempts,
                    (int)delay.TotalMilliseconds);
                await Task.Delay(delay, cancellationToken);
            }
        }
    }

    private static bool IsTransientSqliteLockException(Exception exception)
    {
        if (exception is DbUpdateException dbUpdateException &&
            dbUpdateException.InnerException is SqliteException dbUpdateSqliteException)
        {
            return dbUpdateSqliteException.SqliteErrorCode is 5 or 6 ||
                   dbUpdateSqliteException.Message.Contains("database is locked", StringComparison.OrdinalIgnoreCase) ||
                   dbUpdateSqliteException.Message.Contains("database table is locked", StringComparison.OrdinalIgnoreCase);
        }

        if (exception is SqliteException sqliteException)
        {
            return sqliteException.SqliteErrorCode is 5 or 6 ||
                   sqliteException.Message.Contains("database is locked", StringComparison.OrdinalIgnoreCase) ||
                   sqliteException.Message.Contains("database table is locked", StringComparison.OrdinalIgnoreCase);
        }

        return exception.InnerException is not null && IsTransientSqliteLockException(exception.InnerException);
    }

    private static TimeSpan GetSqliteLockRetryDelay(int attempt)
        => TimeSpan.FromMilliseconds(Math.Min(1200, 200 * attempt));
}
