using System.Net;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.UCP.Models;
using Merchello.Core.Protocols.UCP.Services;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

/// <summary>
/// Tests for UcpAgentProfileService - fetching agent profiles and extracting webhook URLs.
/// </summary>
public class UcpAgentProfileServiceTests
{
    private readonly Mock<IHttpClientFactory> _httpClientFactoryMock;
    private readonly Mock<ICacheService> _cacheServiceMock;
    private readonly Mock<ILogger<UcpAgentProfileService>> _loggerMock;
    private readonly UcpAgentProfileService _service;
    private readonly MockHttpMessageHandler _mockHandler;

    public UcpAgentProfileServiceTests()
    {
        _httpClientFactoryMock = new Mock<IHttpClientFactory>();
        _cacheServiceMock = new Mock<ICacheService>();
        _loggerMock = new Mock<ILogger<UcpAgentProfileService>>();

        _mockHandler = new MockHttpMessageHandler();
        var httpClient = new HttpClient(_mockHandler);
        _httpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);

        // Default cache behavior: bypass cache and call factory
        // Note: Use UcpAgentProfile (not nullable) to match runtime type
        _cacheServiceMock
            .Setup(x => x.GetOrCreateAsync(
                It.IsAny<string>(),
                It.IsAny<Func<CancellationToken, Task<UcpAgentProfile>>>(),
                It.IsAny<TimeSpan?>(),
                It.IsAny<IEnumerable<string>?>(),
                It.IsAny<CancellationToken>()))
            .Returns((string key, Func<CancellationToken, Task<UcpAgentProfile>> factory, TimeSpan? ttl, IEnumerable<string>? tags, CancellationToken ct) =>
                factory(ct)!);

        _service = new UcpAgentProfileService(
            _httpClientFactoryMock.Object,
            _cacheServiceMock.Object,
            _loggerMock.Object);
    }

    [Fact]
    public async Task GetProfileAsync_WithValidProfile_ReturnsProfile()
    {
        // Arrange
        var profileJson = """
        {
            "name": "Test Agent",
            "ucp": {
                "version": "2026-01-11",
                "capabilities": [
                    {
                        "name": "dev.ucp.shopping.order",
                        "version": "2026-01-11",
                        "config": {
                            "webhook_url": "https://agent.example.com/webhooks/orders"
                        }
                    }
                ]
            }
        }
        """;
        _mockHandler.ResponseContent = profileJson;
        _mockHandler.ResponseStatusCode = HttpStatusCode.OK;

        // Act
        var profile = await _service.GetProfileAsync("https://agent.example.com/profile");

        // Assert
        profile.ShouldNotBeNull();
        profile.Name.ShouldBe("Test Agent");
        profile.Ucp.ShouldNotBeNull();
        profile.Ucp.Version.ShouldBe("2026-01-11");
        profile.Ucp.Capabilities.ShouldNotBeNull();
        profile.Ucp.Capabilities.Count.ShouldBe(1);
    }

    [Fact]
    public async Task GetProfileAsync_WithNullUri_ReturnsNull()
    {
        // Act
        var profile = await _service.GetProfileAsync(null!);

        // Assert
        profile.ShouldBeNull();
    }

    [Fact]
    public async Task GetProfileAsync_WithEmptyUri_ReturnsNull()
    {
        // Act
        var profile = await _service.GetProfileAsync("");

        // Assert
        profile.ShouldBeNull();
    }

    [Fact]
    public async Task GetProfileAsync_WithInvalidUri_ReturnsNull()
    {
        // Act
        var profile = await _service.GetProfileAsync("not-a-valid-uri");

        // Assert
        profile.ShouldBeNull();
    }

    [Fact]
    public async Task GetProfileAsync_WithHttpError_ReturnsNull()
    {
        // Arrange
        _mockHandler.ResponseStatusCode = HttpStatusCode.NotFound;

        // Act
        var profile = await _service.GetProfileAsync("https://agent.example.com/profile");

        // Assert
        profile.ShouldBeNull();
    }

    [Fact]
    public async Task GetProfileAsync_WithInvalidJson_ReturnsNull()
    {
        // Arrange
        _mockHandler.ResponseContent = "not valid json";
        _mockHandler.ResponseStatusCode = HttpStatusCode.OK;

        // Act
        var profile = await _service.GetProfileAsync("https://agent.example.com/profile");

        // Assert
        profile.ShouldBeNull();
    }

    [Fact]
    public async Task GetProfileAsync_WithHttpException_ReturnsNull()
    {
        // Arrange
        _mockHandler.ExceptionToThrow = new HttpRequestException("Connection failed");

        // Act
        var profile = await _service.GetProfileAsync("https://agent.example.com/profile");

        // Assert
        profile.ShouldBeNull();
    }

    [Fact]
    public void GetOrderWebhookUrl_WithOrderCapability_ReturnsWebhookUrl()
    {
        // Arrange
        var profile = new UcpAgentProfile
        {
            Name = "Test Agent",
            Ucp = new UcpAgentProfileMetadata
            {
                Version = "2026-01-11",
                Capabilities =
                [
                    new UcpAgentCapability
                    {
                        Name = "dev.ucp.shopping.order",
                        Version = "2026-01-11",
                        Config = new UcpAgentCapabilityConfig
                        {
                            WebhookUrl = "https://agent.example.com/webhooks/orders"
                        }
                    }
                ]
            }
        };

        // Act
        var webhookUrl = _service.GetOrderWebhookUrl(profile);

        // Assert
        webhookUrl.ShouldBe("https://agent.example.com/webhooks/orders");
    }

    [Fact]
    public void GetOrderWebhookUrl_WithNoOrderCapability_ReturnsNull()
    {
        // Arrange
        var profile = new UcpAgentProfile
        {
            Name = "Test Agent",
            Ucp = new UcpAgentProfileMetadata
            {
                Version = "2026-01-11",
                Capabilities =
                [
                    new UcpAgentCapability
                    {
                        Name = "dev.ucp.shopping.checkout",
                        Version = "2026-01-11"
                    }
                ]
            }
        };

        // Act
        var webhookUrl = _service.GetOrderWebhookUrl(profile);

        // Assert
        webhookUrl.ShouldBeNull();
    }

    [Fact]
    public void GetOrderWebhookUrl_WithNullProfile_ReturnsNull()
    {
        // Act
        var webhookUrl = _service.GetOrderWebhookUrl(null);

        // Assert
        webhookUrl.ShouldBeNull();
    }

    [Fact]
    public void GetOrderWebhookUrl_WithNullCapabilities_ReturnsNull()
    {
        // Arrange
        var profile = new UcpAgentProfile
        {
            Name = "Test Agent",
            Ucp = new UcpAgentProfileMetadata
            {
                Version = "2026-01-11",
                Capabilities = null
            }
        };

        // Act
        var webhookUrl = _service.GetOrderWebhookUrl(profile);

        // Assert
        webhookUrl.ShouldBeNull();
    }

    [Fact]
    public void GetOrderWebhookUrl_WithNullConfig_ReturnsNull()
    {
        // Arrange
        var profile = new UcpAgentProfile
        {
            Name = "Test Agent",
            Ucp = new UcpAgentProfileMetadata
            {
                Version = "2026-01-11",
                Capabilities =
                [
                    new UcpAgentCapability
                    {
                        Name = "dev.ucp.shopping.order",
                        Version = "2026-01-11",
                        Config = null
                    }
                ]
            }
        };

        // Act
        var webhookUrl = _service.GetOrderWebhookUrl(profile);

        // Assert
        webhookUrl.ShouldBeNull();
    }

    [Fact]
    public void GetOrderWebhookUrl_CaseInsensitiveCapabilityName()
    {
        // Arrange
        var profile = new UcpAgentProfile
        {
            Name = "Test Agent",
            Ucp = new UcpAgentProfileMetadata
            {
                Version = "2026-01-11",
                Capabilities =
                [
                    new UcpAgentCapability
                    {
                        Name = "DEV.UCP.SHOPPING.ORDER", // uppercase
                        Version = "2026-01-11",
                        Config = new UcpAgentCapabilityConfig
                        {
                            WebhookUrl = "https://agent.example.com/webhooks/orders"
                        }
                    }
                ]
            }
        };

        // Act
        var webhookUrl = _service.GetOrderWebhookUrl(profile);

        // Assert
        webhookUrl.ShouldBe("https://agent.example.com/webhooks/orders");
    }

    [Fact]
    public async Task GetProfileAsync_UsesCaching()
    {
        // Arrange
        var profileJson = """{"name": "Cached Agent"}""";
        _mockHandler.ResponseContent = profileJson;
        _mockHandler.ResponseStatusCode = HttpStatusCode.OK;

        // Act
        await _service.GetProfileAsync("https://agent.example.com/profile");

        // Assert - verify cache was called with correct parameters
        // Note: Use UcpAgentProfile (not nullable) to match runtime type
        _cacheServiceMock.Verify(x => x.GetOrCreateAsync(
            It.Is<string>(k => k.StartsWith(ProtocolCacheKeys.AgentProfilePrefix)),
            It.IsAny<Func<CancellationToken, Task<UcpAgentProfile>>>(),
            It.Is<TimeSpan?>(ttl => ttl == ProtocolCacheDurations.AgentProfileCache),
            It.Is<IEnumerable<string>?>(tags => tags != null && tags.Contains("protocols") && tags.Contains("agent-profiles")),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

}
