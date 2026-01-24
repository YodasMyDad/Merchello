using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// ShipBob product response from API.
/// </summary>
public sealed record ShipBobProductResponse
{
    [JsonPropertyName("id")]
    public long Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("type")]
    public string? Type { get; init; }

    [JsonPropertyName("created_on")]
    public DateTime? CreatedOn { get; init; }

    [JsonPropertyName("updated_on")]
    public DateTime? UpdatedOn { get; init; }

    [JsonPropertyName("taxonomy")]
    public ShipBobTaxonomy? Taxonomy { get; init; }

    [JsonPropertyName("variants")]
    public IReadOnlyList<ShipBobVariant>? Variants { get; init; }
}
