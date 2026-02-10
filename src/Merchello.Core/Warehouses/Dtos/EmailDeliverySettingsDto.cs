namespace Merchello.Core.Warehouses.Dtos;

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
