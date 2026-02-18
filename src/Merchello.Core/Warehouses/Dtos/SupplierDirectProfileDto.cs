namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// DTO for Supplier Direct delivery profile configuration.
/// Used for frontend integration when configuring supplier delivery settings.
/// </summary>
public class SupplierDirectProfileDto
{
    /// <summary>
    /// Submission trigger: "OnPaid" or "ExplicitRelease".
    /// </summary>
    public string? SubmissionTrigger { get; set; }

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

    /// <summary>
    /// Optional CSV settings for FTP/SFTP deliveries.
    /// </summary>
    public CsvDeliverySettingsDto? CsvSettings { get; set; }
}
