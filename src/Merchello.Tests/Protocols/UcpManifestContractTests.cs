using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.UCP.Models;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

[Collection("Integration Tests")]
public class UcpManifestContractTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICommerceProtocolAdapter _adapter;

    public UcpManifestContractTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        _adapter = fixture.GetService<ICommerceProtocolAdapter>();
    }

    [Fact]
    public async Task Manifest_UsesTargetVersionAndAbsoluteHttpsEndpoint()
    {
        var manifest = await _adapter.GenerateManifestAsync() as UcpManifest;

        manifest.ShouldNotBeNull();
        manifest!.Ucp.Version.ShouldBe("2026-01-23");
        manifest.Ucp.Services.Shopping.Rest.Endpoint.ShouldNotBeNullOrWhiteSpace();

        Uri.TryCreate(manifest.Ucp.Services.Shopping.Rest.Endpoint, UriKind.Absolute, out var endpointUri).ShouldBeTrue();
        endpointUri!.Scheme.ShouldBe(Uri.UriSchemeHttps);
    }

    [Fact]
    public async Task Manifest_UsesCanonicalCapabilitySpecAndSchemaUrls()
    {
        var manifest = await _adapter.GenerateManifestAsync() as UcpManifest;

        manifest.ShouldNotBeNull();
        manifest!.Ucp.Capabilities.ShouldNotBeEmpty();

        foreach (var capability in manifest.Ucp.Capabilities)
        {
            capability.Spec.ShouldNotBeNullOrWhiteSpace();
            capability.Schema.ShouldNotBeNullOrWhiteSpace();
            capability.Spec.ShouldStartWith("https://ucp.dev/specification/");
            capability.Schema.ShouldStartWith("https://ucp.dev/schemas/");
        }
    }
}
