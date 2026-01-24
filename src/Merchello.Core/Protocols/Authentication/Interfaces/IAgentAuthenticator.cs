using Microsoft.AspNetCore.Http;

namespace Merchello.Core.Protocols.Authentication.Interfaces;

/// <summary>
/// Authenticates external agents making protocol requests.
/// </summary>
public interface IAgentAuthenticator
{
    /// <summary>
    /// Protocol alias this authenticator handles (e.g., "ucp").
    /// </summary>
    string Alias { get; }

    /// <summary>
    /// Authenticates an incoming request.
    /// For UCP: Parses UCP-Agent header (RFC 8941 Dictionary Structured Field), validates signatures.
    /// </summary>
    Task<AgentAuthenticationResult> AuthenticateAsync(
        HttpRequest request,
        CancellationToken ct = default);
}
