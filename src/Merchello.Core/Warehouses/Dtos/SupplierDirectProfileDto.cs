namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// DTO for Supplier Direct delivery profile configuration.
/// Used for frontend integration when configuring supplier delivery settings.
/// </summary>
public class SupplierDirectProfileDto
{
    /// <summary>
    /// Delivery method: "Email", "Ftp", or "Sftp".
    /// </summary>
    public string DeliveryMethod { get; set; } = "Email";

    /// <summary>
    /// Email-specific settings (when DeliveryMethod is "Email").
    /// </summary>
    public EmailDeliverySettingsDto? EmailSettings { get; set; }

    /// <summary>
    /// FTP/SFTP-specific settings (when DeliveryMethod is "Ftp" or "Sftp").
    /// </summary>
    public FtpDeliverySettingsDto? FtpSettings { get; set; }
}

/// <summary>
/// Email delivery settings for a supplier.
/// </summary>
public class EmailDeliverySettingsDto
{
    /// <summary>
    /// Override email address for order notifications.
    /// </summary>
    public string? RecipientEmail { get; set; }

    /// <summary>
    /// Optional CC addresses for order emails.
    /// </summary>
    public List<string>? CcAddresses { get; set; }
}

/// <summary>
/// FTP/SFTP delivery settings for a supplier.
/// </summary>
public class FtpDeliverySettingsDto
{
    /// <summary>
    /// FTP/SFTP host address.
    /// </summary>
    public string? Host { get; set; }

    /// <summary>
    /// Connection port.
    /// </summary>
    public int? Port { get; set; }

    /// <summary>
    /// Username for authentication.
    /// </summary>
    public string? Username { get; set; }

    /// <summary>
    /// Password for authentication.
    /// Note: Leave empty when updating to keep existing password.
    /// </summary>
    public string? Password { get; set; }

    /// <summary>
    /// Remote directory path for file uploads.
    /// </summary>
    public string? RemotePath { get; set; }

    /// <summary>
    /// Whether to use SFTP instead of FTP.
    /// </summary>
    public bool UseSftp { get; set; } = true;

    /// <summary>
    /// SFTP host key fingerprint for server validation.
    /// </summary>
    public string? HostFingerprint { get; set; }
}
