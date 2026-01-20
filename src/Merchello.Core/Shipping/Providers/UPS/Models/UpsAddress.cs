using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsAddress
{
    [JsonPropertyName("AddressLine")]
    public List<string>? AddressLine { get; set; }

    [JsonPropertyName("City")]
    public string? City { get; set; }

    [JsonPropertyName("StateProvinceCode")]
    public string? StateProvinceCode { get; set; }

    [JsonPropertyName("PostalCode")]
    public string? PostalCode { get; set; }

    [JsonPropertyName("CountryCode")]
    public string CountryCode { get; set; } = null!;

    [JsonPropertyName("ResidentialAddressIndicator")]
    public string? ResidentialAddressIndicator { get; set; }
}
