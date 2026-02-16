using System.Text.Json;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Authentication.Interfaces;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.Notifications;
using Merchello.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

public class AgentAuthenticationMiddlewareTests
{
    private readonly Mock<IMerchelloNotificationPublisher> _notificationPublisher = new();
    private readonly Mock<ILogger<AgentAuthenticationMiddleware>> _logger = new();

    public AgentAuthenticationMiddlewareTests()
    {
        _notificationPublisher
            .Setup(x => x.PublishCancelableAsync(It.IsAny<AgentAuthenticatingNotification>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _notificationPublisher
            .Setup(x => x.PublishAsync(It.IsAny<AgentAuthenticatedNotification>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
    }

    [Fact]
    public async Task InvokeAsync_NonProtocolPath_CallsNext()
    {
        var context = CreateContext("/api/products");
        var nextCalled = false;
        var middleware = CreateMiddleware(_ => { nextCalled = true; return Task.CompletedTask; }, CreateSettings());

        await middleware.InvokeAsync(context, _notificationPublisher.Object, []);

        nextCalled.ShouldBeTrue();
        context.Response.StatusCode.ShouldBe(StatusCodes.Status200OK);
    }

    [Fact]
    public async Task InvokeAsync_TransactionalPath_MissingUcpAgent_Returns401()
    {
        var context = CreateContext("/api/v1/checkout-sessions", HttpMethods.Post, new Dictionary<string, string>
        {
            [ProtocolHeaders.RequestSignature] = "sig",
            [ProtocolHeaders.RequestId] = Guid.NewGuid().ToString(),
            [ProtocolHeaders.IdempotencyKey] = Guid.NewGuid().ToString()
        });
        var nextCalled = false;
        var middleware = CreateMiddleware(_ => { nextCalled = true; return Task.CompletedTask; }, CreateSettings());

        await middleware.InvokeAsync(context, _notificationPublisher.Object, []);

        nextCalled.ShouldBeFalse();
        context.Response.StatusCode.ShouldBe(StatusCodes.Status401Unauthorized);
        var body = await ReadBodyAsync(context);
        body.RootElement.GetProperty("error").GetString().ShouldBe("missing_ucp_agent");
    }

    [Fact]
    public async Task InvokeAsync_TransactionalPath_MissingRequestSignature_Returns401()
    {
        var context = CreateContext("/api/v1/orders/123", HttpMethods.Get, new Dictionary<string, string>
        {
            [ProtocolHeaders.UcpAgent] = "profile=\"https://agent.example.com/profile\"",
            [ProtocolHeaders.RequestId] = Guid.NewGuid().ToString()
        });
        var middleware = CreateMiddleware(_ => Task.CompletedTask, CreateSettings());

        await middleware.InvokeAsync(context, _notificationPublisher.Object, []);

        context.Response.StatusCode.ShouldBe(StatusCodes.Status401Unauthorized);
        var body = await ReadBodyAsync(context);
        body.RootElement.GetProperty("error").GetString().ShouldBe("missing_request_signature");
    }

    [Fact]
    public async Task InvokeAsync_TransactionalPath_MissingRequestId_Returns400()
    {
        var context = CreateContext("/api/v1/orders/123", HttpMethods.Get, new Dictionary<string, string>
        {
            [ProtocolHeaders.UcpAgent] = "profile=\"https://agent.example.com/profile\"",
            [ProtocolHeaders.RequestSignature] = "sig"
        });
        var middleware = CreateMiddleware(_ => Task.CompletedTask, CreateSettings());

        await middleware.InvokeAsync(context, _notificationPublisher.Object, []);

        context.Response.StatusCode.ShouldBe(StatusCodes.Status400BadRequest);
        var body = await ReadBodyAsync(context);
        body.RootElement.GetProperty("error").GetString().ShouldBe("missing_request_id");
    }

    [Fact]
    public async Task InvokeAsync_TransactionalPath_InvalidRequestId_Returns400()
    {
        var context = CreateContext("/api/v1/orders/123", HttpMethods.Get, new Dictionary<string, string>
        {
            [ProtocolHeaders.UcpAgent] = "profile=\"https://agent.example.com/profile\"",
            [ProtocolHeaders.RequestSignature] = "sig",
            [ProtocolHeaders.RequestId] = "not-a-guid"
        });
        var middleware = CreateMiddleware(_ => Task.CompletedTask, CreateSettings());

        await middleware.InvokeAsync(context, _notificationPublisher.Object, []);

        context.Response.StatusCode.ShouldBe(StatusCodes.Status400BadRequest);
        var body = await ReadBodyAsync(context);
        body.RootElement.GetProperty("error").GetString().ShouldBe("invalid_request_id");
    }

    [Theory]
    [InlineData("/api/v1/checkout-sessions", "POST")]
    [InlineData("/api/v1/checkout-sessions/2E895D8A-6E10-4386-8476-3A9B1A1F7B05", "PUT")]
    [InlineData("/api/v1/checkout-sessions/2E895D8A-6E10-4386-8476-3A9B1A1F7B05/complete", "POST")]
    public async Task InvokeAsync_WriteRoute_MissingIdempotencyKey_Returns400(string path, string method)
    {
        var context = CreateContext(path, method, new Dictionary<string, string>
        {
            [ProtocolHeaders.UcpAgent] = "profile=\"https://agent.example.com/profile\"",
            [ProtocolHeaders.RequestSignature] = "sig",
            [ProtocolHeaders.RequestId] = Guid.NewGuid().ToString()
        });
        var middleware = CreateMiddleware(_ => Task.CompletedTask, CreateSettings());

        await middleware.InvokeAsync(context, _notificationPublisher.Object, []);

        context.Response.StatusCode.ShouldBe(StatusCodes.Status400BadRequest);
        var body = await ReadBodyAsync(context);
        body.RootElement.GetProperty("error").GetString().ShouldBe("missing_idempotency_key");
    }

    [Fact]
    public async Task InvokeAsync_WellKnownPath_WithoutAgentHeader_AllowsRequest()
    {
        var context = CreateContext("/.well-known/ucp");
        var nextCalled = false;
        var middleware = CreateMiddleware(_ => { nextCalled = true; return Task.CompletedTask; }, CreateSettings());

        await middleware.InvokeAsync(context, _notificationPublisher.Object, []);

        nextCalled.ShouldBeTrue();
        context.Response.StatusCode.ShouldBe(StatusCodes.Status200OK);
    }

    [Fact]
    public async Task InvokeAsync_UnsupportedVersion_ReturnsVersionUnsupported()
    {
        var context = CreateContext("/api/v1/checkout-sessions", HttpMethods.Get, new Dictionary<string, string>
        {
            [ProtocolHeaders.UcpAgent] = "profile=\"https://agent.example.com/profile\", version=\"2026-02-01\""
        });
        var middleware = CreateMiddleware(_ => Task.CompletedTask, CreateSettings());

        await middleware.InvokeAsync(context, _notificationPublisher.Object, []);

        context.Response.StatusCode.ShouldBe(StatusCodes.Status400BadRequest);
        var body = await ReadBodyAsync(context);
        body.RootElement.GetProperty("error").GetString().ShouldBe("version_unsupported");
    }

    [Fact]
    public async Task InvokeAsync_AuthenticatorFailureOnTransactionalRoute_Returns401()
    {
        var context = CreateContext("/api/v1/orders/123", HttpMethods.Get, new Dictionary<string, string>
        {
            [ProtocolHeaders.UcpAgent] = "profile=\"https://agent.example.com/profile\"",
            [ProtocolHeaders.RequestSignature] = "sig",
            [ProtocolHeaders.RequestId] = Guid.NewGuid().ToString()
        });
        var middleware = CreateMiddleware(_ => Task.CompletedTask, CreateSettings());
        var authenticator = new Mock<IAgentAuthenticator>();
        authenticator.SetupGet(x => x.Alias).Returns(ProtocolAliases.Ucp);
        authenticator.Setup(x => x.AuthenticateAsync(It.IsAny<HttpRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AgentAuthenticationResult.Failure("bad signature", "invalid_request_signature"));

        await middleware.InvokeAsync(context, _notificationPublisher.Object, [authenticator.Object]);

        context.Response.StatusCode.ShouldBe(StatusCodes.Status401Unauthorized);
        var body = await ReadBodyAsync(context);
        body.RootElement.GetProperty("error").GetString().ShouldBe("invalid_request_signature");
    }

    [Fact]
    public async Task InvokeAsync_AuthenticatorSuccessOnTransactionalRoute_SetsIdentityAndCallsNext()
    {
        var context = CreateContext("/api/v1/orders/123", HttpMethods.Get, new Dictionary<string, string>
        {
            [ProtocolHeaders.UcpAgent] = "profile=\"https://agent.example.com/profile\"",
            [ProtocolHeaders.RequestSignature] = "sig",
            [ProtocolHeaders.RequestId] = Guid.NewGuid().ToString()
        });
        var nextCalled = false;
        var middleware = CreateMiddleware(_ => { nextCalled = true; return Task.CompletedTask; }, CreateSettings());
        var authenticator = new Mock<IAgentAuthenticator>();
        authenticator.SetupGet(x => x.Alias).Returns(ProtocolAliases.Ucp);
        authenticator.Setup(x => x.AuthenticateAsync(It.IsAny<HttpRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AgentAuthenticationResult.Success(new AgentIdentity
            {
                AgentId = "agent-1",
                ProfileUri = "https://agent.example.com/profile",
                Protocol = ProtocolAliases.Ucp,
                Capabilities = [UcpCapabilityNames.Checkout]
            }));

        await middleware.InvokeAsync(context, _notificationPublisher.Object, [authenticator.Object]);

        nextCalled.ShouldBeTrue();
        var identity = AgentAuthenticationMiddleware.GetAgentIdentity(context);
        identity.ShouldNotBeNull();
        identity.ProfileUri.ShouldBe("https://agent.example.com/profile");
    }

    [Fact]
    public async Task InvokeAsync_AgentOutsideAllowList_Returns403()
    {
        var settings = CreateSettings(["https://trusted.example.com"]);
        var context = CreateContext("/.well-known/ucp", HttpMethods.Get, new Dictionary<string, string>
        {
            [ProtocolHeaders.UcpAgent] = "profile=\"https://untrusted.example.com/profile\""
        });
        var middleware = CreateMiddleware(_ => Task.CompletedTask, settings);

        await middleware.InvokeAsync(context, _notificationPublisher.Object, []);

        context.Response.StatusCode.ShouldBe(StatusCodes.Status403Forbidden);
        var body = await ReadBodyAsync(context);
        body.RootElement.GetProperty("error").GetString().ShouldBe("forbidden");
    }

    private AgentAuthenticationMiddleware CreateMiddleware(RequestDelegate next, IOptions<ProtocolSettings> settings)
        => new(next, _logger.Object, settings);

    private static IOptions<ProtocolSettings> CreateSettings(IReadOnlyList<string>? allowedAgents = null)
        => Options.Create(new ProtocolSettings
        {
            RequireHttps = false,
            MinimumTlsVersion = "1.3",
            Ucp = new UcpSettings
            {
                Version = "2026-01-23",
                AllowedAgents = (allowedAgents ?? ["*"]).ToList()
            }
        });

    private static DefaultHttpContext CreateContext(
        string path,
        string method = "GET",
        IReadOnlyDictionary<string, string>? headers = null)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Request.Method = method;
        context.Response.Body = new MemoryStream();

        if (headers != null)
        {
            foreach (var (key, value) in headers)
            {
                context.Request.Headers[key] = value;
            }
        }

        return context;
    }

    private static async Task<JsonDocument> ReadBodyAsync(HttpContext context)
    {
        context.Response.Body.Position = 0;
        using var reader = new StreamReader(context.Response.Body, leaveOpen: true);
        var payload = await reader.ReadToEndAsync();
        return JsonDocument.Parse(payload);
    }
}
