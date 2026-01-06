using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Strategies.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Result from checkout initialization.
/// </summary>
public class InitializeCheckoutResult
{
    /// <summary>
    /// The basket with calculated totals including auto-selected shipping.
    /// </summary>
    public required Basket Basket { get; init; }

    /// <summary>
    /// The order grouping result with shipping groups.
    /// </summary>
    public required OrderGroupingResult GroupingResult { get; init; }

    /// <summary>
    /// Auto-selected shipping options by GroupId.
    /// </summary>
    public Dictionary<Guid, Guid> AutoSelectedShippingOptions { get; init; } = [];

    /// <summary>
    /// Combined shipping total for all groups.
    /// </summary>
    public decimal CombinedShippingTotal { get; init; }

    /// <summary>
    /// Whether shipping was auto-selected.
    /// </summary>
    public bool ShippingAutoSelected { get; init; }
}
