using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// ShipBob product creation/update request.
/// </summary>
public sealed record ShipBobProductRequest
{
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    [JsonPropertyName("sku")]
    public string? Sku { get; init; }

    [JsonPropertyName("barcode")]
    public string? Barcode { get; init; }

    [JsonPropertyName("gtin")]
    public string? Gtin { get; init; }

    [JsonPropertyName("upc")]
    public string? Upc { get; init; }

    [JsonPropertyName("unit_price")]
    public decimal? UnitPrice { get; init; }

    [JsonPropertyName("reference_id")]
    public string? ReferenceId { get; init; }
}
