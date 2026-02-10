namespace Merchello.Core.Fulfilment.Providers.SupplierDirect.Transport;

/// <summary>
/// Connection settings for FTP/SFTP transport.
/// </summary>
public record FtpConnectionSettings
{
    /// <summary>
    /// FTP/SFTP host address.
    /// </summary>
    public required string Host { get; init; }

    /// <summary>
    /// Connection port. Defaults to 21 for FTP, 22 for SFTP.
    /// </summary>
    public int Port { get; init; } = 21;

    /// <summary>
    /// Username for authentication.
    /// </summary>
    public required string Username { get; init; }

    /// <summary>
    /// Password for authentication.
    /// </summary>
    public required string Password { get; init; }

    /// <summary>
    /// Remote directory path for file uploads.
    /// </summary>
    public string RemotePath { get; init; } = "/";

    /// <summary>
    /// Whether to use SFTP instead of FTP.
    /// </summary>
    public bool UseSftp { get; init; } = true;

    /// <summary>
    /// SFTP host key fingerprint for server validation.
    /// If not set, all host keys are accepted (less secure).
    /// </summary>
    public string? HostFingerprint { get; init; }

    /// <summary>
    /// Whether to use passive mode for FTP connections.
    /// </summary>
    public bool UsePassiveMode { get; init; } = true;

    /// <summary>
    /// Whether to use TLS for FTP connections (FTPS).
    /// </summary>
    public bool UseTls { get; init; } = true;

    /// <summary>
    /// Connection and operation timeout in seconds.
    /// </summary>
    public int TimeoutSeconds { get; init; } = 30;
}
