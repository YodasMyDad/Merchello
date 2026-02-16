using System.Globalization;
using System.Security.Authentication;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Authentication.Interfaces;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.Notifications;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Connections.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Middleware;

/// <summary>
/// Middleware that authenticates external agents making protocol requests.
/// </summary>
public class AgentAuthenticationMiddleware(
    RequestDelegate next,
    ILogger<AgentAuthenticationMiddleware> logger,
    IOptions<ProtocolSettings> settings)
{
    private static readonly string[] ProtocolPaths =
    [
        "/.well-known/ucp",
        "/api/v1/checkout-sessions",
        "/api/v1/orders"
    ];

    private static readonly string[] TransactionalUcpPaths =
    [
        "/api/v1/checkout-sessions",
        "/api/v1/orders"
    ];

    public async Task InvokeAsync(
        HttpContext context,
        IMerchelloNotificationPublisher notificationPublisher,
        IEnumerable<IAgentAuthenticator> authenticators)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;
        if (!IsProtocolPath(path))
        {
            await next(context);
            return;
        }

        var protocol = DetectProtocol(context.Request);
        if (string.IsNullOrEmpty(protocol))
        {
            await next(context);
            return;
        }

        if (settings.Value.RequireHttps && !context.Request.IsHttps)
        {
            await WriteErrorAsync(
                context,
                StatusCodes.Status400BadRequest,
                "https_required",
                "HTTPS is required for protocol endpoints.");
            return;
        }

        if (settings.Value.RequireHttps && !string.IsNullOrWhiteSpace(settings.Value.MinimumTlsVersion))
        {
            var handshake = context.Features.Get<ITlsHandshakeFeature>();
            var minTls = ParseTlsVersion(settings.Value.MinimumTlsVersion);
            var requestTls = GetTlsVersion(handshake?.Protocol ?? SslProtocols.None);

            if (minTls.HasValue && requestTls.HasValue && requestTls.Value < minTls.Value)
            {
                await WriteErrorAsync(
                    context,
                    StatusCodes.Status400BadRequest,
                    "tls_version_unsupported",
                    $"Minimum TLS version {settings.Value.MinimumTlsVersion} is required.");
                return;
            }
        }

        if (protocol == ProtocolAliases.Ucp &&
            context.Request.Headers.TryGetValue(ProtocolHeaders.UcpAgent, out var agentHeaderValue) &&
            !string.IsNullOrWhiteSpace(agentHeaderValue))
        {
            var requestedVersion = UcpAgentHeaderParser.GetVersion(agentHeaderValue!);
            if (!string.IsNullOrWhiteSpace(requestedVersion) &&
                IsVersionUnsupported(requestedVersion, settings.Value.Ucp.Version))
            {
                var versionError = ProtocolResponse.VersionUnsupported(
                    requestedVersion,
                    settings.Value.Ucp.Version);

                await WriteErrorAsync(
                    context,
                    versionError.StatusCode,
                    versionError.Error?.Code ?? "version_unsupported",
                    versionError.Error?.Message ?? "Unsupported protocol version.");
                return;
            }
        }

        var isTransactionalUcp = protocol == ProtocolAliases.Ucp && IsTransactionalUcpPath(path);
        if (isTransactionalUcp)
        {
            if (!context.Request.Headers.ContainsKey(ProtocolHeaders.UcpAgent))
            {
                await WriteErrorAsync(
                    context,
                    StatusCodes.Status401Unauthorized,
                    "missing_ucp_agent",
                    $"Missing required {ProtocolHeaders.UcpAgent} header");
                return;
            }

            if (!context.Request.Headers.ContainsKey(ProtocolHeaders.RequestSignature))
            {
                await WriteErrorAsync(
                    context,
                    StatusCodes.Status401Unauthorized,
                    "missing_request_signature",
                    $"Missing required {ProtocolHeaders.RequestSignature} header");
                return;
            }

            if (!context.Request.Headers.TryGetValue(ProtocolHeaders.RequestId, out var requestIdHeader) ||
                string.IsNullOrWhiteSpace(requestIdHeader))
            {
                await WriteErrorAsync(
                    context,
                    StatusCodes.Status400BadRequest,
                    "missing_request_id",
                    $"Missing required {ProtocolHeaders.RequestId} header");
                return;
            }

            if (!Guid.TryParse(requestIdHeader.ToString(), out _))
            {
                await WriteErrorAsync(
                    context,
                    StatusCodes.Status400BadRequest,
                    "invalid_request_id",
                    $"{ProtocolHeaders.RequestId} must be a valid GUID");
                return;
            }

            if (RequiresIdempotencyKey(context.Request) &&
                (!context.Request.Headers.TryGetValue(ProtocolHeaders.IdempotencyKey, out var idempotencyKeyHeader) ||
                 string.IsNullOrWhiteSpace(idempotencyKeyHeader)))
            {
                await WriteErrorAsync(
                    context,
                    StatusCodes.Status400BadRequest,
                    "missing_idempotency_key",
                    $"Missing required {ProtocolHeaders.IdempotencyKey} header");
                return;
            }
        }

        var agentInfo = ParseAgentInfo(context.Request);
        var authenticatingNotification = new AgentAuthenticatingNotification(
            context.Request,
            protocol,
            agentInfo?.AgentId);

        await notificationPublisher.PublishCancelableAsync(authenticatingNotification, context.RequestAborted);
        if (authenticatingNotification.Cancel)
        {
            logger.LogWarning("Agent authentication blocked by notification handler: {Reason}",
                authenticatingNotification.CancelReason);

            await WriteErrorAsync(
                context,
                StatusCodes.Status403Forbidden,
                "access_denied",
                authenticatingNotification.CancelReason ?? "Agent access denied");
            return;
        }

        var authenticator = authenticators.FirstOrDefault(a =>
            string.Equals(a.Alias, protocol, StringComparison.OrdinalIgnoreCase));

        if (authenticator != null && (isTransactionalUcp || context.Request.Headers.ContainsKey(ProtocolHeaders.UcpAgent)))
        {
            var authResult = await authenticator.AuthenticateAsync(context.Request, context.RequestAborted);
            if (!authResult.IsAuthenticated)
            {
                if (isTransactionalUcp)
                {
                    await WriteErrorAsync(
                        context,
                        StatusCodes.Status401Unauthorized,
                        authResult.ErrorCode ?? "unauthorized",
                        authResult.ErrorMessage ?? "Authentication failed");
                    return;
                }

                logger.LogDebug("Ignoring negotiable UCP auth failure on {Path}: {Code} {Message}",
                    path,
                    authResult.ErrorCode,
                    authResult.ErrorMessage);
            }
            else
            {
                agentInfo = authResult.Identity;
            }
        }

        if (agentInfo != null && !IsAgentAllowed(agentInfo, protocol))
        {
            logger.LogWarning("Agent {AgentId} not in allowed list for protocol {Protocol}",
                agentInfo.AgentId,
                protocol);

            await WriteErrorAsync(
                context,
                StatusCodes.Status403Forbidden,
                "forbidden",
                "Agent not authorized for this merchant");
            return;
        }

        if (agentInfo != null)
        {
            context.Items[AgentIdentityKey] = agentInfo;
            await notificationPublisher.PublishAsync(
                new AgentAuthenticatedNotification(agentInfo),
                context.RequestAborted);
        }

        await next(context);
    }

    private static bool IsProtocolPath(string path)
        => ProtocolPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase));

    private static bool IsTransactionalUcpPath(string path)
        => TransactionalUcpPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase));

    private static bool RequiresIdempotencyKey(HttpRequest request)
    {
        var path = request.Path.Value?.ToLowerInvariant() ?? string.Empty;
        if (HttpMethods.IsPut(request.Method) && path.StartsWith("/api/v1/checkout-sessions/", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (HttpMethods.IsPost(request.Method))
        {
            if (path.Equals("/api/v1/checkout-sessions", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            if (path.StartsWith("/api/v1/checkout-sessions/", StringComparison.OrdinalIgnoreCase) &&
                path.EndsWith("/complete", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static string? DetectProtocol(HttpRequest request)
    {
        var path = request.Path.Value?.ToLowerInvariant() ?? string.Empty;
        if (path.StartsWith("/.well-known/ucp", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/api/v1/checkout-sessions", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/api/v1/orders", StringComparison.OrdinalIgnoreCase))
        {
            return ProtocolAliases.Ucp;
        }

        if (request.Headers.ContainsKey(ProtocolHeaders.UcpAgent))
        {
            return ProtocolAliases.Ucp;
        }

        return null;
    }

    private static AgentIdentity? ParseAgentInfo(HttpRequest request)
    {
        if (!request.Headers.TryGetValue(ProtocolHeaders.UcpAgent, out var agentHeader))
        {
            return null;
        }

        var headerValue = agentHeader.ToString();
        if (string.IsNullOrWhiteSpace(headerValue))
        {
            return null;
        }

        var profileUri = UcpAgentHeaderParser.GetProfileUri(headerValue);
        if (string.IsNullOrEmpty(profileUri))
        {
            return null;
        }

        return new AgentIdentity
        {
            AgentId = profileUri,
            ProfileUri = profileUri,
            Protocol = ProtocolAliases.Ucp,
            Capabilities = []
        };
    }

    private static bool IsVersionUnsupported(string requestedVersion, string supportedVersion)
    {
        if (TryParseDateVersion(requestedVersion, out var requestedDate) &&
            TryParseDateVersion(supportedVersion, out var supportedDate))
        {
            return requestedDate > supportedDate;
        }

        if (Version.TryParse(requestedVersion, out var requestedSemVer) &&
            Version.TryParse(supportedVersion, out var supportedSemVer))
        {
            return requestedSemVer > supportedSemVer;
        }

        return false;
    }

    private static bool TryParseDateVersion(string value, out DateOnly version)
    {
        return DateOnly.TryParseExact(
            value,
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out version);
    }

    private static int? ParseTlsVersion(string value) => value.Trim().ToLowerInvariant() switch
    {
        "1.0" or "tls1.0" or "tls1" => 10,
        "1.1" or "tls1.1" => 11,
        "1.2" or "tls1.2" => 12,
        "1.3" or "tls1.3" => 13,
        _ => null
    };

    private static int? ParseTlsProtocolName(string value) => value.Trim().ToLowerInvariant() switch
    {
        "tls" => 10,
        "tls11" => 11,
        "tls12" => 12,
        "tls13" => 13,
        _ => null
    };

    private static int? GetTlsVersion(SslProtocols protocol)
    {
        var name = protocol.ToString();
        if (string.IsNullOrWhiteSpace(name))
        {
            return null;
        }

        var parts = name.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        int? maxVersion = null;

        foreach (var part in parts)
        {
            var parsed = ParseTlsProtocolName(part);
            if (parsed.HasValue && (!maxVersion.HasValue || parsed.Value > maxVersion.Value))
            {
                maxVersion = parsed.Value;
            }
        }

        return maxVersion;
    }

    private bool IsAgentAllowed(AgentIdentity agent, string protocol)
    {
        var allowedAgents = protocol switch
        {
            ProtocolAliases.Ucp => settings.Value.Ucp.AllowedAgents,
            _ => ["*"]
        };

        if (allowedAgents.Contains("*"))
        {
            return true;
        }

        return allowedAgents.Any(allowed =>
            agent.ProfileUri?.StartsWith(allowed, StringComparison.OrdinalIgnoreCase) == true ||
            agent.AgentId.Equals(allowed, StringComparison.OrdinalIgnoreCase));
    }

    private static async Task WriteErrorAsync(
        HttpContext context,
        int statusCode,
        string errorCode,
        string message)
    {
        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(new
        {
            error = errorCode,
            message
        });
    }

    /// <summary>
    /// Key used to store agent identity in HttpContext.Items.
    /// </summary>
    public const string AgentIdentityKey = "Merchello.AgentIdentity";

    /// <summary>
    /// Gets the authenticated agent identity from the HttpContext.
    /// </summary>
    public static AgentIdentity? GetAgentIdentity(HttpContext context)
    {
        return context.Items.TryGetValue(AgentIdentityKey, out var value)
            ? value as AgentIdentity
            : null;
    }
}
