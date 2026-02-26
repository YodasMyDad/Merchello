using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Checkout.Services.Interfaces;

/// <summary>
/// Service for tracking and recovering abandoned checkouts.
/// </summary>
public interface IAbandonedCheckoutService
{
    // =====================================================
    // Activity Tracking
    // =====================================================

    /// <summary>
    /// Tracks checkout activity by basket ID (updates LastActivityUtc).
    /// </summary>
    Task TrackCheckoutActivityAsync(Guid basketId, CancellationToken ct = default);

    /// <summary>
    /// Tracks checkout activity with basket and optional email.
    /// Creates a new abandoned checkout record if email is provided and none exists.
    /// </summary>
    Task TrackCheckoutActivityAsync(Basket basket, string? email = null, CancellationToken ct = default);

    // =====================================================
    // Query
    // =====================================================

    /// <summary>
    /// Gets a paginated list of abandoned checkouts.
    /// </summary>
    Task<AbandonedCheckoutPageDto> GetPagedAsync(
        AbandonedCheckoutQueryParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Gets an abandoned checkout by ID.
    /// </summary>
    Task<AbandonedCheckout?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Gets an abandoned checkout by ID with its basket eagerly loaded (for detail view).
    /// </summary>
    Task<AbandonedCheckout?> GetDetailByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Gets an abandoned checkout by basket ID.
    /// </summary>
    Task<AbandonedCheckout?> GetByBasketIdAsync(Guid basketId, CancellationToken ct = default);

    /// <summary>
    /// Gets an abandoned checkout by recovery token.
    /// </summary>
    Task<AbandonedCheckout?> GetByRecoveryTokenAsync(string token, CancellationToken ct = default);

    // =====================================================
    // Status Management
    // =====================================================

    /// <summary>
    /// Marks an abandoned checkout as recovered (customer returned via recovery link).
    /// </summary>
    Task MarkAsRecoveredAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Marks an abandoned checkout as converted (completed purchase).
    /// </summary>
    Task MarkAsConvertedAsync(Guid id, Guid invoiceId, CancellationToken ct = default);

    /// <summary>
    /// Records that a recovery email was sent (manual or scheduled).
    /// </summary>
    Task<bool> MarkRecoveryEmailSentAsync(Guid id, DateTime? sentUtc = null, CancellationToken ct = default);

    // =====================================================
    // Recovery
    // =====================================================

    /// <summary>
    /// Generates a recovery link for an abandoned checkout.
    /// </summary>
    Task<string> GenerateRecoveryLinkAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Restores a basket from a recovery token.
    /// </summary>
    Task<CrudResult<Basket>> RestoreBasketFromRecoveryAsync(string token, CancellationToken ct = default);

    // =====================================================
    // Analytics
    // =====================================================

    /// <summary>
    /// Gets statistics for abandoned checkouts within a date range.
    /// </summary>
    Task<AbandonedCheckoutStatsDto> GetStatsAsync(
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken ct = default);

    // =====================================================
    // Background Job Support
    // =====================================================

    /// <summary>
    /// Detects and marks checkouts as abandoned based on inactivity threshold.
    /// </summary>
    Task DetectAbandonedCheckoutsAsync(TimeSpan abandonmentThreshold, CancellationToken ct = default);

    /// <summary>
    /// Sends scheduled recovery emails based on configured timing.
    /// </summary>
    Task SendScheduledRecoveryEmailsAsync(CancellationToken ct = default);

    /// <summary>
    /// Expires old recovery tokens past the expiry threshold.
    /// </summary>
    Task ExpireOldRecoveriesAsync(TimeSpan expiryThreshold, CancellationToken ct = default);
}
