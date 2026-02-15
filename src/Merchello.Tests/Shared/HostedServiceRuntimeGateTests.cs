using Merchello.Core.Shared.Services;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shared;

public class HostedServiceRuntimeGateTests
{
    [Fact]
    public async Task RunIsolatedAsync_DoesNotFlowAsyncLocalAcrossAsyncBoundary()
    {
        var ambient = new AsyncLocal<string?> { Value = "ambient-value" };
        string? observed = null;

        await HostedServiceRuntimeGate.RunIsolatedAsync(async _ =>
        {
            await Task.Yield();
            observed = ambient.Value;
        }, CancellationToken.None);

        observed.ShouldBeNull();
        ambient.Value.ShouldBe("ambient-value");
    }
}
