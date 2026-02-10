namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// Request DTO for testing a supplier FTP/SFTP connection.
/// </summary>
public class TestSupplierFtpConnectionDto
{
    /// <summary>
    /// Supplier identifier used to resolve existing stored password when password is omitted.
    /// </summary>
    public Guid? SupplierId { get; set; }

    /// <summary>
    /// Delivery method. Must be "Ftp" or "Sftp".
    /// </summary>
    public string DeliveryMethod { get; set; } = "Ftp";

    /// <summary>
    /// FTP/SFTP connection settings to test.
    /// </summary>
    public FtpDeliverySettingsDto? FtpSettings { get; set; }
}
