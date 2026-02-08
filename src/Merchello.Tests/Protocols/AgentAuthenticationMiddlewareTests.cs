using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.Notifications;
using Merchello.Core.Protocols.UCP.Models;
using Merchello.Core.Protocols.UCP.Services.Interfaces;
using Merchello.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using System.Text.Json;
using Xunit;

namespace Merchello.Tests.Protocols;

/// <summary>
/// Tests for AgentAuthenticationMiddleware.
/// Validates UCP-Agent header parsing, allowlist enforcement, and notification publishing.
/// </summary>
public class AgentAuthenticationMiddlewareTests
{
    private readonly Mock<IMerchelloNotificationPublisher> _notificationPublisher;
    private readonly Mock<ILogger<AgentAuthenticationMiddleware>> _logger;
    private readonly Mock<IUcpAgentProfileService> _agentProfileService;

    public AgentAuthenticationMiddlewareTests()
    {
        _notificationPublisher = new Mock<IMerchelloNotificationPublisher>();
        _notificationPublisher
            .Setup(p => p.PublishCancelableAsync(It.IsAny<AgentAuthenticatingNotification>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _notificationPublisher
            .Setup(p => p.PublishAsync(It.IsAny<AgentAuthenticatedNotification>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _logger = new Mock<ILogger<AgentAuthenticationMiddleware>>();

        _agentProfileService = new Mock<IUcpAgentProfileService>();
        _agentProfileService
            .Setup(p => p.GetProfileAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((UcpAgentProfile?)null);
    }

    [Fact]
    public async Task InvokeAsync_WithValidUcpAgentHeader_SetsAgentIdentityInContext()
    {
        // Arrange
        var settings = CreateSettings(requireAuth: false, allowedAgents: ["*"]);
        var context = CreateHttpContext("/.well-known/ucp", ucpAgentHeader: "profile=\"https://test-agent.example.com/profile\"");
        var nextCalled = false;

        var middleware = CreateMiddleware(
            ctx => { nextCalled = true; return Task.CompletedTask; },
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);

        // Assert
        nextCalled.ShouldBeTrue();
        var agentIdentity = AgentAuthenticationMiddleware.GetAgentIdentity(context);
        agentIdentity.ShouldNotBeNull();
        agentIdentity.ProfileUri.ShouldBe("https://test-agent.example.com/profile");
        agentIdentity.Protocol.ShouldBe(ProtocolAliases.Ucp);
    }

    [Fact]
    public async Task InvokeAsync_WithMissingHeader_WhenAuthNotRequired_AllowsRequest()
    {
        // Arrange
        var settings = CreateSettings(requireAuth: false, allowedAgents: ["*"]);
        var context = CreateHttpContext("/.well-known/ucp", ucpAgentHeader: null);
        var nextCalled = false;

        var middleware = CreateMiddleware(
            ctx => { nextCalled = true; return Task.CompletedTask; },
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);

        // Assert
        nextCalled.ShouldBeTrue();
        context.Response.StatusCode.ShouldBe(StatusCodes.Status200OK);
    }

    [Fact]
    public async Task InvokeAsync_WithMissingHeader_WhenAuthRequired_Returns401()
    {
        // Arrange
        var settings = CreateSettings(requireAuth: true, allowedAgents: ["*"]);
        var context = CreateHttpContext("/.well-known/ucp", ucpAgentHeader: null);
        var nextCalled = false;

        var middleware = CreateMiddleware(
            ctx => { nextCalled = true; return Task.CompletedTask; },
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);

        // Assert
        nextCalled.ShouldBeFalse();
        context.Response.StatusCode.ShouldBe(StatusCodes.Status401Unauthorized);
    }

    [Fact]
    public async Task InvokeAsync_WithHigherProtocolVersion_ReturnsVersionUnsupported()
    {
        // Arrange
        var settings = CreateSettings(requireAuth: false, allowedAgents: ["*"]);
        var context = CreateHttpContext(
            "/api/v1/checkout-sessions",
            ucpAgentHeader: "profile=\"https://test-agent.example.com/profile\", version=\"2026-02-01\"");
        var nextCalled = false;

        var middleware = CreateMiddleware(
            ctx => { nextCalled = true; return Task.CompletedTask; },
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);

        // Assert
        nextCalled.ShouldBeFalse();
        context.Response.StatusCode.ShouldBe(StatusCodes.Status400BadRequest);

        using var payload = await ReadResponseJsonAsync(context);
        payload.RootElement.GetProperty("error").GetString().ShouldBe("version_unsupported");
    }

    [Fact]
    public async Task InvokeAsync_WithEqualProtocolVersion_AllowsRequest()
    {
        // Arrange
        var settings = CreateSettings(requireAuth: false, allowedAgents: ["*"]);
        var context = CreateHttpContext(
            "/api/v1/checkout-sessions",
            ucpAgentHeader: "profile=\"https://test-agent.example.com/profile\", version=\"2026-01-11\"");
        var nextCalled = false;

        var middleware = CreateMiddleware(
            ctx => { nextCalled = true; return Task.CompletedTask; },
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);

        // Assert
        nextCalled.ShouldBeTrue();
        context.Response.StatusCode.ShouldBe(StatusCodes.Status200OK);
    }

    [Fact]
    public async Task InvokeAsync_WithNotificationCancel_Returns403()
    {
        // Arrange
        var settings = CreateSettings(requireAuth: false, allowedAgents: ["*"]);
        var context = CreateHttpContext("/.well-known/ucp", ucpAgentHeader: "profile=\"https://malicious-agent.example.com\"");
        var nextCalled = false;

        // Configure notification publisher to cancel the request
        _notificationPublisher
            .Setup(p => p.PublishCancelableAsync(It.IsAny<AgentAuthenticatingNotification>(), It.IsAny<CancellationToken>()))
            .Callback<AgentAuthenticatingNotification, CancellationToken>((n, _) =>
            {
                n.CancelOperation("Agent blocked by security policy");
            })
            .ReturnsAsync(true);

        var middleware = CreateMiddleware(
            ctx => { nextCalled = true; return Task.CompletedTask; },
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);

        // Assert
        nextCalled.ShouldBeFalse();
        context.Response.StatusCode.ShouldBe(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task InvokeAsync_WithAgentNotInAllowlist_Returns403()
    {
        // Arrange - only allow specific agents
        var settings = CreateSettings(requireAuth: false, allowedAgents: ["https://trusted-agent.example.com"]);
        var context = CreateHttpContext("/.well-known/ucp", ucpAgentHeader: "profile=\"https://untrusted-agent.example.com/profile\"");
        var nextCalled = false;

        var middleware = CreateMiddleware(
            ctx => { nextCalled = true; return Task.CompletedTask; },
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);

        // Assert
        nextCalled.ShouldBeFalse();
        context.Response.StatusCode.ShouldBe(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task InvokeAsync_OnNonProtocolPath_SkipsAuthentication()
    {
        // Arrange
        var settings = CreateSettings(requireAuth: true, allowedAgents: []);
        var context = CreateHttpContext("/api/products", ucpAgentHeader: null);
        var nextCalled = false;

        var middleware = CreateMiddleware(
            ctx => { nextCalled = true; return Task.CompletedTask; },
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);

        // Assert
        nextCalled.ShouldBeTrue();
        // No authentication check should have occurred - next() was called without 401/403
    }

    [Fact]
    public async Task InvokeAsync_WithProtocolsDisabled_SkipsAuthentication()
    {
        // Arrange
        var settings = CreateSettings(protocolsEnabled: false, requireAuth: true, allowedAgents: []);
        var context = CreateHttpContext("/.well-known/ucp", ucpAgentHeader: null);
        var nextCalled = false;

        var middleware = CreateMiddleware(
            ctx => { nextCalled = true; return Task.CompletedTask; },
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);

        // Assert
        nextCalled.ShouldBeTrue();
    }

    [Fact]
    public async Task InvokeAsync_WithWildcardAllowlist_AllowsAllAgents()
    {
        // Arrange
        var settings = CreateSettings(requireAuth: false, allowedAgents: ["*"]);
        var context = CreateHttpContext("/.well-known/ucp", ucpAgentHeader: "profile=\"https://any-agent-anywhere.example.com/profile\"");
        var nextCalled = false;

        var middleware = CreateMiddleware(
            ctx => { nextCalled = true; return Task.CompletedTask; },
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);

        // Assert
        nextCalled.ShouldBeTrue();
        context.Response.StatusCode.ShouldBe(StatusCodes.Status200OK);
    }

    [Fact]
    public async Task InvokeAsync_WithSpecificAllowlist_MatchesProfileUri()
    {
        // Arrange - allow agent with prefix matching
        var settings = CreateSettings(requireAuth: false, allowedAgents: ["https://gemini.google.com"]);
        var context = CreateHttpContext("/.well-known/ucp", ucpAgentHeader: "profile=\"https://gemini.google.com/agent/v2\"");
        var nextCalled = false;

        var middleware = CreateMiddleware(
            ctx => { nextCalled = true; return Task.CompletedTask; },
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);

        // Assert
        nextCalled.ShouldBeTrue();
    }

    [Fact]
    public async Task InvokeAsync_PublishesAuthenticatedNotification_OnSuccess()
    {
        // Arrange
        var settings = CreateSettings(requireAuth: false, allowedAgents: ["*"]);
        var context = CreateHttpContext("/.well-known/ucp", ucpAgentHeader: "profile=\"https://test-agent.example.com/profile\"");
        AgentAuthenticatedNotification? capturedNotification = null;

        _notificationPublisher
            .Setup(p => p.PublishAsync(It.IsAny<AgentAuthenticatedNotification>(), It.IsAny<CancellationToken>()))
            .Callback<AgentAuthenticatedNotification, CancellationToken>((n, _) => capturedNotification = n)
            .Returns(Task.CompletedTask);

        var middleware = CreateMiddleware(
            ctx => Task.CompletedTask,
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);

        // Assert
        capturedNotification.ShouldNotBeNull();
        capturedNotification.Identity.ProfileUri.ShouldBe("https://test-agent.example.com/profile");
    }

    [Fact]
    public async Task GetAgentIdentity_ReturnsStoredIdentity()
    {
        // Arrange
        var settings = CreateSettings(requireAuth: false, allowedAgents: ["*"]);
        var context = CreateHttpContext("/.well-known/ucp", ucpAgentHeader: "profile=\"https://test.example.com\"");

        var middleware = CreateMiddleware(
            ctx => Task.CompletedTask,
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);
        var identity = AgentAuthenticationMiddleware.GetAgentIdentity(context);

        // Assert
        identity.ShouldNotBeNull();
        identity.AgentId.ShouldBe("https://test.example.com");
    }

    [Theory]
    [InlineData("/.well-known/ucp")]
    [InlineData("/api/v1/checkout-sessions")]
    [InlineData("/api/v1/checkout-sessions/abc123")]
    [InlineData("/api/v1/orders")]
    [InlineData("/api/v1/orders/abc123")]
    public async Task InvokeAsync_OnProtocolPaths_ProcessesAuthentication(string path)
    {
        // Arrange
        var settings = CreateSettings(requireAuth: true, allowedAgents: ["*"]);
        var context = CreateHttpContext(path, ucpAgentHeader: "profile=\"https://agent.example.com\"");
        var nextCalled = false;

        var middleware = CreateMiddleware(
            ctx => { nextCalled = true; return Task.CompletedTask; },
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);

        // Assert
        nextCalled.ShouldBeTrue();
        // Agent identity should be set for all protocol paths
        var identity = AgentAuthenticationMiddleware.GetAgentIdentity(context);
        identity.ShouldNotBeNull();
    }

    [Theory]
    [InlineData("/api/products")]
    [InlineData("/umbraco/backoffice")]
    [InlineData("/")]
    [InlineData("/checkout")]
    public async Task InvokeAsync_OnNonProtocolPaths_SkipsAuthCheck(string path)
    {
        // Arrange - auth required but should be skipped for non-protocol paths
        var settings = CreateSettings(requireAuth: true, allowedAgents: []);
        var context = CreateHttpContext(path, ucpAgentHeader: null);
        var nextCalled = false;

        var middleware = CreateMiddleware(
            ctx => { nextCalled = true; return Task.CompletedTask; },
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);

        // Assert
        nextCalled.ShouldBeTrue();
    }

    [Fact]
    public async Task InvokeAsync_WithEmptyProfileUri_DoesNotSetIdentity()
    {
        // Arrange
        var settings = CreateSettings(requireAuth: false, allowedAgents: ["*"]);
        var context = CreateHttpContext("/.well-known/ucp", ucpAgentHeader: "profile=\"\"");
        var nextCalled = false;

        var middleware = CreateMiddleware(
            ctx => { nextCalled = true; return Task.CompletedTask; },
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);

        // Assert
        nextCalled.ShouldBeTrue();
        var identity = AgentAuthenticationMiddleware.GetAgentIdentity(context);
        identity.ShouldBeNull();
    }

    [Fact]
    public async Task InvokeAsync_WithMalformedHeader_DoesNotSetIdentity()
    {
        // Arrange
        var settings = CreateSettings(requireAuth: false, allowedAgents: ["*"]);
        var context = CreateHttpContext("/.well-known/ucp", ucpAgentHeader: "not a valid header format");
        var nextCalled = false;

        var middleware = CreateMiddleware(
            ctx => { nextCalled = true; return Task.CompletedTask; },
            settings);

        // Act
        await middleware.InvokeAsync(context, _notificationPublisher.Object, _agentProfileService.Object);

        // Assert
        nextCalled.ShouldBeTrue();
        var identity = AgentAuthenticationMiddleware.GetAgentIdentity(context);
        identity.ShouldBeNull();
    }

    // Helper methods

    private static IOptions<ProtocolSettings> CreateSettings(
        bool protocolsEnabled = true,
        bool requireAuth = false,
        string[]? allowedAgents = null)
    {
        var settings = new ProtocolSettings
        {
            Enabled = protocolsEnabled,
            RequireHttps = false,
            Ucp = new UcpSettings
            {
                Enabled = true,
                Version = "2026-01-11",
                RequireAuthentication = requireAuth,
                AllowedAgents = (allowedAgents ?? ["*"]).ToList()
            }
        };

        return Options.Create(settings);
    }

    private static DefaultHttpContext CreateHttpContext(string path, string? ucpAgentHeader)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Request.Method = "GET";

        if (ucpAgentHeader != null)
        {
            context.Request.Headers[ProtocolHeaders.UcpAgent] = ucpAgentHeader;
        }

        // Set up response body stream so WriteAsJsonAsync works
        context.Response.Body = new MemoryStream();

        return context;
    }

    private AgentAuthenticationMiddleware CreateMiddleware(
        RequestDelegate next,
        IOptions<ProtocolSettings> settings)
    {
        return new AgentAuthenticationMiddleware(
            next,
            _logger.Object,
            settings);
    }

    private static async Task<JsonDocument> ReadResponseJsonAsync(HttpContext context)
    {
        context.Response.Body.Position = 0;
        using var reader = new StreamReader(context.Response.Body, leaveOpen: true);
        var json = await reader.ReadToEndAsync();
        return JsonDocument.Parse(json);
    }
}
