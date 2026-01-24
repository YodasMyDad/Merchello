using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Parameters;
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
    Task SaveAddressesAsync(SaveSessionAddressesParameters parameters, CancellationToken ct = default);

    /// <summary>
    /// Sets the current checkout step.
    /// </summary>
    Task SetCurrentStepAsync(Guid basketId, CheckoutStep step, CancellationToken ct = default);

    /// <summary>
    /// Saves shipping selections to the session.
    /// </summary>
    Task SaveShippingSelectionsAsync(SaveSessionShippingSelectionsParameters parameters, CancellationToken ct = default);

    /// <summary>
    /// Clears the checkout session for a basket.
    /// </summary>
    Task ClearSessionAsync(Guid basketId, CancellationToken ct = default);

    /// <summary>
    /// Saves just the email to the session's billing address.
    /// Used for abandoned checkout capture and payment initialization.
    /// Does NOT clear shipping selections (unlike SaveAddressesAsync).
    /// </summary>
    Task SaveEmailAsync(Guid basketId, string email, CancellationToken ct = default);

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

    /// <summary>
    /// Sets the invoice ID created from this checkout session.
    /// Used for security validation during payment.
    /// </summary>
    /// <param name="basketId">The basket ID.</param>
    /// <param name="invoiceId">The invoice ID created from this checkout.</param>
    /// <param name="ct">Cancellation token.</param>
    Task SetInvoiceIdAsync(Guid basketId, Guid invoiceId, CancellationToken ct = default);

}
