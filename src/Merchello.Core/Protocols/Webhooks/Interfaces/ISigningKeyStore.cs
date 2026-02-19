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
    Task<ECDsa> GetEcdsaPrivateKeyAsync(string keyId, CancellationToken ct = default);

    /// <summary>
    /// Gets all public keys for verification.
    /// </summary>
    Task<IReadOnlyList<JsonWebKey>> GetPublicKeysAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets the current active key ID for signing.
    /// </summary>
    Task<string> GetCurrentKeyIdAsync(CancellationToken ct = default);

    /// <summary>
    /// Rotates the signing keys (creates new key, marks old as expired).
    /// </summary>
    Task RotateKeysAsync(CancellationToken ct = default);

    /// <summary>
    /// Rotates signing keys when the active key age meets the configured threshold.
    /// Returns true when a rotation occurred.
    /// </summary>
    Task<bool> RotateKeysIfDueAsync(int rotationDays, CancellationToken ct = default);
}
