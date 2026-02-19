using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.UCP.Models;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Merchello.Middleware;
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
    ISigningKeyStore signingKeyStore,
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
        // Ensure adapters are loaded (triggers ExtensionManager discovery on first call)
        await protocolManager.GetAdaptersAsync(ct);

        // Check if the specific protocol is supported
        if (!protocolManager.IsProtocolSupported(protocol))
        {
            return NotFound(new { error = $"Protocol '{protocol}' is not supported" });
        }

        // Get agent identity from headers for capability negotiation
        var agentIdentity = AgentAuthenticationMiddleware.GetAgentIdentity(HttpContext) ?? ParseAgentIdentity();

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

    [HttpGet("ucp-test-agent/{agentId}")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(UcpAgentProfile), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetUcpTestAgentProfile(string agentId, CancellationToken ct)
    {
        var normalizedAgentId = string.IsNullOrWhiteSpace(agentId) ? null : agentId.Trim();
        if (normalizedAgentId == null)
        {
            return BadRequest(new { error = "AgentId is required." });
        }

        var publicKeys = await signingKeyStore.GetPublicKeysAsync(ct);
        var signingKeys = publicKeys
            .Where(k =>
                !string.IsNullOrWhiteSpace(k.Kid) &&
                !string.IsNullOrWhiteSpace(k.Kty) &&
                !string.IsNullOrWhiteSpace(k.Crv) &&
                !string.IsNullOrWhiteSpace(k.X) &&
                !string.IsNullOrWhiteSpace(k.Y))
            .Select(k => new UcpSigningKey
            {
                Kty = k.Kty!,
                Kid = k.Kid!,
                Crv = k.Crv!,
                X = k.X!,
                Y = k.Y!,
                Use = string.IsNullOrWhiteSpace(k.Use) ? "sig" : k.Use!,
                Alg = string.IsNullOrWhiteSpace(k.Alg) ? "ES256" : k.Alg!
            })
            .ToList();

        var capabilities = BuildSimulatedAgentCapabilities();
        var profile = new UcpAgentProfile
        {
            Name = $"Merchello UCP Test Agent ({normalizedAgentId})",
            Ucp = new UcpAgentProfileMetadata
            {
                Version = settings.Value.Ucp.Version,
                Capabilities = capabilities,
                SigningKeys = signingKeys
            },
            SigningKeys = signingKeys
        };

        Response.Headers.CacheControl = $"public, max-age={settings.Value.ManifestCacheDurationMinutes * 60}";
        return Ok(profile);
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
        // Check if UCP Identity Linking capability is enabled
        if (!settings.Value.Ucp.Capabilities.IdentityLinking)
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
        if (!Request.Headers.TryGetValue(ProtocolHeaders.UcpAgent, out var agentHeader))
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
            Protocol = ProtocolAliases.Ucp,
            Capabilities = [] // Will be populated from profile fetch if needed
        };
    }

    private List<UcpAgentCapability> BuildSimulatedAgentCapabilities()
    {
        List<UcpAgentCapability> capabilities = [];
        var protocolSettings = settings.Value.Ucp;

        if (protocolSettings.Capabilities.Checkout)
        {
            capabilities.Add(new UcpAgentCapability
            {
                Name = UcpCapabilityNames.Checkout,
                Version = protocolSettings.Version
            });

            if (protocolSettings.Extensions.Discount)
            {
                capabilities.Add(new UcpAgentCapability
                {
                    Name = UcpExtensionNames.Discount,
                    Version = protocolSettings.Version
                });
            }

            if (protocolSettings.Extensions.Fulfillment)
            {
                capabilities.Add(new UcpAgentCapability
                {
                    Name = UcpExtensionNames.Fulfillment,
                    Version = protocolSettings.Version
                });
            }

            if (protocolSettings.Extensions.BuyerConsent)
            {
                capabilities.Add(new UcpAgentCapability
                {
                    Name = UcpExtensionNames.BuyerConsent,
                    Version = protocolSettings.Version
                });
            }

            if (protocolSettings.Extensions.Ap2Mandates)
            {
                capabilities.Add(new UcpAgentCapability
                {
                    Name = UcpExtensionNames.Ap2Mandates,
                    Version = protocolSettings.Version
                });
            }
        }

        if (protocolSettings.Capabilities.Order)
        {
            capabilities.Add(new UcpAgentCapability
            {
                Name = UcpCapabilityNames.Order,
                Version = protocolSettings.Version
            });
        }

        if (protocolSettings.Capabilities.IdentityLinking)
        {
            capabilities.Add(new UcpAgentCapability
            {
                Name = UcpCapabilityNames.IdentityLinking,
                Version = protocolSettings.Version
            });
        }

        return capabilities;
    }
}
