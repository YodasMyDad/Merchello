namespace Merchello.Core.Fulfilment.Providers.SupplierDirect;

/// <summary>
/// Structured logging property names for Supplier Direct provider.
/// Use these constants to ensure consistent property names in log messages.
/// </summary>
public static class SupplierDirectLogProperties
{
    /// <summary>
    /// Order identifier.
    /// </summary>
    public const string OrderId = "OrderId";

    /// <summary>
    /// Order number.
    /// </summary>
    public const string OrderNumber = "OrderNumber";

    /// <summary>
    /// Supplier identifier.
    /// </summary>
    public const string SupplierId = "SupplierId";

    /// <summary>
    /// Supplier name.
    /// </summary>
    public const string SupplierName = "SupplierName";

    /// <summary>
    /// Warehouse identifier.
    /// </summary>
    public const string WarehouseId = "WarehouseId";

    /// <summary>
    /// Delivery method (Email, Ftp, Sftp).
    /// </summary>
    public const string DeliveryMethod = "DeliveryMethod";

    /// <summary>
    /// Provider reference returned on successful submission.
    /// </summary>
    public const string SubmissionReference = "SubmissionReference";

    /// <summary>
    /// Target email address for delivery.
    /// </summary>
    public const string TargetEmail = "TargetEmail";

    /// <summary>
    /// FTP/SFTP host.
    /// </summary>
    public const string FtpHost = "FtpHost";

    /// <summary>
    /// FTP/SFTP port.
    /// </summary>
    public const string FtpPort = "FtpPort";

    /// <summary>
    /// Remote path for FTP/SFTP upload.
    /// </summary>
    public const string RemotePath = "RemotePath";

    /// <summary>
    /// Uploaded file name.
    /// </summary>
    public const string FileName = "FileName";

    /// <summary>
    /// Error classification for retry decisions.
    /// </summary>
    public const string ErrorClassification = "ErrorClassification";

    /// <summary>
    /// Retry attempt number.
    /// </summary>
    public const string RetryAttempt = "RetryAttempt";

    /// <summary>
    /// Maximum retry attempts.
    /// </summary>
    public const string MaxRetries = "MaxRetries";

    /// <summary>
    /// Duration of operation in milliseconds.
    /// </summary>
    public const string DurationMs = "DurationMs";
}
