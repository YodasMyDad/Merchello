namespace Merchello.Core.Upsells.Models;

using Merchello.Core.Storefront.Models;

/// <summary>
/// The context passed to the upsell engine for evaluation.
/// </summary>
public class UpsellContext
{
    /// <summary>
    /// The authenticated customer ID, if available.
    /// </summary>
    public Guid? CustomerId { get; set; }

    /// <summary>
    /// The customer's basket ID.
    /// </summary>
    public Guid? BasketId { get; set; }

    /// <summary>
    /// Enriched line items from the basket with product metadata for trigger matching.
    /// </summary>
    public List<UpsellContextLineItem> LineItems { get; set; } = [];

    /// <summary>
    /// Customer segment IDs for eligibility checking.
    /// </summary>
    public List<Guid>? CustomerSegmentIds { get; set; }

    /// <summary>
    /// The display location being requested.
    /// </summary>
    public UpsellDisplayLocation? Location { get; set; }

    /// <summary>
    /// The customer's shipping country code (e.g., "GB", "US").
    /// Used to filter recommended products to those shippable to the customer's location.
    /// Null when unavailable — region filtering is skipped.
    /// </summary>
    public string? CountryCode { get; set; }

    /// <summary>
    /// Optional state/province code for finer-grained warehouse region filtering.
    /// </summary>
    public string? RegionCode { get; set; }

    /// <summary>
    /// Optional storefront display context for price/tax formatting.
    /// When null, the engine falls back to store currency and default settings.
    /// </summary>
    public StorefrontDisplayContext? DisplayContext { get; set; }
}
