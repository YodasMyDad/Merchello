namespace Merchello.Core.DigitalProducts.Services.Parameters;

/// <summary>
/// Parameters for regenerating download links for an invoice.
/// This invalidates old links and creates new ones with fresh tokens.
/// </summary>
public class RegenerateDownloadLinksParameters
{
    /// <summary>
    /// The invoice to regenerate download links for.
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// Override expiry days for the new links.
    /// If null, uses the product's configured expiry.
    /// </summary>
    public int? NewExpiryDays { get; init; }
}
