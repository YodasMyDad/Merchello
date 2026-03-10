using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.ProductFeeds.Services;

public class GoogleAutoDiscountService(
    IHttpClientFactory httpClientFactory,
    ICacheService cacheService,
    IOptions<ProductFeedSettings> settings,
    ILogger<GoogleAutoDiscountService> logger) : IGoogleAutoDiscountService
{
    private const string CacheKey = "merchello:google-auto-discount:public-key";
    private const string CacheTag = "merchello:google-auto-discount";
    private static readonly TimeSpan KeyCacheTtl = TimeSpan.FromHours(24);

    public async Task<GoogleAutoDiscountResult?> ValidateAndParseAsync(
        string pv2Token,
        string expectedMerchantId,
        CancellationToken ct = default)
    {
        try
        {
            var parts = pv2Token.Split('.');
            if (parts.Length != 3)
            {
                logger.LogDebug("Google auto discount JWT has invalid structure (expected 3 parts, got {Count}).", parts.Length);
                return null;
            }

            var headerJson = Base64UrlDecode(parts[0]);
            var payloadJson = Base64UrlDecode(parts[1]);
            var signature = Base64UrlDecodeBytes(parts[2]);

            if (headerJson == null || payloadJson == null || signature == null)
            {
                logger.LogDebug("Google auto discount JWT base64url decoding failed.");
                return null;
            }

            var payload = JsonSerializer.Deserialize<JsonElement>(payloadJson);

            // Verify merchant ID matches before doing expensive signature verification
            var merchantId = GetStringClaim(payload, "m");
            if (!string.Equals(merchantId, expectedMerchantId, StringComparison.Ordinal))
            {
                logger.LogDebug("Google auto discount merchant ID mismatch: expected {Expected}, got {Actual}.",
                    expectedMerchantId, merchantId);
                return null;
            }

            // Check expiration
            if (!payload.TryGetProperty("exp", out var expElement) || expElement.ValueKind != JsonValueKind.Number)
            {
                logger.LogDebug("Google auto discount JWT missing or invalid exp claim.");
                return null;
            }

            var expUnix = expElement.GetInt64();
            var expiresUtc = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;
            if (expiresUtc <= DateTime.UtcNow)
            {
                logger.LogDebug("Google auto discount JWT has expired (exp: {Expiry}).", expiresUtc);
                return null;
            }

            // Verify signature
            var publicKeyPem = await GetPublicKeyAsync(ct);
            if (string.IsNullOrWhiteSpace(publicKeyPem))
            {
                logger.LogWarning("Failed to retrieve Google auto discount public key.");
                return null;
            }

            var signedData = Encoding.UTF8.GetBytes($"{parts[0]}.{parts[1]}");
            if (!VerifyEs256Signature(publicKeyPem, signedData, signature))
            {
                logger.LogWarning("Google auto discount JWT signature verification failed.");
                return null;
            }

            // Parse remaining claims
            var discountedPrice = GetDecimalClaim(payload, "p");
            var discountPercentage = GetIntClaim(payload, "dp");
            var discountCode = GetStringClaim(payload, "dc");
            var currencyCode = GetStringClaim(payload, "c");
            var offerId = GetStringClaim(payload, "o");

            if (discountedPrice == null)
            {
                logger.LogDebug("Google auto discount JWT missing required price claim 'p'.");
                return null;
            }

            return new GoogleAutoDiscountResult
            {
                DiscountedPrice = discountedPrice.Value,
                DiscountPercentage = discountPercentage ?? 0,
                DiscountCode = discountCode ?? string.Empty,
                CurrencyCode = currencyCode ?? string.Empty,
                MerchantId = merchantId ?? string.Empty,
                OfferId = offerId ?? string.Empty,
                ExpiresUtc = expiresUtc
            };
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Unexpected error validating Google auto discount JWT.");
            return null;
        }
    }

    private async Task<string?> GetPublicKeyAsync(CancellationToken ct)
    {
        try
        {
            return await cacheService.GetOrCreateAsync(
                CacheKey,
                async token =>
                {
                    var client = httpClientFactory.CreateClient("GoogleAutoDiscount");
                    var response = await client.GetAsync(settings.Value.GoogleAutoDiscountPublicKeyUrl, token);
                    response.EnsureSuccessStatusCode();

                    var json = await response.Content.ReadAsStringAsync(token);
                    var doc = JsonDocument.Parse(json);

                    // The key JSON typically contains a "keys" array (JWK set) or a direct PEM.
                    // Handle both formats.
                    if (doc.RootElement.TryGetProperty("keys", out var keysArray) &&
                        keysArray.ValueKind == JsonValueKind.Array &&
                        keysArray.GetArrayLength() > 0)
                    {
                        // Return the first key as raw JSON for JWK processing
                        return keysArray[0].GetRawText();
                    }

                    // Try direct PEM key property
                    if (doc.RootElement.TryGetProperty("key", out var keyProp))
                    {
                        return keyProp.GetString();
                    }

                    // Return the entire response as-is for PEM format
                    return json;
                },
                KeyCacheTtl,
                [CacheTag],
                ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to fetch Google auto discount public key from {Url}.",
                settings.Value.GoogleAutoDiscountPublicKeyUrl);
            return null;
        }
    }

    private static bool VerifyEs256Signature(string publicKeyData, byte[] data, byte[] signature)
    {
        try
        {
            using var ecdsa = ECDsa.Create();

            // Try JWK format first
            if (publicKeyData.TrimStart().StartsWith('{'))
            {
                var jwk = JsonSerializer.Deserialize<JsonElement>(publicKeyData);
                if (jwk.TryGetProperty("x", out var xProp) && jwk.TryGetProperty("y", out var yProp))
                {
                    var x = Base64UrlDecodeBytes(xProp.GetString()!);
                    var y = Base64UrlDecodeBytes(yProp.GetString()!);
                    if (x != null && y != null)
                    {
                        var parameters = new ECParameters
                        {
                            Curve = ECCurve.NamedCurves.nistP256,
                            Q = new ECPoint { X = x, Y = y }
                        };
                        ecdsa.ImportParameters(parameters);
                    }
                    else
                    {
                        return false;
                    }
                }
                else
                {
                    return false;
                }
            }
            else
            {
                // PEM format
                ecdsa.ImportFromPem(publicKeyData);
            }

            // JWT ES256 uses IEEE P1363 format (r || s, 64 bytes)
            // If signature is in DER format, convert it
            if (signature.Length != 64)
            {
                return ecdsa.VerifyData(data, signature, HashAlgorithmName.SHA256, DSASignatureFormat.Rfc3279DerSequence);
            }

            return ecdsa.VerifyData(data, signature, HashAlgorithmName.SHA256, DSASignatureFormat.IeeeP1363FixedFieldConcatenation);
        }
        catch
        {
            return false;
        }
    }

    private static string? Base64UrlDecode(string input)
    {
        var bytes = Base64UrlDecodeBytes(input);
        return bytes != null ? Encoding.UTF8.GetString(bytes) : null;
    }

    private static byte[]? Base64UrlDecodeBytes(string input)
    {
        try
        {
            var padded = input
                .Replace('-', '+')
                .Replace('_', '/');

            switch (padded.Length % 4)
            {
                case 2: padded += "=="; break;
                case 3: padded += "="; break;
            }

            return Convert.FromBase64String(padded);
        }
        catch
        {
            return null;
        }
    }

    private static string? GetStringClaim(JsonElement payload, string name)
    {
        if (payload.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.String)
        {
            return prop.GetString();
        }

        return null;
    }

    private static decimal? GetDecimalClaim(JsonElement payload, string name)
    {
        if (payload.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.Number)
        {
            return prop.GetDecimal();
        }

        return null;
    }

    private static int? GetIntClaim(JsonElement payload, string name)
    {
        if (payload.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.Number)
        {
            return prop.GetInt32();
        }

        return null;
    }
}
