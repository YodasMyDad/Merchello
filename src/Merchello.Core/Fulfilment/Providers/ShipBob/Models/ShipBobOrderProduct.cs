using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Product/line item within a ShipBob order.
/// </summary>
public sealed record ShipBobOrderProduct
{
    /// <summary>
    /// External reference ID for the line item.
    /// </summary>
    [JsonPropertyName("reference_id")]
    public required string ReferenceId { get; init; }

    /// <summary>
    /// Product SKU.
    /// </summary>
    [JsonPropertyName("sku")]
    public string? Sku { get; init; }

    /// <summary>
    /// Product name.
    /// </summary>
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    /// <summary>
    /// Quantity ordered.
    /// </summary>
    [JsonPropertyName("quantity")]
    public required int Quantity { get; init; }

    /// <summary>
    /// Unit price for customs/insurance.
    /// </summary>
    [JsonPropertyName("unit_price")]
    public decimal? UnitPrice { get; init; }

    /// <summary>
    /// GTIN/UPC barcode.
    /// </summary>
    [JsonPropertyName("gtin")]
    public string? Gtin { get; init; }

    /// <summary>
    /// UPC barcode.
    /// </summary>
    [JsonPropertyName("upc")]
    public string? Upc { get; init; }

    /// <summary>
    /// External line ID for reference.
    /// </summary>
    [JsonPropertyName("external_line_id")]
    public int? ExternalLineId { get; init; }
}
