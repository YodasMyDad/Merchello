using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// ShipBob order response from API.
/// </summary>
public sealed record ShipBobOrderResponse
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("order_number")]
    public string? OrderNumber { get; init; }

    [JsonPropertyName("reference_id")]
    public string? ReferenceId { get; init; }

    [JsonPropertyName("status")]
    public string? Status { get; init; }

    [JsonPropertyName("type")]
    public string? Type { get; init; }

    [JsonPropertyName("channel")]
    public ShipBobChannel? Channel { get; init; }

    [JsonPropertyName("created_date")]
    public DateTime? CreatedDate { get; init; }

    [JsonPropertyName("purchase_date")]
    public DateTime? PurchaseDate { get; init; }

    [JsonPropertyName("recipient")]
    public ShipBobRecipient? Recipient { get; init; }

    [JsonPropertyName("products")]
    public IReadOnlyList<ShipBobOrderProductResponse>? Products { get; init; }

    [JsonPropertyName("shipments")]
    public IReadOnlyList<ShipBobShipment>? Shipments { get; init; }

    [JsonPropertyName("shipping_method")]
    public string? ShippingMethod { get; init; }

    [JsonPropertyName("financials")]
    public ShipBobFinancials? Financials { get; init; }

    [JsonPropertyName("gift_message")]
    public string? GiftMessage { get; init; }

    [JsonPropertyName("tags")]
    public IReadOnlyList<ShipBobTag>? Tags { get; init; }
}

/// <summary>
/// Channel information for an order.
/// </summary>
public sealed record ShipBobChannel
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }
}

/// <summary>
/// Product in order response (includes inventory info).
/// </summary>
public sealed record ShipBobOrderProductResponse
{
    [JsonPropertyName("id")]
    public int? Id { get; init; }

    [JsonPropertyName("reference_id")]
    public string? ReferenceId { get; init; }

    [JsonPropertyName("sku")]
    public string? Sku { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; init; }

    [JsonPropertyName("quantity_committed")]
    public int? QuantityCommitted { get; init; }

    [JsonPropertyName("quantity_fulfilled")]
    public int? QuantityFulfilled { get; init; }

    [JsonPropertyName("unit_price")]
    public decimal? UnitPrice { get; init; }

    [JsonPropertyName("inventory_items")]
    public IReadOnlyList<ShipBobInventoryItem>? InventoryItems { get; init; }
}

/// <summary>
/// Inventory item reference within a product.
/// </summary>
public sealed record ShipBobInventoryItem
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; init; }

    [JsonPropertyName("quantity_committed")]
    public int? QuantityCommitted { get; init; }
}

/// <summary>
/// Order financial information.
/// </summary>
public sealed record ShipBobFinancials
{
    [JsonPropertyName("total_price")]
    public decimal? TotalPrice { get; init; }
}

/// <summary>
/// Paged response wrapper for multiple orders.
/// </summary>
public sealed record ShipBobOrdersResponse
{
    [JsonPropertyName("orders")]
    public IReadOnlyList<ShipBobOrderResponse>? Orders { get; init; }

    [JsonPropertyName("total_count")]
    public int? TotalCount { get; init; }

    [JsonPropertyName("next_page")]
    public string? NextPage { get; init; }
}
