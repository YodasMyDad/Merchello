using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Warehouses.Models;

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
    /// Add adjustment to the basket
    /// </summary>
    /// <param name="basket"></param>
    /// <param name="newAdjustment"></param>
    /// <param name="countryCode"></param>
    /// <param name="cancellationToken"></param>
    Task AddToBasketAsync(Basket basket, Adjustment newAdjustment, string countryCode, CancellationToken cancellationToken = default);

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
}
