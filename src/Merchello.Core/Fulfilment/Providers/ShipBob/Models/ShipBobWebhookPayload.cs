using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// ShipBob webhook payload wrapper.
/// </summary>
public sealed record ShipBobWebhookPayload
{
    [JsonPropertyName("topic")]
    public string? Topic { get; init; }

    [JsonPropertyName("data")]
    public ShipBobWebhookData? Data { get; init; }
}

/// <summary>
/// Webhook data containing order/shipment information.
/// </summary>
public sealed record ShipBobWebhookData
{
    [JsonPropertyName("id")]
    public int? Id { get; init; }

    [JsonPropertyName("order_id")]
    public int? OrderId { get; init; }

    [JsonPropertyName("order_number")]
    public string? OrderNumber { get; init; }

    [JsonPropertyName("reference_id")]
    public string? ReferenceId { get; init; }

    [JsonPropertyName("status")]
    public string? Status { get; init; }

    [JsonPropertyName("shipment")]
    public ShipBobWebhookShipment? Shipment { get; init; }

    [JsonPropertyName("shipments")]
    public IReadOnlyList<ShipBobWebhookShipment>? Shipments { get; init; }

    [JsonPropertyName("exception")]
    public ShipBobWebhookException? Exception { get; init; }

    [JsonPropertyName("channel")]
    public ShipBobChannel? Channel { get; init; }

    [JsonPropertyName("created_date")]
    public DateTime? CreatedDate { get; init; }

    [JsonPropertyName("updated_date")]
    public DateTime? UpdatedDate { get; init; }
}

/// <summary>
/// Shipment data within a webhook.
/// </summary>
public sealed record ShipBobWebhookShipment
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("order_id")]
    public int? OrderId { get; init; }

    [JsonPropertyName("status")]
    public string? Status { get; init; }

    [JsonPropertyName("status_details")]
    public IReadOnlyList<ShipBobStatusDetail>? StatusDetails { get; init; }

    [JsonPropertyName("tracking")]
    public ShipBobTracking? Tracking { get; init; }

    [JsonPropertyName("location")]
    public ShipBobLocation? Location { get; init; }

    [JsonPropertyName("products")]
    public IReadOnlyList<ShipBobShipmentProduct>? Products { get; init; }

    [JsonPropertyName("measurements")]
    public ShipBobMeasurements? Measurements { get; init; }

    [JsonPropertyName("created_date")]
    public DateTime? CreatedDate { get; init; }

    [JsonPropertyName("last_updated_at")]
    public DateTime? LastUpdatedAt { get; init; }

    [JsonPropertyName("estimated_fulfillment_date")]
    public DateTime? EstimatedFulfillmentDate { get; init; }

    [JsonPropertyName("actual_fulfillment_date")]
    public DateTime? ActualFulfillmentDate { get; init; }
}

/// <summary>
/// Exception information in webhook.
/// </summary>
public sealed record ShipBobWebhookException
{
    [JsonPropertyName("type")]
    public string? Type { get; init; }

    [JsonPropertyName("message")]
    public string? Message { get; init; }

    [JsonPropertyName("code")]
    public int? Code { get; init; }
}

/// <summary>
/// Webhook subscription request.
/// </summary>
public sealed record ShipBobWebhookSubscriptionRequest
{
    [JsonPropertyName("topic")]
    public required string Topic { get; init; }

    [JsonPropertyName("subscription_url")]
    public required string SubscriptionUrl { get; init; }
}

/// <summary>
/// Webhook subscription response.
/// </summary>
public sealed record ShipBobWebhookSubscription
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("topic")]
    public string? Topic { get; init; }

    [JsonPropertyName("subscription_url")]
    public string? SubscriptionUrl { get; init; }

    [JsonPropertyName("created_at")]
    public DateTime? CreatedAt { get; init; }
}

/// <summary>
/// Response containing list of webhook subscriptions.
/// </summary>
public sealed record ShipBobWebhookSubscriptionsResponse
{
    [JsonPropertyName("webhooks")]
    public IReadOnlyList<ShipBobWebhookSubscription>? Webhooks { get; init; }
}
