using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Shipping.Models;

public class ShippingCost
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    // The country for this shipping cost (e.g., "US")
    public string CountryCode { get; set; } = null!;

    // The region code (optional, e.g., "CA" for California)
    [System.Text.Json.Serialization.JsonPropertyName("StateOrProvinceCode")]
    public string? RegionCode { get; set; }

    // The cost for shipping to this region
    public decimal Cost { get; set; }

    // Optional: parent option for admin lookups (JSON-stored)
    public Guid ShippingOptionId { get; set; }
}
