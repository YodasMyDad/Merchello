using System.Security.Cryptography;
using System.Text;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Protocols.Webhooks;

/// <summary>
/// Signs and verifies webhook payloads using ES256 (ECDSA with P-256 and SHA-256).
/// Implements RFC 7797 detached JWT signatures.
/// </summary>
public class WebhookSigner(
    ISigningKeyStore keyStore,
    ILogger<WebhookSigner> logger) : IWebhookSigner
{
    /// <inheritdoc />
    public async Task<string> SignAsync(string payload, string keyId, CancellationToken ct = default)
    {
        var key = await keyStore.GetEcdsaPrivateKeyAsync(keyId, ct);

        // Create header with b64=false for RFC 7797 unencoded payload
        var header = new Dictionary<string, object>
        {
            ["alg"] = "ES256",
            ["typ"] = "JWT",
            ["kid"] = keyId,
            ["b64"] = false,
            ["crit"] = new[] { "b64" }
        };

        var headerJson = System.Text.Json.JsonSerializer.Serialize(header);
        var headerBase64 = Base64UrlEncode(Encoding.UTF8.GetBytes(headerJson));

        // For RFC 7797 with b64=false, sign the raw payload bytes
        var signingInput = $"{headerBase64}.{payload}";
        var signingInputBytes = Encoding.UTF8.GetBytes(signingInput);

        var signatureBytes = key.SignData(signingInputBytes, HashAlgorithmName.SHA256);
        var signatureBase64 = Base64UrlEncode(signatureBytes);

        // Detached JWS format: header..signature (empty payload section)
        return $"{headerBase64}..{signatureBase64}";
    }

    /// <inheritdoc />
    public bool Verify(string payload, string signature, IReadOnlyList<JsonWebKey> signingKeys)
    {
        try
        {
            // Parse the detached JWS
            var parts = signature.Split('.');
            if (parts.Length != 3)
            {
                logger.LogWarning("Invalid JWS format: expected 3 parts, got {Count}", parts.Length);
                return false;
            }

            var headerBase64 = parts[0];
            // parts[1] should be empty for detached JWS
            var signatureBase64 = parts[2];

            // Parse header to get kid
            var headerJson = Encoding.UTF8.GetString(Base64UrlDecode(headerBase64));
            var header = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(headerJson);

            if (header == null || !header.TryGetValue("kid", out var kidObj))
            {
                logger.LogWarning("JWS header missing 'kid' claim");
                return false;
            }

            var keyId = kidObj?.ToString();
            if (string.IsNullOrEmpty(keyId))
            {
                logger.LogWarning("JWS header has empty 'kid' claim");
                return false;
            }

            // Find the matching key
            var jwk = signingKeys.FirstOrDefault(k => k.Kid == keyId);
            if (jwk == null)
            {
                logger.LogWarning("No signing key found with kid '{KeyId}'", keyId);
                return false;
            }

            // Verify b64=false is in the crit header
            // Note: JSON deserialization returns JsonElement, so we need to check it properly
            if (!header.TryGetValue("b64", out var b64Value))
            {
                logger.LogWarning("JWS header missing 'b64' claim");
                return false;
            }

            var b64IsFalse = b64Value switch
            {
                false => true,
                System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.False => true,
                _ => false
            };

            if (!b64IsFalse)
            {
                logger.LogWarning("JWS header 'b64' claim is not false");
                return false;
            }

            // Convert JWK to ECDSA public key
            var ecdsa = ConvertJwkToEcdsa(jwk);

            // Reconstruct signing input with raw payload (RFC 7797)
            var signingInput = $"{headerBase64}.{payload}";
            var signingInputBytes = Encoding.UTF8.GetBytes(signingInput);
            var signatureBytes = Base64UrlDecode(signatureBase64);

            return ecdsa.VerifyData(signingInputBytes, signatureBytes, HashAlgorithmName.SHA256);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to verify webhook signature");
            return false;
        }
    }

    private static ECDsa ConvertJwkToEcdsa(JsonWebKey jwk)
    {
        if (jwk.Kty != "EC" || jwk.Crv != "P-256")
        {
            throw new ArgumentException($"Unsupported key type/curve: {jwk.Kty}/{jwk.Crv}");
        }

        var ecdsa = ECDsa.Create(new ECParameters
        {
            Curve = ECCurve.NamedCurves.nistP256,
            Q = new ECPoint
            {
                X = Base64UrlDecode(jwk.X!),
                Y = Base64UrlDecode(jwk.Y!)
            }
        });

        return ecdsa;
    }

    private static string Base64UrlEncode(byte[] input)
    {
        var base64 = Convert.ToBase64String(input);
        return base64.Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    private static byte[] Base64UrlDecode(string input)
    {
        var padded = input.Replace('-', '+').Replace('_', '/');
        switch (padded.Length % 4)
        {
            case 2: padded += "=="; break;
            case 3: padded += "="; break;
        }
        return Convert.FromBase64String(padded);
    }
}
