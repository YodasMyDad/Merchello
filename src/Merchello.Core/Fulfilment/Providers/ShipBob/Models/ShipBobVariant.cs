using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Product variant information.
/// </summary>
public sealed record ShipBobVariant
{
    [JsonPropertyName("id")]
    public long Id { get; init; }

    [JsonPropertyName("sku")]
    public string? Sku { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("status")]
    public string? Status { get; init; }

    [JsonPropertyName("upc")]
    public string? Upc { get; init; }

    [JsonPropertyName("gtin")]
    public string? Gtin { get; init; }

    [JsonPropertyName("barcodes")]
    public IReadOnlyList<ShipBobBarcode>? Barcodes { get; init; }

    [JsonPropertyName("inventory")]
    public ShipBobVariantInventory? Inventory { get; init; }

    [JsonPropertyName("dimension")]
    public ShipBobDimension? Dimension { get; init; }

    [JsonPropertyName("weight")]
    public ShipBobWeight? Weight { get; init; }

    [JsonPropertyName("fulfillment_settings")]
    public ShipBobFulfillmentSettings? FulfillmentSettings { get; init; }

    [JsonPropertyName("customs")]
    public ShipBobCustoms? Customs { get; init; }

    [JsonPropertyName("lot_information")]
    public ShipBobLotInformation? LotInformation { get; init; }

    [JsonPropertyName("channel_metadata")]
    public IReadOnlyList<ShipBobChannelMetadata>? ChannelMetadata { get; init; }
}
