using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Merchello.Controllers;

/// <summary>
/// Controller for protocol discovery endpoints at /.well-known/{protocol}.
/// </summary>
[ApiController]
[Route(".well-known")]
[AllowAnonymous]
public class WellKnownController(
    ICommerceProtocolManager protocolManager,
    IOptions<ProtocolSettings> settings) : ControllerBase
{
    /// <summary>
    /// Gets the protocol manifest/profile for discovery.
    /// </summary>
    /// <param name="protocol">The protocol alias (e.g., "ucp").</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The protocol manifest or 404 if not found/disabled.</returns>
    [HttpGet("{protocol}")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetManifest(string protocol, CancellationToken ct)
    {
        // Check if protocols are enabled globally
        if (!settings.Value.Enabled)
        {
            return NotFound(new { error = "Protocol endpoints are disabled" });
        }

        // Check if the specific protocol is supported
        if (!protocolManager.IsProtocolSupported(protocol))
        {
            return NotFound(new { error = $"Protocol '{protocol}' is not supported" });
        }

        // Get agent identity from headers for capability negotiation
        var agentIdentity = ParseAgentIdentity();

        // Get the manifest (negotiated if agent provides capabilities)
        var manifest = await protocolManager.GetNegotiatedManifestAsync(protocol, agentIdentity, ct);
        if (manifest == null)
        {
            return NotFound(new { error = $"Protocol '{protocol}' manifest not available" });
        }

        // Add cache headers per spec recommendation
        Response.Headers.CacheControl = $"public, max-age={settings.Value.ManifestCacheDurationMinutes * 60}";

        return Ok(manifest);
    }

    /// <summary>
    /// OAuth 2.0 Authorization Server Metadata endpoint.
    /// Only available when Identity Linking capability is enabled.
    /// </summary>
    [HttpGet("oauth-authorization-server")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetOAuthMetadata()
    {
        // Check if UCP Identity Linking is enabled
        if (!settings.Value.Enabled || !settings.Value.Ucp.Enabled || !settings.Value.Ucp.Capabilities.IdentityLinking)
        {
            return NotFound(new { error = "OAuth metadata not available" });
        }

        // Return OAuth 2.0 Authorization Server Metadata per RFC 8414
        var baseUrl = $"{Request.Scheme}://{Request.Host}";

        var metadata = new
        {
            issuer = baseUrl,
            authorization_endpoint = $"{baseUrl}/oauth/authorize",
            token_endpoint = $"{baseUrl}/oauth/token",
            revocation_endpoint = $"{baseUrl}/oauth/revoke",
            scopes_supported = new[] { "ucp:scopes:checkout_session" },
            response_types_supported = new[] { "code" },
            grant_types_supported = new[] { "authorization_code", "refresh_token" },
            token_endpoint_auth_methods_supported = new[] { "client_secret_basic" },
            code_challenge_methods_supported = new[] { "S256" }
        };

        return Ok(metadata);
    }

    private AgentIdentity? ParseAgentIdentity()
    {
        // Check for UCP-Agent header
        if (!Request.Headers.TryGetValue(ProtocolConstants.Headers.UcpAgent, out var agentHeader))
        {
            return null;
        }

        var headerValue = agentHeader.ToString();
        if (string.IsNullOrWhiteSpace(headerValue))
        {
            return null;
        }

        // Parse profile using the shared UCP header parser
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
            Capabilities = [] // Will be populated from profile fetch if needed
        };
    }
}
