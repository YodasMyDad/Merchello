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

/// <summary>
/// ShipBob product response from API.
/// </summary>
public sealed record ShipBobProductResponse
{
    [JsonPropertyName("id")]
    public long Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("type")]
    public string? Type { get; init; }

    [JsonPropertyName("created_on")]
    public DateTime? CreatedOn { get; init; }

    [JsonPropertyName("updated_on")]
    public DateTime? UpdatedOn { get; init; }

    [JsonPropertyName("taxonomy")]
    public ShipBobTaxonomy? Taxonomy { get; init; }

    [JsonPropertyName("variants")]
    public IReadOnlyList<ShipBobVariant>? Variants { get; init; }
}

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

/// <summary>
/// Variant inventory information.
/// </summary>
public sealed record ShipBobVariantInventory
{
    [JsonPropertyName("inventory_id")]
    public int? InventoryId { get; init; }

    [JsonPropertyName("on_hand_qty")]
    public int? OnHandQty { get; init; }
}

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

/// <summary>
/// Fulfillment-specific settings.
/// </summary>
public sealed record ShipBobFulfillmentSettings
{
    [JsonPropertyName("dangerous_goods")]
    public bool? DangerousGoods { get; init; }

    [JsonPropertyName("requires_prop65")]
    public bool? RequiresProp65 { get; init; }

    [JsonPropertyName("msds_url")]
    public string? MsdsUrl { get; init; }

    [JsonPropertyName("serial_scan")]
    public ShipBobSerialScan? SerialScan { get; init; }
}

/// <summary>
/// Serial scan settings.
/// </summary>
public sealed record ShipBobSerialScan
{
    [JsonPropertyName("enabled")]
    public bool Enabled { get; init; }

    [JsonPropertyName("prefix")]
    public string? Prefix { get; init; }

    [JsonPropertyName("suffix")]
    public string? Suffix { get; init; }

    [JsonPropertyName("exact_length")]
    public int? ExactLength { get; init; }
}

/// <summary>
/// Customs information for international shipments.
/// </summary>
public sealed record ShipBobCustoms
{
    [JsonPropertyName("country_of_origin")]
    public string? CountryOfOrigin { get; init; }

    [JsonPropertyName("harmonized_code")]
    public string? HarmonizedCode { get; init; }

    [JsonPropertyName("declared_value")]
    public decimal? DeclaredValue { get; init; }
}

/// <summary>
/// Lot tracking information.
/// </summary>
public sealed record ShipBobLotInformation
{
    [JsonPropertyName("is_lot")]
    public bool IsLot { get; init; }

    [JsonPropertyName("minimum_shelf_life_days")]
    public int? MinimumShelfLifeDays { get; init; }
}

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

/// <summary>
/// Product taxonomy/category.
/// </summary>
public sealed record ShipBobTaxonomy
{
    [JsonPropertyName("id")]
    public int? Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("path")]
    public string? Path { get; init; }
}

/// <summary>
/// Paged product response.
/// </summary>
public sealed record ShipBobProductsResponse
{
    [JsonPropertyName("products")]
    public IReadOnlyList<ShipBobProductResponse>? Products { get; init; }

    [JsonPropertyName("total_count")]
    public int? TotalCount { get; init; }

    [JsonPropertyName("next_page")]
    public string? NextPage { get; init; }
}
