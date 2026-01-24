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
