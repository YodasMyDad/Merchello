namespace Merchello.Core.Fulfilment.Providers.SupplierDirect;

/// <summary>
/// Delivery methods supported by the Supplier Direct fulfilment provider.
/// </summary>
public enum SupplierDirectDeliveryMethod
{
    /// <summary>
    /// Send order via email to supplier.
    /// </summary>
    Email = 0,

    /// <summary>
    /// Upload order file to supplier's FTP server.
    /// </summary>
    Ftp = 1,

    /// <summary>
    /// Upload order file to supplier's SFTP server (secure).
    /// </summary>
    Sftp = 2
}
