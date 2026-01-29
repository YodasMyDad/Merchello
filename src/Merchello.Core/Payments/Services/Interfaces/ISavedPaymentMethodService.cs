using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Payments.Services.Interfaces;

/// <summary>
/// Service for managing saved payment methods (vaulted at payment providers).
/// </summary>
public interface ISavedPaymentMethodService
{
    // =====================================================
    // Query
    // =====================================================

    /// <summary>
    /// Get all saved payment methods for a customer.
    /// </summary>
    /// <param name="customerId">The customer ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of saved payment methods.</returns>
    Task<IEnumerable<SavedPaymentMethod>> GetCustomerPaymentMethodsAsync(
        Guid customerId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get a saved payment method by ID.
    /// </summary>
    /// <param name="id">The saved payment method ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The saved payment method, or null if not found.</returns>
    Task<SavedPaymentMethod?> GetPaymentMethodAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get the customer's default payment method.
    /// </summary>
    /// <param name="customerId">The customer ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The default payment method, or null if none set.</returns>
    Task<SavedPaymentMethod?> GetDefaultPaymentMethodAsync(
        Guid customerId,
        CancellationToken cancellationToken = default);

    // =====================================================
    // Vault Setup Flow (for standalone "Add Payment Method")
    // =====================================================

    /// <summary>
    /// Create a vault setup session with the payment provider.
    /// Used for standalone vault flows (e.g., "Add Payment Method" in account settings).
    /// </summary>
    /// <param name="parameters">Setup parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result with setup session details.</returns>
    Task<CrudResult<VaultSetupResult>> CreateSetupSessionAsync(
        CreateVaultSetupParameters parameters,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Confirm a vault setup and save the payment method.
    /// Called after customer completes the SDK/redirect flow.
    /// </summary>
    /// <param name="parameters">Confirmation parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result with the created saved payment method.</returns>
    Task<CrudResult<SavedPaymentMethod>> ConfirmSetupAsync(
        ConfirmVaultSetupParameters parameters,
        CancellationToken cancellationToken = default);

    // =====================================================
    // Save During Checkout
    // =====================================================

    /// <summary>
    /// Save a payment method after a successful checkout payment.
    /// Used when customer opts to save their payment method during checkout.
    /// </summary>
    /// <param name="parameters">Parameters with payment method details from the provider.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result with the created saved payment method.</returns>
    Task<CrudResult<SavedPaymentMethod>> SaveFromCheckoutAsync(
        SavePaymentMethodFromCheckoutParameters parameters,
        CancellationToken cancellationToken = default);

    // =====================================================
    // Manage
    // =====================================================

    /// <summary>
    /// Set a payment method as the customer's default.
    /// </summary>
    /// <param name="id">The payment method ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result with the updated payment method.</returns>
    Task<CrudResult<SavedPaymentMethod>> SetDefaultAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete a saved payment method.
    /// Removes from both the payment provider and the database.
    /// </summary>
    /// <param name="id">The payment method ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result indicating success or failure.</returns>
    Task<CrudResult<bool>> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    // =====================================================
    // Charge
    // =====================================================

    /// <summary>
    /// Charge a saved payment method (off-session, no CVV required).
    /// Used for post-purchase upsells, repeat purchases, and subscriptions.
    /// </summary>
    /// <param name="parameters">Charge parameters.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result with the payment result.</returns>
    Task<CrudResult<PaymentResult>> ChargeAsync(
        ChargeSavedMethodParameters parameters,
        CancellationToken cancellationToken = default);

    // =====================================================
    // Provider Customer Management
    // =====================================================

    /// <summary>
    /// Get or create a provider customer ID for a Merchello customer.
    /// Some providers (Stripe, Braintree) require a customer object for vaulting.
    /// </summary>
    /// <param name="customerId">The Merchello customer ID.</param>
    /// <param name="providerAlias">The payment provider alias.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The provider's customer ID, or null if not found/created.</returns>
    Task<string?> GetOrCreateProviderCustomerIdAsync(
        Guid customerId,
        string providerAlias,
        CancellationToken cancellationToken = default);
}
