using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Protocols.Webhooks.Models;

/// <summary>
/// Database entity for persisted ECDSA signing keys used for webhook signatures.
/// Keys are stored in PEM format and include public key coordinates for JWK export.
/// </summary>
public class SigningKey
{
    /// <summary>
    /// Unique identifier.
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// Human-readable key identifier (e.g., "key-2025-01-a1b2c3d4").
    /// Used in JWK exports and for key lookup.
    /// </summary>
    public required string KeyId { get; set; }

    /// <summary>
    /// Whether this is the currently active key for signing.
    /// Only one key should have this set to true at any time.
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// When this key was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// When this key expires (enters grace period).
    /// Null means the key is not expired. Keys in grace period can still
    /// be used for verification but not for new signatures.
    /// </summary>
    public DateTimeOffset? ExpiredAt { get; set; }

    /// <summary>
    /// Private key material stored as PEM-encoded PKCS#8.
    /// This is the full ECDsa private key for signing operations.
    /// </summary>
    public required string PrivateKeyPem { get; set; }

    /// <summary>
    /// Public key X coordinate (base64url encoded).
    /// Used for JWK export without needing to parse the private key.
    /// </summary>
    public required string PublicKeyX { get; set; }

    /// <summary>
    /// Public key Y coordinate (base64url encoded).
    /// Used for JWK export without needing to parse the private key.
    /// </summary>
    public required string PublicKeyY { get; set; }

    /// <summary>
    /// Algorithm identifier (always "ES256" for P-256 ECDSA with SHA-256).
    /// </summary>
    public string Algorithm { get; set; } = "ES256";

    /// <summary>
    /// Curve name (always "P-256" for nistP256).
    /// </summary>
    public string CurveName { get; set; } = "P-256";
}
