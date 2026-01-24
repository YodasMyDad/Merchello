using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Channel-specific metadata.
/// </summary>
public sealed record ShipBobChannelMetadata
{
    [JsonPropertyName("id")]
    public long? Id { get; init; }

    [JsonPropertyName("channel_id")]
    public int? ChannelId { get; init; }

    [JsonPropertyName("external_product_id")]
    public string? ExternalProductId { get; init; }

    [JsonPropertyName("listing_sku")]
    public string? ListingSku { get; init; }

    [JsonPropertyName("retail_price")]
    public decimal? RetailPrice { get; init; }

    [JsonPropertyName("retail_currency")]
    public string? RetailCurrency { get; init; }
}
