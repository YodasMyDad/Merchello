using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

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
