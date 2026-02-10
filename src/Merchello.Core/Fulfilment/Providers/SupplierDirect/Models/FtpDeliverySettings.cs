namespace Merchello.Core.Fulfilment.Providers.SupplierDirect.Models;

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
