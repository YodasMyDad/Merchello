using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for checking whether a basket contains digital products.
/// </summary>
public class BasketHasDigitalProductsParameters
{
    /// <summary>
    /// Basket to inspect.
    /// </summary>
    public required Basket Basket { get; init; }
}
