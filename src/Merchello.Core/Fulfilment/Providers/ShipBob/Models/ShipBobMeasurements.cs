using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Package measurements.
/// </summary>
public sealed record ShipBobMeasurements
{
    [JsonPropertyName("length")]
    public decimal? Length { get; init; }

    [JsonPropertyName("width")]
    public decimal? Width { get; init; }

    [JsonPropertyName("depth")]
    public decimal? Depth { get; init; }

    [JsonPropertyName("weight")]
    public decimal? Weight { get; init; }
}
