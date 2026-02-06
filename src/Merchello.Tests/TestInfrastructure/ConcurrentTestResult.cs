namespace Merchello.Tests.TestInfrastructure;

/// <summary>
/// Result of a concurrent test execution.
/// </summary>
public record ConcurrentTestResult(int SuccessCount, int FailureCount, List<Exception> Exceptions)
{
    public int TotalCount => SuccessCount + FailureCount;
}
