using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Notifications;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Protocols.Models;
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
    /// <param name="parameters">Parameters for calculating the basket</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task CalculateBasketAsync(CalculateBasketParameters parameters, CancellationToken cancellationToken = default);

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
    /// Adds a product with optional add-ons to the basket.
    /// Handles product validation, availability checking, and addon line item creation.
    /// </summary>
    /// <param name="parameters">Parameters specifying product, quantity, and addons</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result with updated basket and line items, or error</returns>
    Task<AddProductWithAddonsResult> AddProductWithAddonsAsync(
        AddProductWithAddonsParameters parameters,
        CancellationToken cancellationToken = default);

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
    /// Converts all line item amounts in the basket to a new currency using exchange rates.
    /// Fires <see cref="Notifications.BasketCurrencyChangingNotification"/> before conversion (cancellable)
    /// and <see cref="Notifications.BasketCurrencyChangedNotification"/> after conversion.
    /// </summary>
    /// <param name="parameters">Parameters for the currency conversion.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result with updated basket or error if exchange rate unavailable or operation cancelled.</returns>
    Task<CrudResult<Basket>> ConvertBasketCurrencyAsync(
        ConvertBasketCurrencyParameters parameters,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Ensures the basket currency matches the customer's display currency.
    /// Should be called before any operation that depends on basket.Currency (invoice creation, payment processing).
    /// This is a silent sync - no notifications are published. For user-initiated currency changes, use ConvertBasketCurrencyAsync.
    /// </summary>
    Task<Basket> EnsureBasketCurrencyAsync(EnsureBasketCurrencyParameters parameters, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a line item for a product
    /// </summary>
    /// <param name="product">The product to add</param>
    /// <param name="quantity">Quantity (defaults to 1)</param>
    /// <returns>A new line item instance</returns>
    LineItem CreateLineItem(Products.Models.Product product, int quantity = 1);

    // Convenience facade methods: location availability (delegates to ILocationsService)
    /// <summary>
    /// Gets countries available for shipping (based on warehouse service regions).
    /// </summary>
    Task<IReadOnlyCollection<CountryAvailability>> GetAvailableCountriesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets regions available for shipping in a country (based on warehouse service regions).
    /// </summary>
    Task<IReadOnlyCollection<RegionAvailability>> GetAvailableRegionsAsync(string countryCode, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all countries from the locality catalog (for billing address which has no restrictions).
    /// </summary>
    Task<IReadOnlyCollection<CountryInfo>> GetAllCountriesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all regions for a country from the locality catalog (for billing address which has no restrictions).
    /// </summary>
    Task<IReadOnlyCollection<SubdivisionInfo>> GetAllRegionsAsync(string countryCode, CancellationToken cancellationToken = default);

    // Order grouping methods

    /// <summary>
    /// Gets order groups for a basket, grouping items by warehouse and shipping options.
    /// Uses the configured IOrderGroupingStrategy to determine grouping logic.
    /// </summary>
    /// <param name="basket">The basket to group.</param>
    /// <param name="session">The checkout session with addresses and any existing selections.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Order grouping result with groups and any errors.</returns>
    Task<OrderGroupingResult> GetOrderGroupsAsync(
        Basket basket,
        CheckoutSession session,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves billing and shipping addresses to the basket, recalculates totals,
    /// refreshes automatic discounts, and persists to the database.
    /// </summary>
    /// <param name="parameters">Parameters for saving addresses</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result with updated basket or error.</returns>
    Task<CrudResult<Basket>> SaveAddressesAsync(
        SaveAddressesParameters parameters,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Persists the basket to the database without recalculation.
    /// Use this for simple updates like email capture or partial address saves.
    /// </summary>
    /// <param name="basket">The basket to save.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task SaveBasketAsync(Basket basket, CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves shipping selections to the checkout session, updates basket totals,
    /// refreshes automatic discounts, and persists to the database.
    /// </summary>
    /// <param name="parameters">Parameters for saving shipping selections</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result with updated basket or error.</returns>
    Task<CrudResult<Basket>> SaveShippingSelectionsAsync(
        SaveShippingSelectionsParameters parameters,
        CancellationToken cancellationToken = default);

    // Order confirmation methods

    /// <summary>
    /// Gets order confirmation data for displaying after successful payment.
    /// </summary>
    /// <param name="invoiceId">The invoice ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Order confirmation DTO, or null if invoice not found.</returns>
    Task<OrderConfirmationDto?> GetOrderConfirmationAsync(
        Guid invoiceId,
        CancellationToken cancellationToken = default);

    // Single-page checkout methods

    /// <summary>
    /// Initializes checkout with a pre-selected shipping location, calculates shipping groups,
    /// and optionally auto-selects the cheapest shipping option for each group.
    /// Used for single-page checkout and express checkout flows.
    /// </summary>
    /// <param name="parameters">Parameters for initialization</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result with initialized checkout data including basket and shipping groups.</returns>
    Task<CrudResult<InitializeCheckoutResult>> InitializeCheckoutAsync(
        InitializeCheckoutParameters parameters,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if the basket contains any digital products.
    /// Used to enforce account creation for digital product purchases.
    /// </summary>
    /// <param name="basket">The basket to check.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if basket contains digital products.</returns>
    Task<bool> BasketHasDigitalProductsAsync(Basket basket, CancellationToken cancellationToken = default);

    // Protocol integration methods

    /// <summary>
    /// Gets the checkout session state in protocol-agnostic format.
    /// Used by protocol adapters (UCP, etc.) to expose checkout state to external agents.
    /// </summary>
    /// <param name="basketId">The basket ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Protocol-agnostic session state, or null if basket not found.</returns>
    Task<CheckoutSessionState?> GetSessionStateAsync(
        Guid basketId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a basket by its ID directly from the database.
    /// Used by protocol adapters (UCP, etc.) to load baskets for external agent sessions.
    /// </summary>
    /// <param name="basketId">The basket ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The basket, or null if not found.</returns>
    Task<Basket?> GetBasketByIdAsync(
        Guid basketId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets estimated shipping for a basket by auto-selecting the cheapest shipping option
    /// for each warehouse group. Updates the basket totals with the estimated shipping.
    /// </summary>
    /// <param name="parameters">Parameters containing basket and shipping destination.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result with estimated shipping amount and group count.</returns>
    Task<GetEstimatedShippingResult> GetEstimatedShippingAsync(
        GetEstimatedShippingParameters parameters,
        CancellationToken cancellationToken = default);
}
