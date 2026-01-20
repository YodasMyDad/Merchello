using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.Notifications;
using Merchello.Core.Notifications.Interfaces;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

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
        IMerchelloNotificationPublisher notificationPublisher)
    {
        // Skip if protocols are disabled
        if (!settings.Value.Enabled)
        {
            await next(context);
            return;
        }

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

        // Check if authentication is required for this protocol
        var requiresAuth = protocol switch
        {
            ProtocolConstants.Protocols.Ucp => settings.Value.Ucp.RequireAuthentication,
            _ => false
        };

        // Parse agent identity from headers
        var agentInfo = ParseAgentInfo(context.Request);

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
                message = $"Missing required {ProtocolConstants.Headers.UcpAgent} header"
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
        if (request.Headers.ContainsKey(ProtocolConstants.Headers.UcpAgent))
        {
            return ProtocolConstants.Protocols.Ucp;
        }

        // Check path
        var path = request.Path.Value?.ToLowerInvariant() ?? "";
        if (path.StartsWith("/.well-known/ucp"))
        {
            return ProtocolConstants.Protocols.Ucp;
        }

        return null;
    }

    private static AgentIdentity? ParseAgentInfo(HttpRequest request)
    {
        if (!request.Headers.TryGetValue(ProtocolConstants.Headers.UcpAgent, out var agentHeader))
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
            Protocol = ProtocolConstants.Protocols.Ucp,
            Capabilities = []
        };
    }

    private bool IsAgentAllowed(AgentIdentity agent, string protocol)
    {
        var allowedAgents = protocol switch
        {
            ProtocolConstants.Protocols.Ucp => settings.Value.Ucp.AllowedAgents,
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

/// <summary>
/// Extension methods for adding agent authentication middleware.
/// </summary>
public static class AgentAuthenticationMiddlewareExtensions
{
    /// <summary>
    /// Adds agent authentication middleware to the pipeline.
    /// </summary>
    public static IApplicationBuilder UseAgentAuthentication(this IApplicationBuilder app)
    {
        return app.UseMiddleware<AgentAuthenticationMiddleware>();
    }
}
