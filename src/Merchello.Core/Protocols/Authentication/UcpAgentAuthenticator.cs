using System.Text;
using Merchello.Core.Protocols.Authentication.Interfaces;
using Merchello.Core.Protocols.UCP.Models;
using Merchello.Core.Protocols.UCP.Services.Interfaces;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Protocols.Authentication;

/// <summary>
/// UCP authenticator for transactional protocol API requests.
/// </summary>
public class UcpAgentAuthenticator(
    IUcpAgentProfileService agentProfileService,
    IWebhookSigner webhookSigner,
    ILogger<UcpAgentAuthenticator> logger) : IAgentAuthenticator
{
    private static readonly string[] TransactionalPathPrefixes =
    [
        "/api/v1/checkout-sessions",
        "/api/v1/orders"
    ];

    public string Alias => ProtocolAliases.Ucp;

    public async Task<AgentAuthenticationResult> AuthenticateAsync(
        HttpRequest request,
        CancellationToken ct = default)
    {
        if (!request.Headers.TryGetValue(ProtocolHeaders.UcpAgent, out var rawAgentHeader) ||
            string.IsNullOrWhiteSpace(rawAgentHeader))
        {
            return AgentAuthenticationResult.Failure(
                $"Missing required {ProtocolHeaders.UcpAgent} header",
                "missing_ucp_agent");
        }

        var headerValue = rawAgentHeader.ToString();
        var agentInfo = UcpAgentHeaderParser.ParseAgentInfo(headerValue);
        if (agentInfo?.ProfileUri == null)
        {
            return AgentAuthenticationResult.Failure(
                $"Invalid {ProtocolHeaders.UcpAgent} header",
                "invalid_ucp_agent");
        }

        var profile = await agentProfileService.GetProfileAsync(agentInfo.ProfileUri, ct);
        if (profile == null)
        {
            return AgentAuthenticationResult.Failure(
                "Unable to resolve UCP agent profile",
                "agent_profile_unavailable");
        }

        var capabilityNames = profile.Ucp?.Capabilities?
            .Where(c => !string.IsNullOrWhiteSpace(c.Name))
            .Select(c => c.Name!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList() ?? [];

        if (!IsTransactionalPath(request.Path))
        {
            return AgentAuthenticationResult.Success(new AgentIdentity
            {
                AgentId = agentInfo.ProfileUri,
                ProfileUri = agentInfo.ProfileUri,
                Protocol = ProtocolAliases.Ucp,
                Capabilities = capabilityNames
            });
        }

        if (!request.Headers.TryGetValue(ProtocolHeaders.RequestSignature, out var rawSignature) ||
            string.IsNullOrWhiteSpace(rawSignature))
        {
            return AgentAuthenticationResult.Failure(
                $"Missing required {ProtocolHeaders.RequestSignature} header",
                "missing_request_signature");
        }

        var signingKeys = GetValidSigningKeys(profile);
        if (signingKeys.Count == 0)
        {
            return AgentAuthenticationResult.Failure(
                "Agent profile does not provide supported signing key material",
                "unsupported_agent_signing_keys");
        }

        var requestBody = await ReadRawBodyAsync(request, ct);
        var signature = rawSignature.ToString();
        if (!webhookSigner.Verify(requestBody, signature, signingKeys))
        {
            return AgentAuthenticationResult.Failure(
                "Request signature validation failed",
                "invalid_request_signature");
        }

        return AgentAuthenticationResult.Success(new AgentIdentity
        {
            AgentId = agentInfo.ProfileUri,
            ProfileUri = agentInfo.ProfileUri,
            Protocol = ProtocolAliases.Ucp,
            Capabilities = capabilityNames
        });
    }

    private static bool IsTransactionalPath(PathString path)
    {
        var value = path.Value ?? string.Empty;
        return TransactionalPathPrefixes.Any(prefix =>
            value.StartsWith(prefix, StringComparison.OrdinalIgnoreCase));
    }

    private static List<JsonWebKey> GetValidSigningKeys(UcpAgentProfile profile)
    {
        var keySource = profile.SigningKeys ?? profile.Ucp?.SigningKeys;
        if (keySource == null || keySource.Count == 0)
        {
            return [];
        }

        return keySource
            .Where(k =>
                !string.IsNullOrWhiteSpace(k.Kid) &&
                !string.IsNullOrWhiteSpace(k.Kty) &&
                !string.IsNullOrWhiteSpace(k.Crv) &&
                !string.IsNullOrWhiteSpace(k.X) &&
                !string.IsNullOrWhiteSpace(k.Y) &&
                string.Equals(k.Kty, "EC", StringComparison.OrdinalIgnoreCase) &&
                string.Equals(k.Crv, "P-256", StringComparison.OrdinalIgnoreCase))
            .Select(k => new JsonWebKey
            {
                Kid = k.Kid,
                Kty = k.Kty,
                Crv = k.Crv,
                X = k.X,
                Y = k.Y,
                Alg = "ES256",
                Use = "sig"
            })
            .ToList();
    }

    private async Task<string> ReadRawBodyAsync(HttpRequest request, CancellationToken ct)
    {
        try
        {
            request.EnableBuffering();
            if (request.Body.CanSeek)
            {
                request.Body.Position = 0;
            }

            using var reader = new StreamReader(
                request.Body,
                Encoding.UTF8,
                detectEncodingFromByteOrderMarks: false,
                leaveOpen: true);
            var body = await reader.ReadToEndAsync(ct);

            if (request.Body.CanSeek)
            {
                request.Body.Position = 0;
            }

            return body;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to read raw request body for UCP signature verification");
            return string.Empty;
        }
    }
}
