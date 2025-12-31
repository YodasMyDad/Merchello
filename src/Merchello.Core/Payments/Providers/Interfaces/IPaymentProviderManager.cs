using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Payments.Providers.Interfaces;

/// <summary>
/// Manages payment provider discovery, configuration, and lifecycle.
/// Providers can offer multiple payment methods, each individually configurable.
/// </summary>
public interface IPaymentProviderManager
{
    /// <summary>
    /// Get all discovered payment providers (from assembly scanning).
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>All available providers with their settings.</returns>
    Task<IReadOnlyCollection<RegisteredPaymentProvider>> GetAvailableProvidersAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get all enabled/configured payment providers.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Enabled providers ordered by sort order.</returns>
    Task<IReadOnlyCollection<RegisteredPaymentProvider>> GetEnabledProvidersAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get a specific provider by alias.
    /// </summary>
    /// <param name="alias">The provider alias.</param>
    /// <param name="requireEnabled">If true, only returns the provider if it is enabled.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The provider, or null if not found.</returns>
    Task<RegisteredPaymentProvider?> GetProviderAsync(
        string alias,
        bool requireEnabled = true,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get all provider settings from database.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>All persisted provider settings.</returns>
    Task<IEnumerable<PaymentProviderSetting>> GetProviderSettingsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get a specific provider setting by ID.
    /// </summary>
    /// <param name="id">The setting ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The setting, or null if not found.</returns>
    Task<PaymentProviderSetting?> GetProviderSettingAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Save provider settings (create or update).
    /// </summary>
    /// <param name="setting">The setting to save.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result containing the saved setting.</returns>
    Task<CrudResult<PaymentProviderSetting>> SaveProviderSettingAsync(
        PaymentProviderSetting setting,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete a provider setting.
    /// </summary>
    /// <param name="id">The setting ID to delete.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result indicating success or failure.</returns>
    Task<CrudResult<bool>> DeleteProviderSettingAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Enable or disable a provider.
    /// </summary>
    /// <param name="settingId">The setting ID.</param>
    /// <param name="enabled">Whether to enable the provider.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result indicating success or failure.</returns>
    Task<CrudResult<bool>> SetProviderEnabledAsync(
        Guid settingId,
        bool enabled,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Update the sort order of providers.
    /// </summary>
    /// <param name="orderedIds">Provider setting IDs in desired order.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result indicating success or failure.</returns>
    Task<CrudResult<bool>> UpdateProviderSortOrderAsync(
        IEnumerable<Guid> orderedIds,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Refresh the provider cache (forces re-discovery and re-configuration).
    /// </summary>
    void RefreshCache();

    // =====================================================
    // Payment Methods
    // =====================================================

    /// <summary>
    /// Get all enabled payment methods across all enabled providers.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>All enabled payment methods ordered by sort order.</returns>
    Task<IReadOnlyCollection<PaymentMethodDto>> GetEnabledPaymentMethodsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get express checkout methods only (Apple Pay, Google Pay, PayPal, etc.).
    /// These appear at the start of checkout and collect customer data from the provider.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Enabled express checkout methods ordered by sort order.</returns>
    Task<IReadOnlyCollection<PaymentMethodDto>> GetExpressCheckoutMethodsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get standard (non-express) payment methods only.
    /// These appear in the payment step after customer has entered their details.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Enabled standard payment methods ordered by sort order.</returns>
    Task<IReadOnlyCollection<PaymentMethodDto>> GetStandardPaymentMethodsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get method settings for a specific provider.
    /// </summary>
    /// <param name="providerSettingId">The provider setting ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Method settings for the provider.</returns>
    Task<IReadOnlyCollection<PaymentMethodSetting>> GetMethodSettingsAsync(
        Guid providerSettingId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Enable or disable a specific payment method.
    /// </summary>
    /// <param name="providerSettingId">The provider setting ID.</param>
    /// <param name="methodAlias">The method alias (e.g., "cards", "applepay").</param>
    /// <param name="enabled">Whether to enable the method.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result indicating success or failure.</returns>
    Task<CrudResult<PaymentMethodSetting>> SetMethodEnabledAsync(
        Guid providerSettingId,
        string methodAlias,
        bool enabled,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Update the sort order of payment methods for a provider.
    /// </summary>
    /// <param name="providerSettingId">The provider setting ID.</param>
    /// <param name="orderedMethodAliases">Method aliases in desired order.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result indicating success or failure.</returns>
    Task<CrudResult<bool>> UpdateMethodSortOrderAsync(
        Guid providerSettingId,
        IEnumerable<string> orderedMethodAliases,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get payment methods that should be shown in customer checkout.
    /// Filters out methods where ShowInCheckout is false (e.g., Manual Payment).
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Payment methods visible in checkout, ordered by sort order.</returns>
    Task<IReadOnlyCollection<PaymentMethodDto>> GetCheckoutPaymentMethodsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get a preview of payment methods as they will appear at checkout.
    /// Shows which methods are active vs hidden due to deduplication when
    /// multiple providers offer the same method type.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Preview with active, standard, and hidden methods.</returns>
    Task<CheckoutPaymentPreviewDto> GetCheckoutPreviewAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Ensures built-in payment providers exist and are enabled.
    /// Creates provider settings for built-in providers (e.g., Manual Payment) if they don't exist.
    /// Called on application startup.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task EnsureBuiltInProvidersAsync(CancellationToken cancellationToken = default);
}

