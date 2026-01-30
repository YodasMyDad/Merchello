using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Parameters;

namespace Merchello.Core.Shipping.Services.Interfaces;

/// <summary>
/// High-level shipping orchestration service for basket and product shipping calculations.
/// </summary>
/// <remarks>
/// <para><b>Service Architecture:</b> Shipping functionality is split across three services:</para>
/// <list type="bullet">
/// <item><b>IShippingService</b> (this) - Business logic and orchestration for basket/product shipping</item>
/// <item><b>IShippingQuoteService</b> - Fetches quotes from shipping providers (FedEx, UPS, etc.)</item>
/// <item><b>IShippingCostResolver</b> - Resolves costs from flat-rate shipping option configurations</item>
/// </list>
/// <para>This separation allows clean provider abstraction while keeping business logic centralized.</para>
/// </remarks>
public interface IShippingService
{
    /// <summary>
    /// Gets shipping options grouped by warehouse for basket items based on stock availability and region serviceability.
    /// </summary>
    Task<ShippingSelectionResult> GetShippingOptionsForBasket(
        GetShippingOptionsParameters parameters,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets shipping summary for order review
    /// </summary>
    /// <param name="basket">The shopping basket</param>
    /// <param name="shippingAddress">The shipping destination address</param>
    /// <param name="selectedShippingOptions">Selected shipping options (keyed by GroupId). Value is SelectionKey format.</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<OrderShippingSummary> GetShippingSummaryForReview(
        Basket basket,
        Address shippingAddress,
        Dictionary<Guid, string> selectedShippingOptions,
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

    /// <summary>
    /// Gets available shipping options for a warehouse to a specific destination.
    /// Used by order create/edit modals to show shipping options after warehouse selection.
    /// </summary>
    /// <param name="warehouseId">The warehouse ID</param>
    /// <param name="destinationCountryCode">Destination country code</param>
    /// <param name="destinationStateCode">Optional destination state/province code</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Available shipping options with pricing info</returns>
    Task<WarehouseShippingOptionsResultDto> GetShippingOptionsForWarehouseAsync(
        Guid warehouseId,
        string destinationCountryCode,
        string? destinationStateCode = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the best fulfilling warehouse for a product variant based on destination region and stock availability.
    /// This is a single call replacement for frontend warehouse iteration logic.
    /// Warehouses are evaluated in priority order (from ProductRootWarehouse.PriorityOrder).
    /// </summary>
    /// <param name="productId">The product variant ID</param>
    /// <param name="destinationCountryCode">Destination country code</param>
    /// <param name="destinationStateCode">Optional destination state/province code</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Fulfillment options including the best warehouse (if available) and stock info</returns>
    Task<ProductFulfillmentOptionsDto> GetFulfillmentOptionsForProductAsync(
        Guid productId,
        string destinationCountryCode,
        string? destinationStateCode = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the default fulfilling warehouse for a product variant based on priority and stock availability.
    /// Used when no destination address is known (e.g., browsing products before checkout).
    /// Warehouses are evaluated in priority order (from ProductRootWarehouse.PriorityOrder).
    /// Unlike GetFulfillmentOptionsForProductAsync, this does NOT check region serviceability.
    /// </summary>
    /// <param name="productId">The product variant ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Fulfillment options including the highest-priority warehouse with stock</returns>
    Task<ProductFulfillmentOptionsDto> GetDefaultFulfillingWarehouseAsync(
        Guid productId,
        CancellationToken cancellationToken = default);

}

