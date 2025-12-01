using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Warehouses.Services.Models;

namespace Merchello.Core.Checkout.Services.Interfaces;

public interface ICheckoutService
{
    /// <summary>
    /// Add line item to the basket
    /// </summary>
    /// <param name="basket"></param>
    /// <param name="newLineItem"></param>
    /// <param name="countryCode"></param>
    void AddToBasket(Basket basket, LineItem newLineItem, string countryCode);

    /// <summary>
    /// Add adjustment to the basket
    /// </summary>
    /// <param name="basket"></param>
    /// <param name="newAdjustment"></param>
    /// <param name="countryCode"></param>
    void AddToBasket(Basket basket, Adjustment newAdjustment, string countryCode);

    /// <summary>
    /// Remove item from basket
    /// </summary>
    /// <param name="basket"></param>
    /// <param name="lineItemId"></param>
    /// <param name="countryCode"></param>
    void RemoveFromBasket(Basket basket, Guid lineItemId, string countryCode);

    /// <summary>
    /// Calculate the basket if there are any changes
    /// </summary>
    /// <param name="basket"></param>
    /// <param name="countryCode">Defaults to GB</param>
    /// <param name="defaultTaxRate">Defaults to 20%</param>
    /// <param name="isShippingTaxable">Should we tax the shipping, defaults to true</param>
    void CalculateBasket(Basket basket, string countryCode = "GB", decimal defaultTaxRate = 20, bool isShippingTaxable = true);

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
    Task UpdateLineItemQuantity(Guid lineItemId, int quantity, string countryCode = "GB", CancellationToken cancellationToken = default);

    /// <summary>
    /// Remove line item from basket
    /// </summary>
    Task RemoveLineItem(Guid lineItemId, string countryCode = "GB", CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete basket (used after order completion)
    /// </summary>
    Task DeleteBasket(Guid basketId, CancellationToken cancellationToken = default);

    // Convenience facade methods: location availability (delegates to ILocationsService)
    Task<IReadOnlyCollection<CountryAvailability>> GetAvailableCountriesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<RegionAvailability>> GetAvailableRegionsAsync(string countryCode, CancellationToken cancellationToken = default);
}
