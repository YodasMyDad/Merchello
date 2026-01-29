using Merchello.Core.Accounting.Dtos;

namespace Merchello.Core.Upsells.Services.Parameters;

/// <summary>
/// Parameters for previewing a post-purchase upsell addition (price, tax, shipping).
/// </summary>
public class PreviewPostPurchaseParameters
{
    /// <summary>
    /// The invoice to add the product to.
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// The product variant to add.
    /// </summary>
    public required Guid ProductId { get; init; }

    /// <summary>
    /// Quantity to add.
    /// </summary>
    public int Quantity { get; init; } = 1;

    /// <summary>
    /// Selected add-on options (non-variant product options).
    /// </summary>
    public List<OrderAddonDto>? Addons { get; init; }
}
