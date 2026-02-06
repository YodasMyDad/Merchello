using System.Collections.Concurrent;
using System.Diagnostics;

namespace Merchello.Tests.TestInfrastructure;

/// <summary>
/// Utilities for testing concurrent operations and race conditions.
/// Useful for validating stock reservation, payment processing, and other operations
/// that must be thread-safe.
/// </summary>
public static class ConcurrentTestHelper
{
    /// <summary>
    /// Runs multiple operations concurrently and returns their results.
    /// Each operation receives an index (0 to concurrencyLevel-1).
    /// </summary>
    /// <typeparam name="TResult">Type of result returned by each operation</typeparam>
    /// <param name="concurrencyLevel">Number of concurrent operations to run</param>
    /// <param name="operation">Async operation to execute, receives operation index</param>
    /// <returns>List of results from all operations</returns>
    public static async Task<List<TResult>> RunConcurrentlyAsync<TResult>(
        int concurrencyLevel,
        Func<int, Task<TResult>> operation)
    {
        var tasks = Enumerable.Range(0, concurrencyLevel)
            .Select(i => Task.Run(() => operation(i)))
            .ToArray();

        return [.. await Task.WhenAll(tasks)];
    }

    /// <summary>
    /// Runs an operation multiple times concurrently and collects results in a thread-safe bag.
    /// </summary>
    /// <typeparam name="TResult">Type of result returned by each operation</typeparam>
    /// <param name="operationCount">Number of times to run the operation</param>
    /// <param name="operation">Async operation to execute</param>
    /// <returns>Thread-safe bag containing all results</returns>
    public static async Task<ConcurrentBag<TResult>> RunConcurrentOperationsAsync<TResult>(
        int operationCount,
        Func<Task<TResult>> operation)
    {
        var results = new ConcurrentBag<TResult>();
        List<Task> tasks = [];

        for (int i = 0; i < operationCount; i++)
        {
            tasks.Add(Task.Run(async () =>
            {
                var result = await operation();
                results.Add(result);
            }));
        }

        await Task.WhenAll(tasks);
        return results;
    }

    /// <summary>
    /// Measures the time taken to execute an operation.
    /// </summary>
    /// <typeparam name="TResult">Type of result returned by the operation</typeparam>
    /// <param name="operation">Async operation to measure</param>
    /// <returns>Tuple containing the result and elapsed time</returns>
    public static async Task<(TResult Result, TimeSpan Duration)> MeasureAsync<TResult>(
        Func<Task<TResult>> operation)
    {
        var stopwatch = Stopwatch.StartNew();
        var result = await operation();
        stopwatch.Stop();
        return (result, stopwatch.Elapsed);
    }

    /// <summary>
    /// Runs a stress test for a specified duration, counting completed operations.
    /// </summary>
    /// <param name="duration">How long to run the stress test</param>
    /// <param name="operation">Async operation to execute repeatedly</param>
    /// <returns>Number of operations completed within the duration</returns>
    public static async Task<int> StressTestAsync(
        TimeSpan duration,
        Func<Task> operation)
    {
        var stopwatch = Stopwatch.StartNew();
        int operationCount = 0;

        while (stopwatch.Elapsed < duration)
        {
            await operation();
            operationCount++;
        }

        return operationCount;
    }

    /// <summary>
    /// Runs concurrent stress test with multiple parallel executions for a specified duration.
    /// </summary>
    /// <param name="duration">How long to run the stress test</param>
    /// <param name="parallelism">Number of parallel operations to run simultaneously</param>
    /// <param name="operation">Async operation to execute</param>
    /// <returns>Total number of operations completed across all parallel executions</returns>
    public static async Task<int> ParallelStressTestAsync(
        TimeSpan duration,
        int parallelism,
        Func<Task> operation)
    {
        var cts = new CancellationTokenSource(duration);
        var operationCount = 0;

        var tasks = Enumerable.Range(0, parallelism)
            .Select(async _ =>
            {
                while (!cts.Token.IsCancellationRequested)
                {
                    try
                    {
                        await operation();
                        Interlocked.Increment(ref operationCount);
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }
                }
            });

        await Task.WhenAll(tasks);
        return operationCount;
    }

    /// <summary>
    /// Runs concurrent operations and tracks successes and failures separately.
    /// Useful for testing operations that should fail under contention (e.g., stock reservations).
    /// </summary>
    /// <param name="operationCount">Number of concurrent operations to run</param>
    /// <param name="operation">Async operation to execute</param>
    /// <returns>Tuple containing success count, failure count, and list of exceptions</returns>
    public static async Task<ConcurrentTestResult> RunWithResultTrackingAsync(
        int operationCount,
        Func<Task> operation)
    {
        var exceptions = new ConcurrentBag<Exception>();
        int successCount = 0;
        int failureCount = 0;

        var tasks = Enumerable.Range(0, operationCount)
            .Select(async _ =>
            {
                try
                {
                    await operation();
                    Interlocked.Increment(ref successCount);
                }
                catch (Exception ex)
                {
                    exceptions.Add(ex);
                    Interlocked.Increment(ref failureCount);
                }
            });

        await Task.WhenAll(tasks);
        return new ConcurrentTestResult(successCount, failureCount, [.. exceptions]);
    }

    /// <summary>
    /// Runs concurrent operations with a result predicate to determine success/failure.
    /// Useful when operations return a result object with success/failure indication.
    /// </summary>
    /// <typeparam name="TResult">Type of result returned by each operation</typeparam>
    /// <param name="operationCount">Number of concurrent operations to run</param>
    /// <param name="operation">Async operation to execute</param>
    /// <param name="isSuccess">Predicate to determine if a result represents success</param>
    /// <returns>Tuple containing success count, failure count, and all results</returns>
    public static async Task<ConcurrentTestResult<TResult>> RunWithResultTrackingAsync<TResult>(
        int operationCount,
        Func<Task<TResult>> operation,
        Func<TResult, bool> isSuccess)
    {
        var results = new ConcurrentBag<TResult>();
        int successCount = 0;
        int failureCount = 0;

        var tasks = Enumerable.Range(0, operationCount)
            .Select(async _ =>
            {
                var result = await operation();
                results.Add(result);

                if (isSuccess(result))
                    Interlocked.Increment(ref successCount);
                else
                    Interlocked.Increment(ref failureCount);
            });

        await Task.WhenAll(tasks);
        return new ConcurrentTestResult<TResult>(successCount, failureCount, [.. results]);
    }
}

