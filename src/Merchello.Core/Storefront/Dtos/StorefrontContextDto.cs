using Merchello.Core.Shared.Dtos;

namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Headless-friendly bootstrap context for storefront clients.
/// Combines shipping location, currency, and basket summary in one response.
/// </summary>
public class StorefrontContextDto
{
    public required CountryDto Country { get; set; }
    public string? RegionCode { get; set; }
    public string? RegionName { get; set; }
    public required StorefrontCurrencyDto Currency { get; set; }
    public required BasketCountDto Basket { get; set; }
}
