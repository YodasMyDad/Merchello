using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;

namespace Merchello.Core.Checkout.Services.Interfaces;

/// <summary>
/// Service for managing checkout session state.
/// </summary>
public interface ICheckoutSessionService
{
    /// <summary>
    /// Gets the current checkout session for a basket, creating one if it doesn't exist.
    /// </summary>
    Task<CheckoutSession> GetSessionAsync(Guid basketId, CancellationToken ct = default);

    /// <summary>
    /// Saves billing and shipping addresses to the session.
    /// </summary>
    Task SaveAddressesAsync(
        Guid basketId,
        Address billing,
        Address? shipping,
        bool sameAsBilling,
        CancellationToken ct = default);

    /// <summary>
    /// Sets the current checkout step.
    /// </summary>
    Task SetCurrentStepAsync(Guid basketId, CheckoutStep step, CancellationToken ct = default);

    /// <summary>
    /// Saves shipping selections to the session.
    /// </summary>
    /// <param name="basketId">The basket ID.</param>
    /// <param name="selections">Shipping selections per group (GroupId -> ShippingOptionId).</param>
    /// <param name="deliveryDates">Optional delivery date selections per group.</param>
    /// <param name="ct">Cancellation token.</param>
    Task SaveShippingSelectionsAsync(
        Guid basketId,
        Dictionary<Guid, Guid> selections,
        Dictionary<Guid, DateTime>? deliveryDates = null,
        CancellationToken ct = default);

    /// <summary>
    /// Clears the checkout session for a basket.
    /// </summary>
    Task ClearSessionAsync(Guid basketId, CancellationToken ct = default);

    /// <summary>
    /// Saves a basket to the HTTP session.
    /// </summary>
    /// <param name="basket">The basket to save.</param>
    void SaveBasketToSession(Basket basket);

    /// <summary>
    /// Gets a basket from the HTTP session.
    /// </summary>
    /// <returns>The basket, or null if not found in session.</returns>
    Basket? GetBasketFromSession();
}
