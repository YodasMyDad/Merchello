using System.Reflection;
using Merchello;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Interfaces;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

public class ProtocolAdapterDiscoveryIntegrationTests
{
    [Fact]
    public void DiscoverProviderAssemblies_IncludesExternalAssemblyWithProtocolAdapter()
    {
        var discoverMethod = typeof(Startup).GetMethod(
            "DiscoverProviderAssemblies",
            BindingFlags.Static | BindingFlags.NonPublic);
        discoverMethod.ShouldNotBeNull();

        var discovered = discoverMethod!
            .Invoke(null, null) as IEnumerable<Assembly>;
        discovered.ShouldNotBeNull();

        discovered!.ShouldContain(typeof(TestExternalProtocolAdapter).Assembly);
        discovered.ShouldContain(a => a.GetExportedTypes()
            .Any(t => typeof(ICommerceProtocolAdapter).IsAssignableFrom(t) &&
                      t.IsClass &&
                      !t.IsAbstract &&
                      t == typeof(TestExternalProtocolAdapter)));
    }

    // This public adapter type lives in the test assembly to emulate a third-party plugin assembly.
    public class TestExternalProtocolAdapter : ICommerceProtocolAdapter
    {
        public CommerceProtocolAdapterMetadata Metadata => new(
            Alias: "test-external",
            DisplayName: "Test External Adapter",
            Version: "1.0.0",
            Icon: "icon-test",
            Description: "External adapter for startup discovery test",
            SupportsIdentityLinking: false,
            SupportsOrderWebhooks: false);

        public bool IsEnabled => true;

        public Task<object> GenerateManifestAsync(CancellationToken ct = default) =>
            Task.FromResult<object>(new { });

        public Task<ProtocolResponse> CreateSessionAsync(object request, AgentIdentity? agentIdentity, CancellationToken ct = default) =>
            Task.FromResult(ProtocolResponse.Ok(new { }));

        public Task<ProtocolResponse> GetSessionAsync(string sessionId, AgentIdentity? agentIdentity, CancellationToken ct = default) =>
            Task.FromResult(ProtocolResponse.Ok(new { }));

        public Task<ProtocolResponse> UpdateSessionAsync(string sessionId, object request, AgentIdentity? agentIdentity, CancellationToken ct = default) =>
            Task.FromResult(ProtocolResponse.Ok(new { }));

        public Task<ProtocolResponse> CompleteSessionAsync(string sessionId, object paymentData, AgentIdentity? agentIdentity, CancellationToken ct = default) =>
            Task.FromResult(ProtocolResponse.Ok(new { }));

        public Task<ProtocolResponse> CancelSessionAsync(string sessionId, AgentIdentity? agentIdentity, CancellationToken ct = default) =>
            Task.FromResult(ProtocolResponse.Ok(new { }));

        public Task<ProtocolResponse> GetOrderAsync(string orderId, AgentIdentity? agentIdentity, CancellationToken ct = default) =>
            Task.FromResult(ProtocolResponse.Ok(new { }));

        public Task<object> GetPaymentHandlersAsync(string? sessionId, CancellationToken ct = default) =>
            Task.FromResult<object>(Array.Empty<object>());

        public Task<object?> NegotiateCapabilitiesAsync(object fullManifest, IReadOnlyList<string> agentCapabilities, CancellationToken ct = default) =>
            Task.FromResult<object?>(fullManifest);
    }
}
