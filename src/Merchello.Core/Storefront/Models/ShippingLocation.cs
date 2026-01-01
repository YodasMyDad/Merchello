namespace Merchello.Core.Storefront.Models;

/// <summary>
/// Represents the current customer's shipping location preference.
/// </summary>
public record ShippingLocation(
    string CountryCode,
    string CountryName,
    string? RegionCode = null,
    string? RegionName = null);
