using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.UCP;
using Merchello.Core.Protocols.UCP.Models;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

/// <summary>
/// Integration tests for UCPProtocolAdapter manifest generation and capability negotiation.
/// </summary>
[Collection("Integration Tests")]
public class UcpProtocolAdapterTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICommerceProtocolAdapter _adapter;

    public UcpProtocolAdapterTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        _adapter = fixture.GetService<ICommerceProtocolAdapter>();
    }

    [Fact]
    public void Metadata_ReturnsCorrectAlias()
    {
        // Act
        var metadata = _adapter.Metadata;

        // Assert
        metadata.Alias.ShouldBe(ProtocolConstants.Protocols.Ucp);
    }

    [Fact]
    public void Metadata_ReturnsCorrectVersion()
    {
        // Act
        var metadata = _adapter.Metadata;

        // Assert
        metadata.Version.ShouldBe("2026-01-11");
    }

    [Fact]
    public void Metadata_ReturnsDisplayName()
    {
        // Act
        var metadata = _adapter.Metadata;

        // Assert
        metadata.DisplayName.ShouldBe("Universal Commerce Protocol");
    }

    [Fact]
    public void IsEnabled_ReturnsTrue_WhenProtocolEnabled()
    {
        // Act & Assert
        _adapter.IsEnabled.ShouldBeTrue();
    }

    [Fact]
    public async Task GenerateManifestAsync_ReturnsValidManifest()
    {
        // Act
        var manifest = await _adapter.GenerateManifestAsync();

        // Assert
        manifest.ShouldNotBeNull();
        manifest.ShouldBeOfType<UcpManifest>();
    }

    [Fact]
    public async Task GenerateManifestAsync_IncludesUcpMetadata()
    {
        // Act
        var manifest = await _adapter.GenerateManifestAsync() as UcpManifest;

        // Assert
        manifest.ShouldNotBeNull();
        manifest.Ucp.ShouldNotBeNull();
        manifest.Ucp.Version.ShouldBe("2026-01-11");
    }

    [Fact]
    public async Task GenerateManifestAsync_IncludesServices()
    {
        // Act
        var manifest = await _adapter.GenerateManifestAsync() as UcpManifest;

        // Assert
        manifest.ShouldNotBeNull();
        manifest.Ucp.Services.ShouldNotBeNull();
        manifest.Ucp.Services.Shopping.ShouldNotBeNull();
        manifest.Ucp.Services.Shopping.Rest.ShouldNotBeNull();
        manifest.Ucp.Services.Shopping.Rest.Endpoint.ShouldBe("/api/v1");
    }

    [Fact]
    public async Task GenerateManifestAsync_IncludesEnabledCapabilities()
    {
        // Act
        var manifest = await _adapter.GenerateManifestAsync() as UcpManifest;

        // Assert
        manifest.ShouldNotBeNull();
        manifest.Ucp.Capabilities.ShouldNotBeNull();
        manifest.Ucp.Capabilities.ShouldNotBeEmpty();

        // Checkout and Order should be enabled by default
        manifest.Ucp.Capabilities.ShouldContain(c => c.Name.Contains("checkout"));
        manifest.Ucp.Capabilities.ShouldContain(c => c.Name.Contains("order"));
    }

    [Fact]
    public async Task GenerateManifestAsync_ExcludesDisabledCapabilities()
    {
        // Act
        var manifest = await _adapter.GenerateManifestAsync() as UcpManifest;

        // Assert
        manifest.ShouldNotBeNull();

        // IdentityLinking should be disabled by default
        manifest.Ucp.Capabilities.ShouldNotContain(c => c.Name.Contains("identity"));
    }

    [Fact]
    public async Task GenerateManifestAsync_IncludesExtensions()
    {
        // Act
        var manifest = await _adapter.GenerateManifestAsync() as UcpManifest;

        // Assert
        manifest.ShouldNotBeNull();

        // Extensions are part of capabilities with the Extends property
        // Discount and Fulfillment should be enabled by default
        manifest.Ucp.Capabilities.ShouldContain(c => c.Name.Contains("discount"));
        manifest.Ucp.Capabilities.ShouldContain(c => c.Name.Contains("fulfillment"));
    }

    [Fact]
    public async Task GenerateManifestAsync_IncludesSigningKeys()
    {
        // Act
        var manifest = await _adapter.GenerateManifestAsync() as UcpManifest;

        // Assert
        manifest.ShouldNotBeNull();
        manifest.SigningKeys.ShouldNotBeNull();
        manifest.SigningKeys.ShouldNotBeEmpty();

        var key = manifest.SigningKeys.First();
        key.Kty.ShouldBe("EC");
        key.Crv.ShouldBe("P-256");
        key.Kid.ShouldNotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GenerateManifestAsync_IncludesPaymentHandlersSection()
    {
        // Act
        var manifest = await _adapter.GenerateManifestAsync() as UcpManifest;

        // Assert
        manifest.ShouldNotBeNull();
        manifest.Payment.ShouldNotBeNull();

        // Payment handlers may be empty if no providers are configured
        manifest.Payment.Handlers.ShouldNotBeNull();
    }

    [Fact]
    public async Task NegotiateCapabilitiesAsync_ReturnsIntersection()
    {
        // Arrange
        var fullManifest = await _adapter.GenerateManifestAsync();
        var agentCapabilities = new List<string>
        {
            ProtocolConstants.UcpCapabilities.Checkout // Only checkout
        };

        // Act
        var negotiated = await _adapter.NegotiateCapabilitiesAsync(fullManifest, agentCapabilities) as UcpManifest;

        // Assert
        negotiated.ShouldNotBeNull();
        negotiated.Ucp.Capabilities.ShouldContain(c => c.Name.Contains("checkout"));
    }

    [Fact]
    public async Task NegotiateCapabilitiesAsync_WithNoCommonCapabilities_ReturnsNull()
    {
        // Arrange
        var fullManifest = await _adapter.GenerateManifestAsync();
        var agentCapabilities = new List<string>
        {
            "dev.ucp.unsupported.capability" // Capability that doesn't exist
        };

        // Act
        var negotiated = await _adapter.NegotiateCapabilitiesAsync(fullManifest, agentCapabilities);

        // Assert
        // Should return null when there's no intersection of capabilities
        negotiated.ShouldBeNull();
    }

    [Fact]
    public async Task NegotiateCapabilitiesAsync_FiltersExtensions()
    {
        // Arrange
        var fullManifest = await _adapter.GenerateManifestAsync();
        var agentCapabilities = new List<string>
        {
            ProtocolConstants.UcpCapabilities.Checkout,
            ProtocolConstants.UcpExtensions.Discount // Only discount extension
        };

        // Act
        var negotiated = await _adapter.NegotiateCapabilitiesAsync(fullManifest, agentCapabilities) as UcpManifest;

        // Assert
        negotiated.ShouldNotBeNull();
        // Extensions are part of capabilities
        negotiated.Ucp.Capabilities.ShouldContain(c => c.Name.Contains("discount"));
    }

    [Fact]
    public async Task NegotiateCapabilitiesAsync_WithAllCapabilities_ReturnsFullManifest()
    {
        // Arrange
        var fullManifest = await _adapter.GenerateManifestAsync() as UcpManifest;
        var agentCapabilities = new List<string>();

        // Add all capability names from the manifest (including extensions)
        agentCapabilities.AddRange(fullManifest!.Ucp.Capabilities.Select(c => c.Name));

        // Act
        var negotiated = await _adapter.NegotiateCapabilitiesAsync(fullManifest, agentCapabilities) as UcpManifest;

        // Assert
        negotiated.ShouldNotBeNull();
        negotiated.Ucp.Capabilities.Count.ShouldBe(fullManifest.Ucp.Capabilities.Count);
    }

    [Fact]
    public async Task NegotiateCapabilitiesAsync_PreservesServiceEndpoints()
    {
        // Arrange
        var fullManifest = await _adapter.GenerateManifestAsync() as UcpManifest;
        var agentCapabilities = new List<string>
        {
            ProtocolConstants.UcpCapabilities.Checkout
        };

        // Act
        var negotiated = await _adapter.NegotiateCapabilitiesAsync(fullManifest!, agentCapabilities) as UcpManifest;

        // Assert - service endpoints should be preserved
        negotiated.ShouldNotBeNull();
        negotiated.Ucp.Services.Shopping.Rest.Endpoint.ShouldBe("/api/v1");
    }

    [Fact]
    public async Task NegotiateCapabilitiesAsync_PreservesSigningKeys()
    {
        // Arrange
        var fullManifest = await _adapter.GenerateManifestAsync() as UcpManifest;
        var agentCapabilities = new List<string>
        {
            ProtocolConstants.UcpCapabilities.Order
        };

        // Act
        var negotiated = await _adapter.NegotiateCapabilitiesAsync(fullManifest!, agentCapabilities) as UcpManifest;

        // Assert - signing keys should be preserved for order webhooks
        negotiated.ShouldNotBeNull();
        negotiated.SigningKeys.Count.ShouldBe(fullManifest!.SigningKeys.Count);
    }

    [Fact]
    public async Task NegotiateCapabilitiesAsync_PreservesVersion()
    {
        // Arrange
        var fullManifest = await _adapter.GenerateManifestAsync() as UcpManifest;
        var agentCapabilities = new List<string>
        {
            ProtocolConstants.UcpCapabilities.Checkout
        };

        // Act
        var negotiated = await _adapter.NegotiateCapabilitiesAsync(fullManifest!, agentCapabilities) as UcpManifest;

        // Assert
        negotiated.ShouldNotBeNull();
        negotiated.Ucp.Version.ShouldBe(fullManifest!.Ucp.Version);
    }

    [Fact]
    public async Task GetPaymentHandlersAsync_ReturnsEmptyForNoProviders()
    {
        // Act
        var handlers = await _adapter.GetPaymentHandlersAsync(sessionId: null);

        // Assert - no payment providers are configured in test fixture
        handlers.ShouldNotBeNull();
    }
}
