namespace Merchello.Tests.TestInfrastructure;

/// <summary>
/// Result of a concurrent test execution with typed results.
/// </summary>
public record ConcurrentTestResult<TResult>(int SuccessCount, int FailureCount, List<TResult> Results)
{
    public int TotalCount => SuccessCount + FailureCount;
}
