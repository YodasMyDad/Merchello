using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for persisting a basket without recalculation.
/// </summary>
public class SaveBasketParameters
{
    /// <summary>
    /// Basket to persist.
    /// </summary>
    public required Basket Basket { get; init; }
}
