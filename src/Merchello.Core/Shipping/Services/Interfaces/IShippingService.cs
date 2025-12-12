using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shipping.Dtos;
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

    /// <summary>
    /// Gets available shipping options for a product to display on product detail page.
    /// Supports estimate mode with just country code.
    /// </summary>
    /// <param name="productId">The product ID</param>
    /// <param name="countryCode">The destination country code</param>
    /// <param name="stateOrProvinceCode">Optional state/province code for more accurate estimates</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Available shipping methods with estimated costs</returns>
    Task<ProductShippingOptionsResultDto> GetShippingOptionsForProductAsync(
        Guid productId,
        string countryCode,
        string? stateOrProvinceCode = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a shipping option by its ID
    /// </summary>
    /// <param name="shippingOptionId">The shipping option ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The shipping option or null if not found</returns>
    Task<ShippingOption?> GetShippingOptionByIdAsync(Guid shippingOptionId, CancellationToken cancellationToken = default);
}

