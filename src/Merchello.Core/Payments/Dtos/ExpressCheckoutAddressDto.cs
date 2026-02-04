using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Address data from express checkout.
/// All fields are optional since payment providers may return partial address data.
/// JsonPropertyName attributes maintain backward compatibility with frontend adapters
/// that send line1/line2/city/region from external payment SDKs.
/// </summary>
public class ExpressCheckoutAddressDto
{
    /// <summary>
    /// Street address line 1.
    /// </summary>
    [JsonPropertyName("line1")]
    public string? AddressOne { get; set; }

    /// <summary>
    /// Street address line 2 (apartment, suite, etc.).
    /// </summary>
    [JsonPropertyName("line2")]
    public string? AddressTwo { get; set; }

    /// <summary>
    /// City or locality.
    /// </summary>
    [JsonPropertyName("city")]
    public string? TownCity { get; set; }

    /// <summary>
    /// State, province, or region.
    /// </summary>
    [JsonPropertyName("region")]
    public string? CountyState { get; set; }

    /// <summary>
    /// Postal or ZIP code.
    /// </summary>
    public string? PostalCode { get; set; }

    /// <summary>
    /// ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "CA").
    /// </summary>
    public string? CountryCode { get; set; }
}
