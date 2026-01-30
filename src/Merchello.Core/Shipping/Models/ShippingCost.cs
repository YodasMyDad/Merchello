using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Shipping.Models;

public class ShippingCost
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    // The country for this shipping cost (e.g., "US")
    public string CountryCode { get; set; } = null!;

    // The state or province (optional, e.g., "CA" for California)
    public string? StateOrProvinceCode { get; set; }

    // The cost for shipping to this region
    public decimal Cost { get; set; }

    // Optional: parent option for admin lookups (JSON-stored)
    public Guid ShippingOptionId { get; set; }
}
