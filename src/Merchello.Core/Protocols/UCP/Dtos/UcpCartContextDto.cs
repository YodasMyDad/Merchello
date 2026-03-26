using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Dtos;

/// <summary>
/// UCP Cart context for buyer signals and localization per UCP draft spec.
/// </summary>
public class UcpCartContextDto
{
    [JsonPropertyName("address_country")]
    public string? AddressCountry { get; set; }

    [JsonPropertyName("address_region")]
    public string? AddressRegion { get; set; }

    [JsonPropertyName("postal_code")]
    public string? PostalCode { get; set; }

    [JsonPropertyName("intent")]
    public string? Intent { get; set; }

    [JsonPropertyName("language")]
    public string? Language { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("eligibility")]
    public List<string>? Eligibility { get; set; }
}
