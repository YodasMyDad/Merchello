using Microsoft.IdentityModel.Tokens;

namespace Merchello.Core.Protocols.Webhooks.Interfaces;

/// <summary>
/// Signs and verifies webhook payloads using detached JWT (RFC 7797).
/// </summary>
public interface IWebhookSigner
{
    /// <summary>
    /// Signs a webhook payload.
    /// </summary>
    /// <param name="payload">JSON payload to sign</param>
    /// <param name="keyId">Key ID from signing_keys</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>Detached JWT signature</returns>
    Task<string> SignAsync(string payload, string keyId, CancellationToken ct = default);

    /// <summary>
    /// Verifies a webhook signature.
    /// </summary>
    /// <param name="payload">JSON payload</param>
    /// <param name="signature">Request-Signature header value</param>
    /// <param name="signingKeys">Public keys from /.well-known/ucp</param>
    bool Verify(string payload, string signature, IReadOnlyList<JsonWebKey> signingKeys);
}
