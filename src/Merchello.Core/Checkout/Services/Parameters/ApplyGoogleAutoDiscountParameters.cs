using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for applying a Google auto discount to a basket line item.
/// </summary>
public class ApplyGoogleAutoDiscountParameters
{
    /// <summary>
    /// The basket to apply the discount to.
    /// </summary>
    public required Basket Basket { get; init; }

    /// <summary>
    /// SKU of the product to link the discount to.
    /// </summary>
    public required string LinkedSku { get; init; }

    /// <summary>
    /// The discount percentage from Google's JWT.
    /// </summary>
    public required int DiscountPercentage { get; init; }

    /// <summary>
    /// The Google discount code for tracking/reporting.
    /// </summary>
    public string DiscountCode { get; init; } = string.Empty;

    /// <summary>
    /// The Google offer ID identifying the product in the feed.
    /// </summary>
    public string OfferId { get; init; } = string.Empty;

    /// <summary>
    /// Country code for tax recalculation.
    /// </summary>
    public string? CountryCode { get; init; }
}
