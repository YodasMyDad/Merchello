using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;

namespace Merchello.Core.Protocols.Webhooks.Interfaces;

/// <summary>
/// Manages signing keys for webhook signatures.
/// </summary>
public interface ISigningKeyStore
{
    /// <summary>
    /// Gets the ECDSA private key for signing.
    /// </summary>
    ECDsa GetEcdsaPrivateKey(string keyId);

    /// <summary>
    /// Gets all public keys for verification.
    /// </summary>
    Task<IReadOnlyList<JsonWebKey>> GetPublicKeysAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets the current active key ID for signing.
    /// </summary>
    string GetCurrentKeyId();

    /// <summary>
    /// Rotates the signing keys (creates new key, marks old as expired).
    /// </summary>
    Task RotateKeysAsync(CancellationToken ct = default);
}
