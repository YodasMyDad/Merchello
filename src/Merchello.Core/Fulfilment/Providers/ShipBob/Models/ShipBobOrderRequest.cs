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
