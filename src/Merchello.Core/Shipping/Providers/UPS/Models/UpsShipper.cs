using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsShipper
{
    [JsonPropertyName("Name")]
    public string? Name { get; set; }

    [JsonPropertyName("ShipperNumber")]
    public string? ShipperNumber { get; set; }

    [JsonPropertyName("Address")]
    public UpsAddress Address { get; set; } = null!;
}
