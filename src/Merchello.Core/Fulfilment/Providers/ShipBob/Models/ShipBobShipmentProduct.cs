using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Product within a shipment.
/// </summary>
public sealed record ShipBobShipmentProduct
{
    [JsonPropertyName("id")]
    public int? Id { get; init; }

    [JsonPropertyName("sku")]
    public string? Sku { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; init; }

    [JsonPropertyName("lot")]
    public string? Lot { get; init; }

    [JsonPropertyName("serial_numbers")]
    public IReadOnlyList<string>? SerialNumbers { get; init; }
}
