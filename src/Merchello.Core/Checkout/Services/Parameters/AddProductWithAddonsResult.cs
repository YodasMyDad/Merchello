using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Result of adding a product with add-ons to the basket.
/// </summary>
public class AddProductWithAddonsResult
{
    /// <summary>
    /// Whether the operation was successful.
    /// </summary>
    public bool Success { get; init; }

    /// <summary>
    /// Error message if operation failed.
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// The updated basket.
    /// </summary>
    public Basket? Basket { get; init; }

    /// <summary>
    /// The main product line item that was added.
    /// </summary>
    public LineItem? ProductLineItem { get; init; }

    /// <summary>
    /// Add-on line items that were added (if any).
    /// </summary>
    public List<LineItem> AddonLineItems { get; init; } = [];

    /// <summary>
    /// Total item count in basket after operation.
    /// </summary>
    public int ItemCount { get; init; }

    /// <summary>
    /// Basket total after operation.
    /// </summary>
    public decimal Total { get; init; }

    /// <summary>
    /// Creates a successful result.
    /// </summary>
    public static AddProductWithAddonsResult Successful(
        Basket basket,
        LineItem productLineItem,
        List<LineItem> addonLineItems) => new()
    {
        Success = true,
        Basket = basket,
        ProductLineItem = productLineItem,
        AddonLineItems = addonLineItems,
        ItemCount = basket.LineItems.Sum(li => li.Quantity),
        Total = basket.Total
    };

    /// <summary>
    /// Creates a failed result.
    /// </summary>
    public static AddProductWithAddonsResult Failed(string errorMessage) => new()
    {
        Success = false,
        ErrorMessage = errorMessage
    };
}
