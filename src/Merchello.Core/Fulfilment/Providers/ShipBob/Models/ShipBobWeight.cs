using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Product weight.
/// </summary>
public sealed record ShipBobWeight
{
    [JsonPropertyName("amount")]
    public decimal? Amount { get; init; }

    [JsonPropertyName("unit")]
    public string? Unit { get; init; }
}
