using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// ShipBob order creation request (POST /{version}/order).
/// </summary>
public sealed record ShipBobOrderRequest
{
    /// <summary>
    /// External reference ID (Merchello order number).
    /// </summary>
    [JsonPropertyName("reference_id")]
    public required string ReferenceId { get; init; }

    /// <summary>
    /// Display order number.
    /// </summary>
    [JsonPropertyName("order_number")]
    public string? OrderNumber { get; init; }

    /// <summary>
    /// Shipping method code (maps to ShipBob shipping method).
    /// </summary>
    [JsonPropertyName("shipping_method")]
    public string? ShippingMethod { get; init; }

    /// <summary>
    /// Order recipient with shipping address.
    /// </summary>
    [JsonPropertyName("recipient")]
    public required ShipBobRecipient Recipient { get; init; }

    /// <summary>
    /// Products/line items in the order.
    /// </summary>
    [JsonPropertyName("products")]
    public required IReadOnlyList<ShipBobOrderProduct> Products { get; init; }

    /// <summary>
    /// Optional: Force order to specific fulfillment center.
    /// </summary>
    [JsonPropertyName("fulfillment_center_id")]
    public int? FulfillmentCenterId { get; init; }

    /// <summary>
    /// Original purchase date.
    /// </summary>
    [JsonPropertyName("purchase_date")]
    public DateTime? PurchaseDate { get; init; }

    /// <summary>
    /// Gift message to include.
    /// </summary>
    [JsonPropertyName("gift_message")]
    public string? GiftMessage { get; init; }

    /// <summary>
    /// Order-level tags for metadata.
    /// </summary>
    [JsonPropertyName("tags")]
    public IReadOnlyList<ShipBobTag>? Tags { get; init; }

    /// <summary>
    /// Retailer program data for B2B orders.
    /// </summary>
    [JsonPropertyName("retailer_program_data")]
    public ShipBobRetailerProgramData? RetailerProgramData { get; init; }

    /// <summary>
    /// Shipping terms configuration.
    /// </summary>
    [JsonPropertyName("shipping_terms")]
    public ShipBobShippingTerms? ShippingTerms { get; init; }
}

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

/// <summary>
/// Key-value tag for order metadata.
/// </summary>
public sealed record ShipBobTag
{
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    [JsonPropertyName("value")]
    public string? Value { get; init; }
}

/// <summary>
/// Retailer program data for B2B/wholesale orders.
/// </summary>
public sealed record ShipBobRetailerProgramData
{
    [JsonPropertyName("purchase_order_number")]
    public string? PurchaseOrderNumber { get; init; }

    [JsonPropertyName("retailer_program_type")]
    public string? RetailerProgramType { get; init; }

    [JsonPropertyName("expected_delivery_date")]
    public DateTime? ExpectedDeliveryDate { get; init; }

    [JsonPropertyName("mark_for")]
    public ShipBobMarkFor? MarkFor { get; init; }
}

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

/// <summary>
/// Shipping terms for orders.
/// </summary>
public sealed record ShipBobShippingTerms
{
    [JsonPropertyName("carrier_type")]
    public string? CarrierType { get; init; }

    [JsonPropertyName("payment_term")]
    public string? PaymentTerm { get; init; }
}
