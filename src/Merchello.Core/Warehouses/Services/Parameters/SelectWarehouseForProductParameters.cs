using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;

namespace Merchello.Core.Warehouses.Services.Parameters;

/// <summary>
/// Parameters for selecting a warehouse for product fulfillment
/// </summary>
public class SelectWarehouseForProductParameters
{
    /// <summary>
    /// The product to fulfill
    /// </summary>
    public required Product Product { get; init; }

    /// <summary>
    /// The destination shipping address
    /// </summary>
    public required Address ShippingAddress { get; init; }

    /// <summary>
    /// The quantity required
    /// </summary>
    public int Quantity { get; init; } = 1;
}
