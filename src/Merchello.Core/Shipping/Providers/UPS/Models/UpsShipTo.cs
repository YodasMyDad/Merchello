using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsShipTo
{
    [JsonPropertyName("Name")]
    public string? Name { get; set; }

    [JsonPropertyName("Address")]
    public UpsAddress Address { get; set; } = null!;
}
