using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Discounts.Services;
using Merchello.Core.Shared.Models;
using Merchello.Core.Warehouses.Models;

// ReSharper disable UnusedMember.Global

namespace Merchello.Core.Checkout.Services.Interfaces;

public interface ICheckoutService
{
    /// <summary>
    /// Add line item to the basket
    /// </summary>
    /// <param name="basket"></param>
    /// <param name="newLineItem"></param>
    /// <param name="countryCode"></param>
    /// <param name="cancellationToken"></param>
    Task AddToBasketAsync(Basket basket, LineItem newLineItem, string countryCode, CancellationToken cancellationToken = default);

    /// <summary>
    /// Add a discount to the basket as a discount line item.
    /// </summary>
    /// <param name="basket">The basket to add the discount to</param>
    /// <param name="amount">The discount amount (positive value)</param>
    /// <param name="discountValueType">Whether this is a fixed amount, percentage, or free discount</param>
    /// <param name="linkedSku">Optional SKU to link the discount to a specific product</param>
    /// <param name="name">Optional name for the discount</param>
    /// <param name="reason">Optional reason/description for the discount</param>
    /// <param name="countryCode">Country code for shipping calculation</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task AddDiscountToBasketAsync(
        Basket basket,
        decimal amount,
        DiscountValueType discountValueType,
        string? linkedSku = null,
        string? name = null,
        string? reason = null,
        string? countryCode = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Remove a discount line item from the basket
    /// </summary>
    /// <param name="basket">The basket</param>
    /// <param name="discountLineItemId">The ID of the discount line item to remove</param>
    /// <param name="countryCode">Country code for recalculation</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task RemoveDiscountFromBasketAsync(
        Basket basket,
        Guid discountLineItemId,
        string? countryCode = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Remove item from basket
    /// </summary>
    /// <param name="basket"></param>
    /// <param name="lineItemId"></param>
    /// <param name="countryCode"></param>
    /// <param name="cancellationToken"></param>
    Task RemoveFromBasketAsync(Basket basket, Guid lineItemId, string? countryCode, CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculate the basket if there are any changes
    /// </summary>
    /// <param name="basket"></param>
    /// <param name="countryCode">Country code for shipping/tax. When null, uses AllowedCountries from settings.</param>
    /// <param name="defaultTaxRate">Defaults to 20%</param>
    /// <param name="isShippingTaxable">Should we tax the shipping, defaults to true</param>
    /// <param name="cancellationToken"></param>
    Task CalculateBasketAsync(Basket basket, string? countryCode = null, decimal defaultTaxRate = 20, bool isShippingTaxable = true, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get basket for a customer or anonymous user
    /// </summary>
    /// <param name="parameters"></param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    Task<Basket?> GetBasket(GetBasketParameters parameters, CancellationToken cancellationToken = default);

    /// <summary>
    /// Add item to basket with automatic basket retrieval/creation
    /// </summary>
    /// <param name="parameters"></param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    Task AddToBasket(AddToBasketParameters parameters, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update line item quantity in basket
    /// </summary>
    Task UpdateLineItemQuantity(Guid lineItemId, int quantity, string? countryCode = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Remove line item from basket
    /// </summary>
    Task RemoveLineItem(Guid lineItemId, string? countryCode = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete basket (used after order completion)
    /// </summary>
    Task DeleteBasket(Guid basketId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new basket with the specified currency
    /// </summary>
    /// <param name="currency">Currency code (ISO 4217). When null, defaults to store currency.</param>
    /// <param name="currencySymbol">Currency symbol snapshot. When null, defaults to store currency symbol.</param>
    /// <param name="customerId">Optional customer ID for logged-in users</param>
    /// <returns>A new basket instance</returns>
    Basket CreateBasket(string? currency = null, string? currencySymbol = null, Guid? customerId = null);

    /// <summary>
    /// Creates a line item for a product
    /// </summary>
    /// <param name="product">The product to add</param>
    /// <param name="quantity">Quantity (defaults to 1)</param>
    /// <returns>A new line item instance</returns>
    LineItem CreateLineItem(Products.Models.Product product, int quantity = 1);

    // Convenience facade methods: location availability (delegates to ILocationsService)
    Task<IReadOnlyCollection<CountryAvailability>> GetAvailableCountriesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<RegionAvailability>> GetAvailableRegionsAsync(string countryCode, CancellationToken cancellationToken = default);

    // Promotional discount methods

    /// <summary>
    /// Applies a discount code to the basket.
    /// </summary>
    /// <param name="basket">The basket to apply the discount to.</param>
    /// <param name="code">The discount code to apply.</param>
    /// <param name="countryCode">Country code for recalculation.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result with updated basket or error.</returns>
    Task<CrudResult<Basket>> ApplyDiscountCodeAsync(
        Basket basket,
        string code,
        string? countryCode = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all applicable automatic discounts for the basket.
    /// </summary>
    /// <param name="basket">The basket to check.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of applicable automatic discounts with calculated amounts.</returns>
    Task<List<ApplicableDiscount>> GetApplicableAutomaticDiscountsAsync(
        Basket basket,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Refreshes automatic discounts on the basket, adding new ones and removing expired ones.
    /// </summary>
    /// <param name="basket">The basket to refresh.</param>
    /// <param name="countryCode">Country code for recalculation.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The updated basket.</returns>
    Task<Basket> RefreshAutomaticDiscountsAsync(
        Basket basket,
        string? countryCode = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes a promotional discount from the basket.
    /// </summary>
    /// <param name="basket">The basket.</param>
    /// <param name="discountId">The discount ID to remove.</param>
    /// <param name="countryCode">Country code for recalculation.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result with updated basket or error.</returns>
    Task<CrudResult<Basket>> RemovePromotionalDiscountAsync(
        Basket basket,
        Guid discountId,
        string? countryCode = null,
        CancellationToken cancellationToken = default);
}
