using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Customs information for international shipments.
/// </summary>
public sealed record ShipBobCustoms
{
    [JsonPropertyName("country_of_origin")]
    public string? CountryOfOrigin { get; init; }

    [JsonPropertyName("harmonized_code")]
    public string? HarmonizedCode { get; init; }

    [JsonPropertyName("declared_value")]
    public decimal? DeclaredValue { get; init; }
}
