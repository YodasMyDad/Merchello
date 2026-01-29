using Merchello.Core.Shared;
using Merchello.Core.Upsells.Dtos;
using Merchello.Core.Upsells.Services.Parameters;

namespace Merchello.Core.Upsells.Services.Interfaces;

/// <summary>
/// Service for managing post-purchase upsell flows.
/// Handles initialization, previewing, adding items, and releasing fulfillment holds.
/// </summary>
public interface IPostPurchaseUpsellService
{
    /// <summary>
    /// Initialize post-purchase window after a successful checkout payment.
    /// Sets invoice hold + window metadata and returns eligibility.
    /// </summary>
    Task<OperationResult<bool>> InitializePostPurchaseAsync(
        InitializePostPurchaseParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Get available post-purchase upsell suggestions for an invoice.
    /// </summary>
    Task<PostPurchaseUpsellsDto?> GetAvailableUpsellsAsync(
        Guid invoiceId,
        CancellationToken ct = default);

    /// <summary>
    /// Preview adding a post-purchase item (calculate price, tax, shipping without committing).
    /// </summary>
    Task<PostPurchasePreviewDto?> PreviewAddToOrderAsync(
        PreviewPostPurchaseParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Add a post-purchase upsell item to an existing order.
    /// Charges the customer's saved payment method and updates the invoice.
    /// </summary>
    Task<OperationResult<PostPurchaseResultDto>> AddToOrderAsync(
        AddPostPurchaseUpsellParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Skip post-purchase upsells and release fulfillment hold.
    /// </summary>
    Task<OperationResult<bool>> SkipUpsellsAsync(
        Guid invoiceId,
        CancellationToken ct = default);

    /// <summary>
    /// Check if post-purchase window is still valid for an invoice.
    /// </summary>
    Task<bool> IsPostPurchaseWindowValidAsync(
        Guid invoiceId,
        CancellationToken ct = default);
}
