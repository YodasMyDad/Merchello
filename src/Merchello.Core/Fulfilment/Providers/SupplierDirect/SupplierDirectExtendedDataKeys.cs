namespace Merchello.Core.Fulfilment.Providers.SupplierDirect;

/// <summary>
/// Extended data keys used by Supplier Direct fulfilment provider.
/// </summary>
public static class SupplierDirectExtendedDataKeys
{
    /// <summary>
    /// Supplier-level delivery profile stored in Supplier.ExtendedData.
    /// Contains delivery method and method-specific settings.
    /// </summary>
    public const string Profile = "Fulfilment:SupplierDirect:Profile";

    /// <summary>
    /// Override email address for supplier order notifications.
    /// Falls back to Supplier.ContactEmail if not set.
    /// </summary>
    public const string OrderEmail = "SupplierDirect:OrderEmail";

    /// <summary>
    /// Delivery method preference for this supplier (overrides provider default).
    /// Value should be one of: "Email", "Ftp", "Sftp".
    /// </summary>
    public const string DeliveryMethod = "SupplierDirect:DeliveryMethod";

    /// <summary>
    /// Custom FTP/SFTP host for this supplier (overrides provider default).
    /// </summary>
    public const string FtpHost = "SupplierDirect:FtpHost";

    /// <summary>
    /// Custom FTP/SFTP username for this supplier.
    /// </summary>
    public const string FtpUsername = "SupplierDirect:FtpUsername";

    /// <summary>
    /// Custom FTP/SFTP password for this supplier.
    /// </summary>
    public const string FtpPassword = "SupplierDirect:FtpPassword";

    /// <summary>
    /// Custom FTP/SFTP port for this supplier.
    /// </summary>
    public const string FtpPort = "SupplierDirect:FtpPort";

    /// <summary>
    /// Custom FTP/SFTP remote path for this supplier.
    /// </summary>
    public const string FtpRemotePath = "SupplierDirect:FtpRemotePath";

    /// <summary>
    /// Custom SFTP host fingerprint for this supplier.
    /// </summary>
    public const string SftpHostFingerprint = "SupplierDirect:SftpHostFingerprint";
}
