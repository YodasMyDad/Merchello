using System.Collections.Concurrent;
using System.Diagnostics;

namespace Merchello.Tests.TestInfrastructure;

/// <summary>
/// Helper for running concurrent test operations
/// </summary>
public static class ConcurrentTestHelper
{
    /// <summary>
    /// Runs multiple tasks concurrently and returns their results
    /// </summary>
    public static async Task<List<TResult>> RunConcurrentlyAsync<TResult>(
        int concurrencyLevel,
        Func<int, Task<TResult>> operation)
    {
        var tasks = Enumerable.Range(0, concurrencyLevel)
            .Select(i => Task.Run(() => operation(i)))
            .ToArray();

        return (await Task.WhenAll(tasks)).ToList();
    }

    /// <summary>
    /// Runs an operation multiple times concurrently and collects results
    /// </summary>
    public static async Task<ConcurrentBag<TResult>> RunConcurrentOperationsAsync<TResult>(
        int operationCount,
        Func<Task<TResult>> operation)
    {
        var results = new ConcurrentBag<TResult>();
        var tasks = new List<Task>();

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
    /// Measures the time taken to execute an operation
    /// </summary>
    public static async Task<(TResult result, TimeSpan duration)> MeasureAsync<TResult>(
        Func<Task<TResult>> operation)
    {
        var stopwatch = Stopwatch.StartNew();
        var result = await operation();
        stopwatch.Stop();
        return (result, stopwatch.Elapsed);
    }

    /// <summary>
    /// Runs a stress test with specified duration
    /// </summary>
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
    /// Runs concurrent operations and tracks successes and failures
    /// </summary>
    public static async Task<(int successCount, int failureCount, List<Exception> exceptions)>
        RunWithResultTrackingAsync(
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
        return (successCount, failureCount, exceptions.ToList());
    }
}

