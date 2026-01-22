using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// ShipBob shipment information.
/// </summary>
public sealed record ShipBobShipment
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

    [JsonPropertyName("estimated_fulfillment_date")]
    public DateTime? EstimatedFulfillmentDate { get; init; }

    [JsonPropertyName("actual_fulfillment_date")]
    public DateTime? ActualFulfillmentDate { get; init; }

    [JsonPropertyName("created_date")]
    public DateTime? CreatedDate { get; init; }

    [JsonPropertyName("last_updated_at")]
    public DateTime? LastUpdatedAt { get; init; }
}

/// <summary>
/// Tracking information for a shipment.
/// </summary>
public sealed record ShipBobTracking
{
    [JsonPropertyName("tracking_number")]
    public string? TrackingNumber { get; init; }

    [JsonPropertyName("tracking_url")]
    public string? TrackingUrl { get; init; }

    [JsonPropertyName("carrier")]
    public string? Carrier { get; init; }

    [JsonPropertyName("carrier_service")]
    public string? CarrierService { get; init; }

    [JsonPropertyName("shipping_method")]
    public string? ShippingMethod { get; init; }

    [JsonPropertyName("shipping_date")]
    public DateTime? ShippingDate { get; init; }

    [JsonPropertyName("delivery_date")]
    public DateTime? DeliveryDate { get; init; }

    [JsonPropertyName("estimated_delivery_date")]
    public DateTime? EstimatedDeliveryDate { get; init; }

    [JsonPropertyName("bol")]
    public string? BillOfLading { get; init; }

    [JsonPropertyName("scac")]
    public string? Scac { get; init; }

    [JsonPropertyName("pro_number")]
    public string? ProNumber { get; init; }
}

/// <summary>
/// Fulfillment location for a shipment.
/// </summary>
public sealed record ShipBobLocation
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }
}

/// <summary>
/// Status detail with ID and name.
/// </summary>
public sealed record ShipBobStatusDetail
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("exception_fulfillment_center_id")]
    public int? ExceptionFulfillmentCenterId { get; init; }
}

/// <summary>
/// Product within a shipment.
/// </summary>
public sealed record ShipBobShipmentProduct
{
    [JsonPropertyName("id")]
    public int? Id { get; init; }

    [JsonPropertyName("sku")]
    public string? Sku { get; init; }

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; init; }

    [JsonPropertyName("lot")]
    public string? Lot { get; init; }

    [JsonPropertyName("serial_numbers")]
    public IReadOnlyList<string>? SerialNumbers { get; init; }
}

/// <summary>
/// Package measurements.
/// </summary>
public sealed record ShipBobMeasurements
{
    [JsonPropertyName("length")]
    public decimal? Length { get; init; }

    [JsonPropertyName("width")]
    public decimal? Width { get; init; }

    [JsonPropertyName("depth")]
    public decimal? Depth { get; init; }

    [JsonPropertyName("weight")]
    public decimal? Weight { get; init; }
}
