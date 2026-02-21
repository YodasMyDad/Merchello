using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Services;

namespace Merchello.Core.Shared.Services;

/// <summary>
/// Helper for hosted services that must not execute before Umbraco reaches RuntimeLevel.Run.
/// </summary>
public static class HostedServiceRuntimeGate
{
    private const int DefaultSqliteLockRetryAttempts = 4;

    /// <summary>
    /// Executes a hosted service loop with ambient execution-context flow suppressed.
    /// This prevents AsyncLocal scope state from leaking across background workers.
    /// </summary>
    public static Task RunIsolatedAsync(
        Func<CancellationToken, Task> run,
        CancellationToken cancellationToken)
    {
        using (ExecutionContext.SuppressFlow())
        {
            return run(cancellationToken);
        }
    }

    /// <summary>
    /// Waits until Umbraco runtime level is Run, or returns false if cancellation is requested first.
    /// </summary>
    public static async Task<bool> WaitForRunLevelAsync(
        IRuntimeState runtimeState,
        ILogger logger,
        string serviceName,
        CancellationToken cancellationToken)
    {
        if (runtimeState.Level == RuntimeLevel.Run)
        {
            return true;
        }

        logger.LogInformation(
            "{ServiceName} waiting for Umbraco runtime level Run (current: {RuntimeLevel})",
            serviceName,
            runtimeState.Level);

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(2));

        while (!cancellationToken.IsCancellationRequested)
        {
            if (runtimeState.Level == RuntimeLevel.Run)
            {
                logger.LogInformation("{ServiceName} detected runtime level Run", serviceName);
                return true;
            }

            try
            {
                await timer.WaitForNextTickAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                return false;
            }
        }

        return false;
    }

    /// <summary>
    /// Executes an operation and retries transient SQLite lock failures.
    /// For non-SQLite providers, exceptions flow through without retry.
    /// </summary>
    public static async Task ExecuteWithSqliteLockRetryAsync(
        Func<Task> operation,
        ILogger logger,
        string operationName,
        CancellationToken cancellationToken,
        int maxAttempts = DefaultSqliteLockRetryAttempts)
    {
        await ExecuteWithSqliteLockRetryAsync(
            async () =>
            {
                await operation();
                return true;
            },
            logger,
            operationName,
            cancellationToken,
            maxAttempts);
    }

    /// <summary>
    /// Executes an operation and retries transient SQLite lock failures.
    /// For non-SQLite providers, exceptions flow through without retry.
    /// </summary>
    public static async Task<T> ExecuteWithSqliteLockRetryAsync<T>(
        Func<Task<T>> operation,
        ILogger logger,
        string operationName,
        CancellationToken cancellationToken,
        int maxAttempts = DefaultSqliteLockRetryAttempts)
    {
        var attempts = Math.Max(1, maxAttempts);

        for (var attempt = 1; ; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                return await operation();
            }
            catch (Exception ex) when (IsTransientSqliteLockException(ex) && attempt < attempts)
            {
                var delay = GetSqliteLockRetryDelay(attempt);
                logger.LogWarning(
                    ex,
                    "SQLite lock contention during {OperationName} (attempt {Attempt}/{MaxAttempts}). Retrying in {DelayMs}ms.",
                    operationName,
                    attempt,
                    attempts,
                    (int)delay.TotalMilliseconds);
                await Task.Delay(delay, cancellationToken);
            }
        }
    }

    public static bool IsTransientSqliteLockException(Exception exception)
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
        => TimeSpan.FromMilliseconds(Math.Min(1200, 200 * Math.Max(1, attempt)));
}
