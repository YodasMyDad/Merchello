using System.Text.Json;

namespace Merchello.Core.Fulfilment.Providers.SupplierDirect;

/// <summary>
/// Configuration settings for Supplier Direct fulfilment provider.
/// Serialized to/from FulfilmentProviderConfiguration.SettingsJson.
/// </summary>
public sealed record SupplierDirectSettings
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <summary>
    /// Default delivery method when supplier profile doesn't specify one.
    /// </summary>
    public SupplierDirectDeliveryMethod DefaultDeliveryMethod { get; init; } = SupplierDirectDeliveryMethod.Email;

    #region Email Settings

    /// <summary>
    /// Fallback supplier email address when supplier has no ContactEmail.
    /// </summary>
    public string? DefaultSupplierEmail { get; init; }

    /// <summary>
    /// Email subject template. Supports {OrderNumber}, {SupplierName} placeholders.
    /// </summary>
    public string EmailSubjectTemplate { get; init; } = SupplierDirectProviderDefaults.DefaultEmailSubjectTemplate;

    /// <summary>
    /// Whether to send a copy of supplier order emails to the store admin.
    /// </summary>
    public bool SendCopyToStore { get; init; } = true;

    #endregion

    #region FTP/SFTP Settings

    /// <summary>
    /// FTP/SFTP host address.
    /// </summary>
    public string? FtpHost { get; init; }

    /// <summary>
    /// FTP port (default: 21).
    /// </summary>
    public int FtpPort { get; init; } = SupplierDirectProviderDefaults.DefaultFtpPort;

    /// <summary>
    /// SFTP port (default: 22).
    /// </summary>
    public int SftpPort { get; init; } = SupplierDirectProviderDefaults.DefaultSftpPort;

    /// <summary>
    /// FTP/SFTP username.
    /// </summary>
    public string? FtpUsername { get; init; }

    /// <summary>
    /// FTP/SFTP password.
    /// </summary>
    public string? FtpPassword { get; init; }

    /// <summary>
    /// Remote directory path for file uploads.
    /// </summary>
    public string FtpRemotePath { get; init; } = SupplierDirectProviderDefaults.DefaultRemotePath;

    /// <summary>
    /// Whether to use SFTP instead of FTP. SFTP is more secure and recommended.
    /// </summary>
    public bool UseSftp { get; init; } = true;

    /// <summary>
    /// SFTP host key fingerprint for server validation.
    /// </summary>
    public string? SftpHostFingerprint { get; init; }

    /// <summary>
    /// Whether to use passive mode for FTP connections.
    /// </summary>
    public bool FtpPassiveMode { get; init; } = true;

    /// <summary>
    /// Explicit opt-in to allow insecure plain FTP mode.
    /// When false, only SFTP is allowed for file transfer delivery.
    /// </summary>
    public bool AllowInsecureFtp { get; init; }

    /// <summary>
    /// Whether to use TLS for FTP connections (FTPS).
    /// </summary>
    public bool FtpUseTls { get; init; } = true;

    /// <summary>
    /// Connection timeout in seconds.
    /// </summary>
    public int TimeoutSeconds { get; init; } = SupplierDirectProviderDefaults.DefaultTimeoutSeconds;

    /// <summary>
    /// Whether FTP/SFTP uploads should overwrite existing files.
    /// </summary>
    public bool FtpOverwriteExistingFiles { get; init; }

    #endregion

    #region CSV Settings

    /// <summary>
    /// File name pattern for CSV uploads.
    /// Supports {OrderNumber}, {OrderId} placeholders.
    /// </summary>
    public string FileNamePattern { get; init; } = "{OrderNumber}-{OrderId}.csv";

    /// <summary>
    /// JSON-encoded column mapping configuration for CSV generation.
    /// </summary>
    public string? CsvColumnMappingJson { get; init; }

    #endregion

    #region Validation

    /// <summary>
    /// Validates that minimum required settings are configured for the current delivery method.
    /// </summary>
    public bool IsValid => !GetValidationErrors().Any();

    /// <summary>
    /// Gets validation error messages for the current configuration.
    /// </summary>
    public IEnumerable<string> GetValidationErrors()
    {
        if (DefaultDeliveryMethod is not (SupplierDirectDeliveryMethod.Ftp or SupplierDirectDeliveryMethod.Sftp))
        {
            yield break;
        }

        if (string.IsNullOrWhiteSpace(FtpHost))
        {
            yield return "FTP/SFTP host is required";
        }

        if (string.IsNullOrWhiteSpace(FtpUsername))
        {
            yield return "FTP/SFTP username is required";
        }

        if (string.IsNullOrWhiteSpace(FtpPassword))
        {
            yield return "FTP/SFTP password is required";
        }

        if (TimeoutSeconds <= 0)
        {
            yield return "TimeoutSeconds must be greater than 0";
        }

        var activePort = DefaultDeliveryMethod == SupplierDirectDeliveryMethod.Sftp ? SftpPort : FtpPort;
        if (activePort <= 0)
        {
            yield return "FTP/SFTP port must be greater than 0";
        }

        if (DefaultDeliveryMethod == SupplierDirectDeliveryMethod.Ftp && !FtpUseTls && !AllowInsecureFtp)
        {
            yield return "Plain FTP (without TLS) requires explicit opt-in (AllowInsecureFtp = true)";
        }
    }

    #endregion

    #region Serialization

    /// <summary>
    /// Parses settings from JSON string.
    /// Handles stringly-typed values from dynamic configuration UIs.
    /// </summary>
    public static SupplierDirectSettings? FromJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            return new SupplierDirectSettings
            {
                DefaultDeliveryMethod = GetEnum(root, "DefaultDeliveryMethod", SupplierDirectDeliveryMethod.Email),
                DefaultSupplierEmail = GetString(root, "DefaultSupplierEmail"),
                EmailSubjectTemplate = GetString(root, "EmailSubjectTemplate") ?? SupplierDirectProviderDefaults.DefaultEmailSubjectTemplate,
                SendCopyToStore = GetBool(root, "SendCopyToStore", true),
                FtpHost = GetString(root, "FtpHost"),
                FtpPort = GetInt(root, "FtpPort", SupplierDirectProviderDefaults.DefaultFtpPort),
                SftpPort = GetInt(root, "SftpPort", SupplierDirectProviderDefaults.DefaultSftpPort),
                FtpUsername = GetString(root, "FtpUsername"),
                FtpPassword = GetString(root, "FtpPassword"),
                FtpRemotePath = GetString(root, "FtpRemotePath") ?? SupplierDirectProviderDefaults.DefaultRemotePath,
                UseSftp = GetBool(root, "UseSftp", true),
                SftpHostFingerprint = GetString(root, "SftpHostFingerprint"),
                FtpPassiveMode = GetBool(root, "FtpPassiveMode", true),
                AllowInsecureFtp = GetBool(root, "AllowInsecureFtp", false),
                FtpUseTls = GetBool(root, "FtpUseTls", true),
                TimeoutSeconds = GetInt(root, "TimeoutSeconds", SupplierDirectProviderDefaults.DefaultTimeoutSeconds),
                FtpOverwriteExistingFiles = GetBool(root, "FtpOverwriteExistingFiles", false),
                FileNamePattern = GetString(root, "FileNamePattern") ?? "{OrderNumber}-{OrderId}.csv",
                CsvColumnMappingJson = GetString(root, "CsvColumnMappingJson")
            };
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// Serializes settings to JSON string.
    /// </summary>
    public string ToJson() => JsonSerializer.Serialize(this, JsonOptions);

    #endregion

    private static string? GetString(JsonElement root, string propertyName)
    {
        if (!TryGetProperty(root, propertyName, out var value))
        {
            return null;
        }

        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString(),
            JsonValueKind.Number => value.GetRawText(),
            JsonValueKind.True => bool.TrueString.ToLowerInvariant(),
            JsonValueKind.False => bool.FalseString.ToLowerInvariant(),
            JsonValueKind.Null or JsonValueKind.Undefined => null,
            _ => value.ToString()
        };
    }

    private static bool GetBool(JsonElement root, string propertyName, bool defaultValue)
    {
        if (!TryGetProperty(root, propertyName, out var value))
        {
            return defaultValue;
        }

        if (value.ValueKind == JsonValueKind.True) return true;
        if (value.ValueKind == JsonValueKind.False) return false;

        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number))
        {
            return number != 0;
        }

        if (value.ValueKind == JsonValueKind.String)
        {
            var raw = value.GetString();
            if (bool.TryParse(raw, out var parsedBool))
            {
                return parsedBool;
            }

            if (int.TryParse(raw, out var parsedInt))
            {
                return parsedInt != 0;
            }
        }

        return defaultValue;
    }

    private static int GetInt(JsonElement root, string propertyName, int defaultValue)
    {
        if (!TryGetProperty(root, propertyName, out var value))
        {
            return defaultValue;
        }

        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var intValue))
        {
            return intValue;
        }

        if (value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), out var parsed))
        {
            return parsed;
        }

        return defaultValue;
    }

    private static SupplierDirectDeliveryMethod GetEnum(
        JsonElement root,
        string propertyName,
        SupplierDirectDeliveryMethod defaultValue)
    {
        if (!TryGetProperty(root, propertyName, out var value))
        {
            return defaultValue;
        }

        if (value.ValueKind == JsonValueKind.String &&
            Enum.TryParse<SupplierDirectDeliveryMethod>(value.GetString(), true, out var parsed))
        {
            return parsed;
        }

        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var rawInt))
        {
            var candidate = (SupplierDirectDeliveryMethod)rawInt;
            if (Enum.IsDefined(candidate))
            {
                return candidate;
            }
        }

        return defaultValue;
    }

    private static bool TryGetProperty(JsonElement root, string propertyName, out JsonElement value)
    {
        if (root.TryGetProperty(propertyName, out value))
        {
            return true;
        }

        foreach (var property in root.EnumerateObject())
        {
            if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }

        value = default;
        return false;
    }
}
