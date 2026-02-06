using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.FedEx.Models;

public class FedExAddress
{
    [JsonPropertyName("streetLines")]
    public List<string>? StreetLines { get; set; }

    [JsonPropertyName("city")]
    public string? City { get; set; }

    [JsonPropertyName("regionCode")]
    public string? RegionCode { get; set; }

    [JsonPropertyName("postalCode")]
    public string PostalCode { get; set; } = null!;

    [JsonPropertyName("countryCode")]
    public string CountryCode { get; set; } = null!;

    [JsonPropertyName("residential")]
    public bool? Residential { get; set; }
}
