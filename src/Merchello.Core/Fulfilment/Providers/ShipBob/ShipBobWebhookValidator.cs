using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;

namespace Merchello.Core.Fulfilment.Providers.ShipBob;

/// <summary>
/// Validates ShipBob webhook signatures using HMAC-SHA256.
/// </summary>
public sealed class ShipBobWebhookValidator
{
    /// <summary>
    /// Header containing the signature (format: v1,{base64-signature}).
    /// </summary>
    public const string SignatureHeader = "webhook-signature";

    /// <summary>
    /// Header containing the Unix timestamp.
    /// </summary>
    public const string TimestampHeader = "webhook-timestamp";

    /// <summary>
    /// Header containing the unique message ID (for deduplication).
    /// </summary>
    public const string MessageIdHeader = "webhook-id";

    /// <summary>
    /// Maximum age of timestamp in seconds before rejection (5 minutes).
    /// </summary>
    public const int MaxTimestampAgeSeconds = 300;

    /// <summary>
    /// Validates the webhook request signature and timestamp.
    /// </summary>
    /// <param name="request">The incoming HTTP request.</param>
    /// <param name="body">The raw request body as string.</param>
    /// <param name="webhookSecret">The webhook signing secret.</param>
    /// <returns>Validation result with message ID for deduplication.</returns>
    public ShipBobWebhookValidationResult Validate(HttpRequest request, string body, string webhookSecret)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(body);

        if (string.IsNullOrWhiteSpace(webhookSecret))
        {
            return ShipBobWebhookValidationResult.Failure("Webhook secret not configured");
        }

        // Extract headers
        var signatureHeader = GetHeaderValue(request, SignatureHeader);
        var timestampHeader = GetHeaderValue(request, TimestampHeader);
        var messageId = GetHeaderValue(request, MessageIdHeader);

        if (string.IsNullOrWhiteSpace(signatureHeader))
        {
            return ShipBobWebhookValidationResult.Failure($"Missing {SignatureHeader} header");
        }

        if (string.IsNullOrWhiteSpace(timestampHeader))
        {
            return ShipBobWebhookValidationResult.Failure($"Missing {TimestampHeader} header");
        }

        if (string.IsNullOrWhiteSpace(messageId))
        {
            return ShipBobWebhookValidationResult.Failure($"Missing {MessageIdHeader} header");
        }

        // Parse timestamp
        if (!long.TryParse(timestampHeader, out var timestamp))
        {
            return ShipBobWebhookValidationResult.Failure("Invalid timestamp format");
        }

        // Validate timestamp age (prevent replay attacks)
        var currentTimestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var age = currentTimestamp - timestamp;

        if (age < 0)
        {
            return ShipBobWebhookValidationResult.Failure("Timestamp is in the future");
        }

        if (age > MaxTimestampAgeSeconds)
        {
            return ShipBobWebhookValidationResult.Failure($"Timestamp expired (age: {age}s, max: {MaxTimestampAgeSeconds}s)");
        }

        // Parse signature (format: v1,{base64-signature})
        var signatureParts = signatureHeader.Split(',', 2);
        if (signatureParts.Length != 2 || signatureParts[0] != "v1")
        {
            return ShipBobWebhookValidationResult.Failure("Invalid signature format (expected v1,{signature})");
        }

        var providedSignature = signatureParts[1];

        // Compute expected signature
        // Signed payload format: {messageId}.{timestamp}.{body}
        var signedPayload = $"{messageId}.{timestamp}.{body}";
        var expectedSignature = ComputeHmacSha256(signedPayload, webhookSecret);

        // Constant-time comparison to prevent timing attacks
        if (!ConstantTimeCompare(providedSignature, expectedSignature))
        {
            return ShipBobWebhookValidationResult.Failure("Invalid signature");
        }

        return ShipBobWebhookValidationResult.Success(messageId);
    }

    /// <summary>
    /// Validates the webhook request signature and timestamp.
    /// </summary>
    /// <param name="headers">Dictionary of headers.</param>
    /// <param name="body">The raw request body.</param>
    /// <param name="webhookSecret">The webhook signing secret.</param>
    /// <returns>Validation result.</returns>
    public ShipBobWebhookValidationResult Validate(
        IDictionary<string, string> headers,
        string body,
        string webhookSecret)
    {
        ArgumentNullException.ThrowIfNull(headers);
        ArgumentNullException.ThrowIfNull(body);

        if (string.IsNullOrWhiteSpace(webhookSecret))
        {
            return ShipBobWebhookValidationResult.Failure("Webhook secret not configured");
        }

        // Extract headers (case-insensitive)
        headers.TryGetValue(SignatureHeader, out var signatureHeader);
        headers.TryGetValue(TimestampHeader, out var timestampHeader);
        headers.TryGetValue(MessageIdHeader, out var messageId);

        // Also try lowercase versions
        if (string.IsNullOrWhiteSpace(signatureHeader))
        {
            headers.TryGetValue(SignatureHeader.ToLowerInvariant(), out signatureHeader);
        }
        if (string.IsNullOrWhiteSpace(timestampHeader))
        {
            headers.TryGetValue(TimestampHeader.ToLowerInvariant(), out timestampHeader);
        }
        if (string.IsNullOrWhiteSpace(messageId))
        {
            headers.TryGetValue(MessageIdHeader.ToLowerInvariant(), out messageId);
        }

        if (string.IsNullOrWhiteSpace(signatureHeader))
        {
            return ShipBobWebhookValidationResult.Failure($"Missing {SignatureHeader} header");
        }

        if (string.IsNullOrWhiteSpace(timestampHeader))
        {
            return ShipBobWebhookValidationResult.Failure($"Missing {TimestampHeader} header");
        }

        if (string.IsNullOrWhiteSpace(messageId))
        {
            return ShipBobWebhookValidationResult.Failure($"Missing {MessageIdHeader} header");
        }

        // Parse timestamp
        if (!long.TryParse(timestampHeader, out var timestamp))
        {
            return ShipBobWebhookValidationResult.Failure("Invalid timestamp format");
        }

        // Validate timestamp age
        var currentTimestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var age = currentTimestamp - timestamp;

        if (age < 0)
        {
            return ShipBobWebhookValidationResult.Failure("Timestamp is in the future");
        }

        if (age > MaxTimestampAgeSeconds)
        {
            return ShipBobWebhookValidationResult.Failure($"Timestamp expired (age: {age}s, max: {MaxTimestampAgeSeconds}s)");
        }

        // Parse signature
        var signatureParts = signatureHeader.Split(',', 2);
        if (signatureParts.Length != 2 || signatureParts[0] != "v1")
        {
            return ShipBobWebhookValidationResult.Failure("Invalid signature format");
        }

        var providedSignature = signatureParts[1];

        // Compute expected signature
        var signedPayload = $"{messageId}.{timestamp}.{body}";
        var expectedSignature = ComputeHmacSha256(signedPayload, webhookSecret);

        if (!ConstantTimeCompare(providedSignature, expectedSignature))
        {
            return ShipBobWebhookValidationResult.Failure("Invalid signature");
        }

        return ShipBobWebhookValidationResult.Success(messageId);
    }

    private static string? GetHeaderValue(HttpRequest request, string headerName)
    {
        if (request.Headers.TryGetValue(headerName, out var values))
        {
            return values.FirstOrDefault();
        }

        // Try lowercase
        if (request.Headers.TryGetValue(headerName.ToLowerInvariant(), out values))
        {
            return values.FirstOrDefault();
        }

        return null;
    }

    private static string ComputeHmacSha256(string payload, string secret)
    {
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);

        using var hmac = new HMACSHA256(keyBytes);
        var hashBytes = hmac.ComputeHash(payloadBytes);
        return Convert.ToBase64String(hashBytes);
    }

    private static bool ConstantTimeCompare(string a, string b)
    {
        if (a.Length != b.Length)
        {
            return false;
        }

        var result = 0;
        for (var i = 0; i < a.Length; i++)
        {
            result |= a[i] ^ b[i];
        }

        return result == 0;
    }
}
