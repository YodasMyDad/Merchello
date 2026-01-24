using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Mark-for location for B2B orders.
/// </summary>
public sealed record ShipBobMarkFor
{
    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("address")]
    public ShipBobAddress? Address { get; init; }
}
