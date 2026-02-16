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

public class UcpHttpSecurityIntegrationTests
{
    private readonly Mock<IMerchelloNotificationPublisher> _notificationPublisher = new();
    private readonly Mock<ILogger<AgentAuthenticationMiddleware>> _logger = new();

    public UcpHttpSecurityIntegrationTests()
    {
        _notificationPublisher
            .Setup(x => x.PublishCancelableAsync(It.IsAny<AgentAuthenticatingNotification>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _notificationPublisher
            .Setup(x => x.PublishAsync(It.IsAny<AgentAuthenticatedNotification>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
    }

    [Fact]
    public async Task MissingUcpAgent_OnTransactionalPath_ReturnsUnauthorized()
    {
        var context = CreateContext("/api/v1/checkout-sessions", HttpMethods.Post, new Dictionary<string, string>
        {
            [ProtocolHeaders.RequestSignature] = "sig",
            [ProtocolHeaders.RequestId] = Guid.NewGuid().ToString(),
            [ProtocolHeaders.IdempotencyKey] = Guid.NewGuid().ToString()
        });
        var middleware = CreateMiddleware();

        await middleware.InvokeAsync(context, _notificationPublisher.Object, []);

        context.Response.StatusCode.ShouldBe(StatusCodes.Status401Unauthorized);
        var payload = await ReadResponseAsync(context);
        payload.RootElement.GetProperty("error").GetString().ShouldBe("missing_ucp_agent");
    }

    [Fact]
    public async Task InvalidRequestSignature_OnTransactionalPath_ReturnsUnauthorized()
    {
        var context = CreateContext("/api/v1/orders/123", HttpMethods.Get, new Dictionary<string, string>
        {
            [ProtocolHeaders.UcpAgent] = "profile=\"https://agent.example.com/profile\"",
            [ProtocolHeaders.RequestSignature] = "invalid-sig",
            [ProtocolHeaders.RequestId] = Guid.NewGuid().ToString()
        });

        var authenticator = new Mock<IAgentAuthenticator>();
        authenticator.SetupGet(x => x.Alias).Returns(ProtocolAliases.Ucp);
        authenticator
            .Setup(x => x.AuthenticateAsync(It.IsAny<HttpRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AgentAuthenticationResult.Failure("invalid", "invalid_request_signature"));

        var middleware = CreateMiddleware();

        await middleware.InvokeAsync(context, _notificationPublisher.Object, [authenticator.Object]);

        context.Response.StatusCode.ShouldBe(StatusCodes.Status401Unauthorized);
        var payload = await ReadResponseAsync(context);
        payload.RootElement.GetProperty("error").GetString().ShouldBe("invalid_request_signature");
    }

    [Fact]
    public async Task InvalidRequestId_AndMissingIdempotency_OnWriteRoutes_ReturnBadRequest()
    {
        var invalidRequestIdContext = CreateContext("/api/v1/orders/123", HttpMethods.Get, new Dictionary<string, string>
        {
            [ProtocolHeaders.UcpAgent] = "profile=\"https://agent.example.com/profile\"",
            [ProtocolHeaders.RequestSignature] = "sig",
            [ProtocolHeaders.RequestId] = "bad-guid"
        });

        var missingIdempotencyContext = CreateContext("/api/v1/checkout-sessions/2E895D8A-6E10-4386-8476-3A9B1A1F7B05/complete", HttpMethods.Post, new Dictionary<string, string>
        {
            [ProtocolHeaders.UcpAgent] = "profile=\"https://agent.example.com/profile\"",
            [ProtocolHeaders.RequestSignature] = "sig",
            [ProtocolHeaders.RequestId] = Guid.NewGuid().ToString()
        });

        var middleware = CreateMiddleware();

        await middleware.InvokeAsync(invalidRequestIdContext, _notificationPublisher.Object, []);
        await middleware.InvokeAsync(missingIdempotencyContext, _notificationPublisher.Object, []);

        invalidRequestIdContext.Response.StatusCode.ShouldBe(StatusCodes.Status400BadRequest);
        missingIdempotencyContext.Response.StatusCode.ShouldBe(StatusCodes.Status400BadRequest);

        var invalidRequestIdPayload = await ReadResponseAsync(invalidRequestIdContext);
        invalidRequestIdPayload.RootElement.GetProperty("error").GetString().ShouldBe("invalid_request_id");

        var missingIdempotencyPayload = await ReadResponseAsync(missingIdempotencyContext);
        missingIdempotencyPayload.RootElement.GetProperty("error").GetString().ShouldBe("missing_idempotency_key");
    }

    private AgentAuthenticationMiddleware CreateMiddleware()
    {
        var settings = Options.Create(new ProtocolSettings
        {
            RequireHttps = false,
            Ucp = new UcpSettings
            {
                Version = "2026-01-23",
                AllowedAgents = ["*"]
            }
        });

        return new AgentAuthenticationMiddleware(_ => Task.CompletedTask, _logger.Object, settings);
    }

    private static DefaultHttpContext CreateContext(
        string path,
        string method,
        IReadOnlyDictionary<string, string> headers)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Request.Method = method;
        context.Response.Body = new MemoryStream();

        foreach (var (key, value) in headers)
        {
            context.Request.Headers[key] = value;
        }

        return context;
    }

    private static async Task<JsonDocument> ReadResponseAsync(HttpContext context)
    {
        context.Response.Body.Position = 0;
        using var reader = new StreamReader(context.Response.Body, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        return JsonDocument.Parse(body);
    }
}
