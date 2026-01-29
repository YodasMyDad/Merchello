using Merchello.Core.Accounting.Models;
using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Services.Interfaces;

/// <summary>
/// Builds enriched upsell contexts from basket or invoice line items.
/// </summary>
public interface IUpsellContextBuilder
{
    /// <summary>
    /// Builds enriched line items for upsell evaluation from existing line items.
    /// </summary>
    Task<List<UpsellContextLineItem>> BuildLineItemsAsync(IEnumerable<LineItem> lineItems, CancellationToken ct = default);

    /// <summary>
    /// Builds an enriched line item for a single product (synthetic context).
    /// </summary>
    Task<UpsellContextLineItem?> BuildLineItemAsync(
        Guid productId,
        int quantity,
        decimal unitPrice,
        CancellationToken ct = default);
}
