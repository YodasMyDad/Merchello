using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Product dimensions.
/// </summary>
public sealed record ShipBobDimension
{
    [JsonPropertyName("height")]
    public decimal? Height { get; init; }

    [JsonPropertyName("length")]
    public decimal? Length { get; init; }

    [JsonPropertyName("width")]
    public decimal? Width { get; init; }

    [JsonPropertyName("unit")]
    public string? Unit { get; init; }

    [JsonPropertyName("locked")]
    public bool? Locked { get; init; }
}
