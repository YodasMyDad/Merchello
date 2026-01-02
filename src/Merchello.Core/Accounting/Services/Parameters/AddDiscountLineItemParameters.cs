using Merchello.Core.Accounting.Models;
using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Parameters for adding a discount line item
/// </summary>
public class AddDiscountLineItemParameters
{
    /// <summary>
    /// Current line items collection to add the discount to
    /// </summary>
    public required List<LineItem> LineItems { get; init; }

    /// <summary>
    /// Discount amount (positive value - will be stored as negative)
    /// </summary>
    public required decimal Amount { get; init; }

    /// <summary>
    /// Whether this is a fixed amount, percentage, or free discount
    /// </summary>
    public required DiscountValueType DiscountValueType { get; init; }

    /// <summary>
    /// Currency code for percentage calculation
    /// </summary>
    public required string CurrencyCode { get; init; }

    /// <summary>
    /// Optional SKU to link discount to specific product
    /// </summary>
    public string? LinkedSku { get; init; }

    /// <summary>
    /// Optional name for the discount
    /// </summary>
    public string? Name { get; init; }

    /// <summary>
    /// Optional reason/description for the discount
    /// </summary>
    public string? Reason { get; init; }

    /// <summary>
    /// Optional additional extended data to store with the discount
    /// </summary>
    public Dictionary<string, string>? ExtendedData { get; init; }
}
