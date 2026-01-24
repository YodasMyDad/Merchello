using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;

namespace Merchello.Core.Shipping.Services.Parameters;

/// <summary>
/// Parameters for retrieving available shipping options for a basket.
/// </summary>
public class GetShippingOptionsParameters
{
    /// <summary>
    /// The shopping basket.
    /// </summary>
    public required Basket Basket { get; init; }

    /// <summary>
    /// The shipping destination address.
    /// </summary>
    public required Address ShippingAddress { get; init; }

    /// <summary>
    /// Previously selected shipping options (keyed by GroupId). Value is SelectionKey format.
    /// </summary>
    public Dictionary<Guid, string>? SelectedShippingOptions { get; init; }
}
