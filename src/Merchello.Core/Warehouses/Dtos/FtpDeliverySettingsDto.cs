namespace Merchello.Core.Warehouses.Dtos;

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
