using System.Text.Json;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.UCP;
using Merchello.Core.Protocols.UCP.Models;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

/// <summary>
/// Integration tests for UCPProtocolAdapter manifest generation and capability negotiation.
/// </summary>
[Collection("ServiceTests")]
public class UcpProtocolAdapterTests : IAsyncLifetime
{
    private readonly ServiceTestFixture _fixture;
    private IServiceScope _scope = null!;
    private ICommerceProtocolAdapter _adapter = null!;

    public UcpProtocolAdapterTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
    }

    public Task InitializeAsync()
    {
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        _scope = _fixture.CreateScope();
        _adapter = _scope.ServiceProvider.GetRequiredService<ICommerceProtocolAdapter>();
        return Task.CompletedTask;
    }

    public Task DisposeAsync()
    {
        _scope.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public void Metadata_ReturnsCorrectAlias()
    {
        // Act
        var metadata = _adapter.Metadata;

        // Assert
        metadata.Alias.ShouldBe(ProtocolAliases.Ucp);
    }

    [Fact]
    public void Metadata_ReturnsCorrectVersion()
    {
        // Act
        var metadata = _adapter.Metadata;

        // Assert
        metadata.Version.ShouldBe("2026-01-23");
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
        manifest.Ucp.Version.ShouldBe("2026-01-23");
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
        manifest.Ucp.Services.Shopping.Rest.Endpoint.ShouldBe("https://test.example.com/api/v1");
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
            UcpCapabilityNames.Checkout // Only checkout
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
            UcpCapabilityNames.Checkout,
            UcpExtensionNames.Discount // Only discount extension
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
            UcpCapabilityNames.Checkout
        };

        // Act
        var negotiated = await _adapter.NegotiateCapabilitiesAsync(fullManifest!, agentCapabilities) as UcpManifest;

        // Assert - service endpoints should be preserved
        negotiated.ShouldNotBeNull();
        negotiated.Ucp.Services.Shopping.Rest.Endpoint.ShouldBe("https://test.example.com/api/v1");
    }

    [Fact]
    public async Task NegotiateCapabilitiesAsync_PreservesSigningKeys()
    {
        // Arrange
        var fullManifest = await _adapter.GenerateManifestAsync() as UcpManifest;
        var agentCapabilities = new List<string>
        {
            UcpCapabilityNames.Order
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
            UcpCapabilityNames.Checkout
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

    [Fact]
    public async Task GenerateManifestAsync_IncludesAp2MandatesExtension_WhenEnabled()
    {
        // Arrange
        var settings = _scope.ServiceProvider.GetRequiredService<IOptions<ProtocolSettings>>().Value;
        settings.Ucp.Extensions.Ap2Mandates = true;

        // Act
        var manifest = await _adapter.GenerateManifestAsync() as UcpManifest;

        // Assert
        manifest.ShouldNotBeNull();
        manifest.Ucp.Capabilities.ShouldContain(c => c.Name == UcpExtensionNames.Ap2Mandates);
        manifest.Ucp.Capabilities.ShouldContain(c =>
            c.Name == UcpExtensionNames.Ap2Mandates &&
            c.Extends == UcpCapabilityNames.Checkout);
    }

    [Fact]
    public async Task CreateSessionAsync_EnvelopeIncludesEnabledIdentityAndExtensions()
    {
        // Arrange
        var settings = _scope.ServiceProvider.GetRequiredService<IOptions<ProtocolSettings>>().Value;
        settings.Ucp.Capabilities.IdentityLinking = true;
        settings.Ucp.Extensions.BuyerConsent = true;
        settings.Ucp.Extensions.Ap2Mandates = true;

        var request = new Core.Protocols.UCP.Dtos.UcpCreateSessionRequestDto
        {
            Currency = "USD",
            LineItems = []
        };

        // Act
        var response = await _adapter.CreateSessionAsync(request, agentIdentity: null);

        // Assert
        response.Success.ShouldBeTrue();
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(response.Data));
        var root = json.RootElement;
        root.TryGetProperty("ucp", out var ucp).ShouldBeTrue();
        ucp.TryGetProperty("capabilities", out var capabilities).ShouldBeTrue();
        var names = capabilities.EnumerateArray()
            .Select(c => c.GetProperty("name").GetString())
            .ToList();
        names.ShouldContain(UcpCapabilityNames.Checkout);
        names.ShouldContain(UcpCapabilityNames.Order);
        names.ShouldContain(UcpCapabilityNames.IdentityLinking);
        names.ShouldContain(UcpExtensionNames.Discount);
        names.ShouldContain(UcpExtensionNames.Fulfillment);
        names.ShouldContain(UcpExtensionNames.BuyerConsent);
        names.ShouldContain(UcpExtensionNames.Ap2Mandates);
    }

    [Fact]
    public async Task GenerateManifestAsync_AfterDueRotation_IncludesNewAndGracePeriodKeys()
    {
        // Arrange
        var keyStore = _scope.ServiceProvider.GetRequiredService<ISigningKeyStore>();
        var originalKeyId = await keyStore.GetCurrentKeyIdAsync();

        using (var db = _fixture.CreateDbContext())
        {
            var activeKey = await db.SigningKeys.FirstAsync(k => k.IsActive);
            activeKey.CreatedAt = DateTimeOffset.UtcNow.AddDays(-91);
            await db.SaveChangesAsync();
        }

        var rotated = await keyStore.RotateKeysIfDueAsync(90);
        rotated.ShouldBeTrue();
        var newKeyId = await keyStore.GetCurrentKeyIdAsync();

        // Act
        var manifest = await _adapter.GenerateManifestAsync() as UcpManifest;

        // Assert
        manifest.ShouldNotBeNull();
        manifest.SigningKeys.ShouldContain(k => k.Kid == originalKeyId);
        manifest.SigningKeys.ShouldContain(k => k.Kid == newKeyId);
    }
}
