using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Services.Interfaces;

public interface IShippingService
{
    /// <summary>
    /// Gets shipping options grouped by warehouse for basket items based on stock availability and region serviceability
    /// </summary>
    Task<ShippingSelectionResult> GetShippingOptionsForBasket(
        Basket basket,
        Address shippingAddress,
        Dictionary<Guid, Guid>? selectedShippingOptions = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets shipping summary for order review
    /// </summary>
    Task<OrderShippingSummary> GetShippingSummaryForReview(
        Basket basket,
        Address shippingAddress,
        Dictionary<Guid, Guid> selectedShippingOptions,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the warehouses needed to fulfill the basket items based on shipping address
    /// </summary>
    Task<List<Guid>> GetRequiredWarehouses(Basket basket, Address shippingAddress, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns all shipping options in the system.
    /// </summary>
    Task<List<ShippingOption>> GetAllShippingOptions(CancellationToken cancellationToken = default);
}

