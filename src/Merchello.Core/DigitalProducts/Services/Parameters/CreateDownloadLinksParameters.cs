namespace Merchello.Core.DigitalProducts.Services.Parameters;

/// <summary>
/// Parameters for creating download links for an invoice's digital products.
/// </summary>
public class CreateDownloadLinksParameters
{
    /// <summary>
    /// The invoice to create download links for.
    /// </summary>
    public required Guid InvoiceId { get; init; }
}
