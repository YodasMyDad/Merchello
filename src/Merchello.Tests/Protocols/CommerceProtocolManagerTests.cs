using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Interfaces;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

/// <summary>
/// Tests for commerce protocol adapter management.
/// Uses the internal constructor to inject mock adapters directly.
/// </summary>
public class CommerceProtocolManagerTests
{
    private readonly Mock<ICacheService> _cacheServiceMock;
    private readonly Mock<ILogger<CommerceProtocolManager>> _loggerMock;

    public CommerceProtocolManagerTests()
    {
        _cacheServiceMock = new Mock<ICacheService>();
        _cacheServiceMock
            .Setup(x => x.GetOrCreateAsync(
                It.IsAny<string>(),
                It.IsAny<Func<CancellationToken, Task<object?>>>(),
                It.IsAny<TimeSpan?>(),
                It.IsAny<IEnumerable<string>?>(),
                It.IsAny<CancellationToken>()))
            .Returns((string _, Func<CancellationToken, Task<object?>> factory, TimeSpan? _, IEnumerable<string>? _, CancellationToken ct) => factory(ct));

        _loggerMock = new Mock<ILogger<CommerceProtocolManager>>();
    }

    /// <summary>
    /// Creates a CommerceProtocolManager with the given adapters using the internal test constructor.
    /// </summary>
    private CommerceProtocolManager CreateManager(params ICommerceProtocolAdapter[] adapters)
    {
        return new CommerceProtocolManager(
            adapters,
            _cacheServiceMock.Object,
            _loggerMock.Object);
    }

    [Fact]
    public async Task GetAdaptersAsync_WithNoAdapters_ReturnsEmptyList()
    {
        // Arrange
        var manager = CreateManager();

        // Act
        var adapters = await manager.GetAdaptersAsync();

        // Assert
        adapters.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetAdaptersAsync_WithAdapter_ReturnsAdapter()
    {
        // Arrange
        var mockAdapter = CreateMockAdapter("ucp", "Universal Commerce Protocol", "2026-01-11");
        var manager = CreateManager(mockAdapter.Object);

        // Act
        var adapters = await manager.GetAdaptersAsync();

        // Assert
        adapters.Count.ShouldBe(1);
        adapters[0].Metadata.Alias.ShouldBe("ucp");
    }

    [Fact]
    public async Task GetAdaptersAsync_CachesResult()
    {
        // Arrange
        var mockAdapter = CreateMockAdapter("ucp", "UCP", "1.0");
        var manager = CreateManager(mockAdapter.Object);

        // Act
        var adapters1 = await manager.GetAdaptersAsync();
        var adapters2 = await manager.GetAdaptersAsync();

        // Assert - Both calls return the same cached list
        adapters1.ShouldBe(adapters2);
        ReferenceEquals(adapters1, adapters2).ShouldBeTrue();
    }

    [Fact]
    public void GetAdapter_WithValidAlias_ReturnsAdapter()
    {
        // Arrange
        var mockAdapter = CreateMockAdapter("ucp", "UCP", "1.0");
        var manager = CreateManager(mockAdapter.Object);

        // Act
        var adapter = manager.GetAdapter("ucp");

        // Assert
        adapter.ShouldNotBeNull();
        adapter.Metadata.Alias.ShouldBe("ucp");
    }

    [Fact]
    public void GetAdapter_WithInvalidAlias_ReturnsNull()
    {
        // Arrange
        var mockAdapter = CreateMockAdapter("ucp", "UCP", "1.0");
        var manager = CreateManager(mockAdapter.Object);

        // Act
        var adapter = manager.GetAdapter("nonexistent");

        // Assert
        adapter.ShouldBeNull();
    }

    [Fact]
    public void GetAdapter_IsCaseInsensitive()
    {
        // Arrange
        var mockAdapter = CreateMockAdapter("ucp", "UCP", "1.0");
        var manager = CreateManager(mockAdapter.Object);

        // Act & Assert
        manager.GetAdapter("UCP").ShouldNotBeNull();
        manager.GetAdapter("Ucp").ShouldNotBeNull();
        manager.GetAdapter("ucp").ShouldNotBeNull();
    }

    [Fact]
    public void GetAdapter_WithEmptyAlias_ReturnsNull()
    {
        // Arrange
        var manager = CreateManager();

        // Act & Assert
        manager.GetAdapter("").ShouldBeNull();
        manager.GetAdapter(null!).ShouldBeNull();
        manager.GetAdapter("   ").ShouldBeNull();
    }

    [Fact]
    public void IsProtocolSupported_WithEnabledProtocol_ReturnsTrue()
    {
        // Arrange
        var mockAdapter = CreateMockAdapter("ucp", "UCP", "1.0", isEnabled: true);
        var manager = CreateManager(mockAdapter.Object);

        // Act
        var isSupported = manager.IsProtocolSupported("ucp");

        // Assert
        isSupported.ShouldBeTrue();
    }

    [Fact]
    public void IsProtocolSupported_WithDisabledProtocol_ReturnsFalse()
    {
        // Arrange
        var mockAdapter = CreateMockAdapter("ucp", "UCP", "1.0", isEnabled: false);
        var manager = CreateManager(mockAdapter.Object);

        // Act
        var isSupported = manager.IsProtocolSupported("ucp");

        // Assert
        isSupported.ShouldBeFalse();
    }

    [Fact]
    public void IsProtocolSupported_WithUnknownProtocol_ReturnsFalse()
    {
        // Arrange
        var manager = CreateManager();

        // Act
        var isSupported = manager.IsProtocolSupported("unknown");

        // Assert
        isSupported.ShouldBeFalse();
    }

    [Fact]
    public void GetEnabledProtocols_ReturnsOnlyEnabled()
    {
        // Arrange
        var enabledAdapter = CreateMockAdapter("ucp", "UCP", "1.0", isEnabled: true);
        var disabledAdapter = CreateMockAdapter("legacy", "Legacy", "1.0", isEnabled: false);
        var manager = CreateManager(enabledAdapter.Object, disabledAdapter.Object);

        // Act
        var enabledProtocols = manager.GetEnabledProtocols();

        // Assert
        enabledProtocols.Count.ShouldBe(1);
        enabledProtocols.ShouldContain("ucp");
        enabledProtocols.ShouldNotContain("legacy");
    }

    [Fact]
    public async Task GetCachedManifestAsync_WithEnabledAdapter_ReturnsManifest()
    {
        // Arrange
        var expectedManifest = new { version = "2026-01-11" };
        var mockAdapter = CreateMockAdapter("ucp", "UCP", "1.0", isEnabled: true);
        mockAdapter
            .Setup(a => a.GenerateManifestAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedManifest);

        var manager = CreateManager(mockAdapter.Object);

        // Act
        var manifest = await manager.GetCachedManifestAsync("ucp");

        // Assert
        manifest.ShouldBe(expectedManifest);
    }

    [Fact]
    public async Task GetCachedManifestAsync_WithDisabledAdapter_ReturnsNull()
    {
        // Arrange
        var mockAdapter = CreateMockAdapter("ucp", "UCP", "1.0", isEnabled: false);
        var manager = CreateManager(mockAdapter.Object);

        // Act
        var manifest = await manager.GetCachedManifestAsync("ucp");

        // Assert
        manifest.ShouldBeNull();
    }

    [Fact]
    public async Task GetCachedManifestAsync_WithUnknownProtocol_ReturnsNull()
    {
        // Arrange
        var manager = CreateManager();

        // Act
        var manifest = await manager.GetCachedManifestAsync("unknown");

        // Assert
        manifest.ShouldBeNull();
    }

    [Fact]
    public async Task GetNegotiatedManifestAsync_WithAgent_CallsNegotiate()
    {
        // Arrange
        var fullManifest = new { capabilities = new[] { "checkout", "order" } };
        var negotiatedManifest = new { capabilities = new[] { "checkout" } };

        var mockAdapter = CreateMockAdapter("ucp", "UCP", "1.0", isEnabled: true);
        mockAdapter
            .Setup(a => a.GenerateManifestAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(fullManifest);
        mockAdapter
            .Setup(a => a.NegotiateCapabilitiesAsync(
                It.IsAny<object>(),
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(negotiatedManifest);

        var manager = CreateManager(mockAdapter.Object);

        var agent = new AgentIdentity
        {
            AgentId = Guid.NewGuid().ToString(),
            Protocol = ProtocolConstants.Protocols.Ucp,
            ProfileUri = "https://agent.example.com",
            Capabilities = ["checkout"]
        };

        // Act
        var manifest = await manager.GetNegotiatedManifestAsync("ucp", agent);

        // Assert
        manifest.ShouldBe(negotiatedManifest);
        mockAdapter.Verify(a => a.NegotiateCapabilitiesAsync(
            It.IsAny<object>(),
            It.Is<IReadOnlyList<string>>(c => c.Contains("checkout")),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetNegotiatedManifestAsync_WithNullAgent_ReturnsFullManifest()
    {
        // Arrange
        var fullManifest = new { capabilities = new[] { "checkout", "order" } };

        var mockAdapter = CreateMockAdapter("ucp", "UCP", "1.0", isEnabled: true);
        mockAdapter
            .Setup(a => a.GenerateManifestAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(fullManifest);

        var manager = CreateManager(mockAdapter.Object);

        // Act
        var manifest = await manager.GetNegotiatedManifestAsync("ucp", null);

        // Assert
        manifest.ShouldBe(fullManifest);
    }

    [Fact]
    public async Task GetAdaptersAsync_WithMultipleAdapters_ReturnsAll()
    {
        // Arrange
        var adapter1 = CreateMockAdapter("ucp", "UCP", "1.0");
        var adapter2 = CreateMockAdapter("legacy", "Legacy", "1.0");
        var manager = CreateManager(adapter1.Object, adapter2.Object);

        // Act
        var adapters = await manager.GetAdaptersAsync();

        // Assert
        adapters.Count.ShouldBe(2);
    }

    [Fact]
    public void Adapters_Property_ReturnsInjectedAdapters()
    {
        // Arrange
        var mockAdapter = CreateMockAdapter("ucp", "UCP", "1.0");
        var manager = CreateManager(mockAdapter.Object);

        // Act
        var adapters = manager.Adapters;

        // Assert
        adapters.Count.ShouldBe(1);
        adapters[0].Metadata.Alias.ShouldBe("ucp");
    }

    [Fact]
    public void Dispose_ClearsAdapters()
    {
        // Arrange
        var mockAdapter = CreateMockAdapter("ucp", "UCP", "1.0");
        var manager = CreateManager(mockAdapter.Object);

        // Act
        manager.Dispose();

        // Assert - Adapters property should return empty after dispose
        manager.Adapters.ShouldBeEmpty();
    }

    // Helper methods

    private static Mock<ICommerceProtocolAdapter> CreateMockAdapter(
        string alias,
        string displayName,
        string version,
        bool isEnabled = true)
    {
        var mock = new Mock<ICommerceProtocolAdapter>();

        mock.Setup(a => a.Metadata).Returns(new CommerceProtocolAdapterMetadata(
            Alias: alias,
            DisplayName: displayName,
            Version: version,
            Icon: null,
            Description: null,
            SupportsIdentityLinking: false,
            SupportsOrderWebhooks: false
        ));

        mock.Setup(a => a.IsEnabled).Returns(isEnabled);

        return mock;
    }
}
