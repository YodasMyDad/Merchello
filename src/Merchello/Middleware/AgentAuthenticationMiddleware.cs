using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.Notifications;
using Merchello.Core.Protocols.UCP.Services.Interfaces;
using Merchello.Core.Notifications.Interfaces;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Connections.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Authentication;
using System.Globalization;

namespace Merchello.Middleware;

/// <summary>
/// Middleware that authenticates external agents making protocol requests.
/// Validates UCP-Agent headers and request signatures.
/// </summary>
public class AgentAuthenticationMiddleware(
    RequestDelegate next,
    ILogger<AgentAuthenticationMiddleware> logger,
    IOptions<ProtocolSettings> settings)
{
    private static readonly string[] ProtocolPaths = [
        "/.well-known/ucp",
        "/api/v1/checkout-sessions",
        "/api/v1/orders"
    ];

    public async Task InvokeAsync(
        HttpContext context,
        IMerchelloNotificationPublisher notificationPublisher,
        IUcpAgentProfileService agentProfileService)
    {
        // Only process protocol-related paths
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";
        if (!IsProtocolPath(path))
        {
            await next(context);
            return;
        }

        // Determine which protocol this is for
        var protocol = DetectProtocol(context.Request);
        if (string.IsNullOrEmpty(protocol))
        {
            await next(context);
            return;
        }

        // Enforce HTTPS/TLS requirements for protocol endpoints
        if (settings.Value.RequireHttps && !context.Request.IsHttps)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "https_required",
                message = "HTTPS is required for protocol endpoints."
            });
            return;
        }

        if (settings.Value.RequireHttps && !string.IsNullOrWhiteSpace(settings.Value.MinimumTlsVersion))
        {
            var handshake = context.Features.Get<ITlsHandshakeFeature>();
            var minTls = ParseTlsVersion(settings.Value.MinimumTlsVersion);
            var requestTls = GetTlsVersion(handshake?.Protocol ?? SslProtocols.None);

            if (minTls.HasValue && requestTls.HasValue && requestTls.Value < minTls.Value)
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "tls_version_unsupported",
                    message = $"Minimum TLS version {settings.Value.MinimumTlsVersion} is required."
                });
                return;
            }
        }

        // Check if authentication is required for this protocol
        var requiresAuth = protocol switch
        {
            ProtocolAliases.Ucp => settings.Value.Ucp.RequireAuthentication,
            _ => false
        };

        // Parse agent identity from headers
        var agentInfo = ParseAgentInfo(context.Request);
        var requestedVersion = GetRequestedProtocolVersion(context.Request);

        if (protocol == ProtocolAliases.Ucp &&
            !string.IsNullOrWhiteSpace(requestedVersion) &&
            IsVersionUnsupported(requestedVersion, settings.Value.Ucp.Version))
        {
            var versionError = ProtocolResponse.VersionUnsupported(
                requestedVersion,
                settings.Value.Ucp.Version);

            context.Response.StatusCode = versionError.StatusCode;
            await context.Response.WriteAsJsonAsync(new
            {
                error = versionError.Error?.Code,
                message = versionError.Error?.Message
            });
            return;
        }

        // Publish authenticating notification (allows handlers to block)
        var authenticatingNotification = new AgentAuthenticatingNotification(
            context.Request,
            protocol,
            agentInfo?.AgentId);

        await notificationPublisher.PublishCancelableAsync(authenticatingNotification, context.RequestAborted);

        if (authenticatingNotification.Cancel)
        {
            logger.LogWarning("Agent authentication blocked by notification handler: {Reason}",
                authenticatingNotification.CancelReason);

            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "access_denied",
                message = authenticatingNotification.CancelReason ?? "Agent access denied"
            });
            return;
        }

        // If authentication is required, validate the agent
        if (requiresAuth && agentInfo == null)
        {
            logger.LogWarning("Protocol request to {Path} missing required agent authentication", path);

            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "unauthorized",
                message = $"Missing required {ProtocolHeaders.UcpAgent} header"
            });
            return;
        }

        // Validate agent is allowed
        if (agentInfo != null && !IsAgentAllowed(agentInfo, protocol))
        {
            logger.LogWarning("Agent {AgentId} not in allowed list for protocol {Protocol}",
                agentInfo.AgentId, protocol);

            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "forbidden",
                message = "Agent not authorized for this merchant"
            });
            return;
        }

        // Populate agent capabilities from profile for well-known negotiation
        if (agentInfo != null &&
            protocol == ProtocolAliases.Ucp &&
            path.StartsWith("/.well-known/ucp", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var profile = await agentProfileService.GetProfileAsync(agentInfo.ProfileUri!, context.RequestAborted);
                var capabilities = profile?.Ucp?.Capabilities?
                    .Where(c => !string.IsNullOrWhiteSpace(c.Name))
                    .Select(c => c.Name!)
                    .ToList();

                if (capabilities is { Count: > 0 })
                {
                    agentInfo = new AgentIdentity
                    {
                        AgentId = agentInfo.AgentId,
                        ProfileUri = agentInfo.ProfileUri,
                        Protocol = agentInfo.Protocol,
                        Capabilities = capabilities
                    };
                }
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Failed to fetch agent profile capabilities for {ProfileUri}", agentInfo.ProfileUri);
            }
        }

        // Store agent identity in HttpContext for use by controllers
        if (agentInfo != null)
        {
            context.Items[AgentIdentityKey] = agentInfo;
        }

        // Publish authenticated notification
        if (agentInfo != null)
        {
            var authenticatedNotification = new AgentAuthenticatedNotification(agentInfo);
            await notificationPublisher.PublishAsync(authenticatedNotification, context.RequestAborted);
        }

        logger.LogDebug("Agent authentication successful for {Protocol} request to {Path}",
            protocol, path);

        await next(context);
    }

    private static bool IsProtocolPath(string path)
    {
        return ProtocolPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase));
    }

    private static string? DetectProtocol(HttpRequest request)
    {
        // Check for UCP-Agent header
        if (request.Headers.ContainsKey(ProtocolHeaders.UcpAgent))
        {
            return ProtocolAliases.Ucp;
        }

        // Check path
        var path = request.Path.Value?.ToLowerInvariant() ?? "";
        if (path.StartsWith("/.well-known/ucp"))
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

    private static string? GetRequestedProtocolVersion(HttpRequest request)
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

        return UcpAgentHeaderParser.GetVersion(headerValue);
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

        // Wildcard allows all agents
        if (allowedAgents.Contains("*"))
        {
            return true;
        }

        // Check if agent profile URI matches any allowed pattern
        return allowedAgents.Any(allowed =>
            agent.ProfileUri?.StartsWith(allowed, StringComparison.OrdinalIgnoreCase) == true ||
            agent.AgentId.Equals(allowed, StringComparison.OrdinalIgnoreCase));
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
