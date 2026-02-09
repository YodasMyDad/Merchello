using System.Text.Json;

namespace Merchello.Core.Fulfilment.Providers.SupplierDirect.Models;

/// <summary>
/// Supplier-level delivery profile for Supplier Direct fulfilment.
/// Stored in Supplier.ExtendedData["Fulfilment:SupplierDirect:Profile"].
/// </summary>
public record SupplierDirectProfile
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <summary>
    /// Delivery method for this supplier.
    /// </summary>
    public SupplierDirectDeliveryMethod DeliveryMethod { get; init; } = SupplierDirectDeliveryMethod.Email;

    /// <summary>
    /// Email-specific settings (when DeliveryMethod is Email).
    /// </summary>
    public EmailDeliverySettings? EmailSettings { get; init; }

    /// <summary>
    /// FTP/SFTP-specific settings (when DeliveryMethod is Ftp or Sftp).
    /// </summary>
    public FtpDeliverySettings? FtpSettings { get; init; }

    /// <summary>
    /// Parses a profile from JSON.
    /// </summary>
    public static SupplierDirectProfile? FromJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<SupplierDirectProfile>(json, JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// Serializes the profile to JSON.
    /// </summary>
    public string ToJson() => JsonSerializer.Serialize(this, JsonOptions);
}

/// <summary>
/// Email-specific delivery settings for a supplier.
/// </summary>
public record EmailDeliverySettings
{
    /// <summary>
    /// Override email address for order notifications.
    /// Falls back to Supplier.ContactEmail if not set.
    /// </summary>
    public string? RecipientEmail { get; init; }

    /// <summary>
    /// Optional CC addresses for order emails.
    /// </summary>
    public List<string>? CcAddresses { get; init; }
}

/// <summary>
/// FTP/SFTP-specific delivery settings for a supplier.
/// </summary>
public record FtpDeliverySettings
{
    /// <summary>
    /// FTP/SFTP host address.
    /// </summary>
    public string? Host { get; init; }

    /// <summary>
    /// Connection port. Defaults to 21 for FTP, 22 for SFTP.
    /// </summary>
    public int? Port { get; init; }

    /// <summary>
    /// Username for authentication.
    /// </summary>
    public string? Username { get; init; }

    /// <summary>
    /// Password for authentication.
    /// Note: Stored encrypted, redacted in logs.
    /// </summary>
    public string? Password { get; init; }

    /// <summary>
    /// Remote directory path for file uploads.
    /// </summary>
    public string? RemotePath { get; init; }

    /// <summary>
    /// Whether to use SFTP instead of FTP.
    /// </summary>
    public bool UseSftp { get; init; } = true;

    /// <summary>
    /// SFTP host key fingerprint for server validation.
    /// </summary>
    public string? HostFingerprint { get; init; }
}
