using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for ensuring basket currency is synced.
/// </summary>
public class EnsureBasketCurrencyParameters
{
    /// <summary>
    /// The basket to sync.
    /// </summary>
    public required Basket Basket { get; set; }

    /// <summary>
    /// The customer's display currency code.
    /// </summary>
    public required string CurrencyCode { get; set; }

    /// <summary>
    /// The customer's display currency symbol.
    /// </summary>
    public required string CurrencySymbol { get; set; }
}
