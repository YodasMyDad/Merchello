using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Product barcode information.
/// </summary>
public sealed record ShipBobBarcode
{
    [JsonPropertyName("value")]
    public string? Value { get; init; }

    [JsonPropertyName("sticker_url")]
    public string? StickerUrl { get; init; }
}
