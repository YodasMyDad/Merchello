using System.Text.RegularExpressions;

namespace Merchello.Core.Fulfilment.Providers.SupplierDirect;

/// <summary>
/// Utility for redacting sensitive information from logs and timeline notes.
/// </summary>
public static partial class SupplierDirectSecretRedactor
{
    private const string RedactedPlaceholder = "[REDACTED]";

    /// <summary>
    /// Redacts passwords from FTP connection strings and error messages.
    /// </summary>
    public static string RedactPassword(string? input)
    {
        if (string.IsNullOrEmpty(input))
            return input ?? string.Empty;

        // Redact password parameter patterns
        // ftp://user:password@host -> ftp://user:[REDACTED]@host
        var result = FtpUrlPasswordRegex().Replace(input, $"$1{RedactedPlaceholder}$3");

        // password=xxx -> password=[REDACTED]
        result = PasswordParameterRegex().Replace(result, $"$1{RedactedPlaceholder}");

        return result;
    }

    /// <summary>
    /// Redacts FTP host fingerprints which could be used for targeted attacks.
    /// </summary>
    public static string RedactFingerprint(string? input)
    {
        if (string.IsNullOrEmpty(input))
            return input ?? string.Empty;

        // Redact SSH fingerprint patterns (sha256:xxx, md5:xxx, or raw hex)
        var result = LabeledSshFingerprintRegex().Replace(input, $"$1{RedactedPlaceholder}");
        result = RawSshFingerprintRegex().Replace(result, RedactedPlaceholder);

        return result;
    }

    /// <summary>
    /// Redacts all secrets from a string for safe logging.
    /// </summary>
    public static string RedactSecrets(string? input)
    {
        var result = RedactPassword(input);
        result = RedactFingerprint(result);
        return result;
    }

    /// <summary>
    /// Creates a safe connection description for logging.
    /// </summary>
    public static string SafeConnectionDescription(string? host, int? port, string? username)
    {
        var portStr = port.HasValue ? $":{port}" : "";
        var userStr = !string.IsNullOrEmpty(username) ? $"{username}@" : "";
        return $"{userStr}{host ?? "unknown"}{portStr}";
    }

    // Regex for ftp://user:password@host patterns
    [GeneratedRegex(@"(://[^:]+:)([^@]+)(@)", RegexOptions.IgnoreCase)]
    private static partial Regex FtpUrlPasswordRegex();

    // Regex for password=value or pwd=value patterns
    [GeneratedRegex(@"((?:password|pwd|passwd)\s*[=:]\s*)([^\s;&]+)", RegexOptions.IgnoreCase)]
    private static partial Regex PasswordParameterRegex();

    // Regex for labeled SSH fingerprint patterns.
    [GeneratedRegex(@"((?:fingerprint|sha256|md5)[=:]?\s*)([a-f0-9:+/=]{20,})", RegexOptions.IgnoreCase)]
    private static partial Regex LabeledSshFingerprintRegex();

    // Regex for raw SSH fingerprint values without an explicit label.
    [GeneratedRegex(@"\b(?:[a-f0-9]{2}(?::[a-f0-9]{2}){10,}|[a-f0-9]{32,})\b", RegexOptions.IgnoreCase)]
    private static partial Regex RawSshFingerprintRegex();
}
