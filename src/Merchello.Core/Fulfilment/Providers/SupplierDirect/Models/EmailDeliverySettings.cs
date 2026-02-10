namespace Merchello.Core.Fulfilment.Providers.SupplierDirect.Models;

/// <summary>
/// Email-specific delivery settings for a supplier.
/// </summary>
public record EmailDeliverySettings
{
    /// <summary>
    /// Override email address for order notifications.
    /// Falls back to Supplier.ContactEmail if not set.
    /// </summary>
    public string? RecipientEmail { get; init; }

    /// <summary>
    /// Optional CC addresses for order emails.
    /// </summary>
    public List<string>? CcAddresses { get; init; }
}
