using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.FedEx.Models;

public class FedExWeight
{
    [JsonPropertyName("units")]
    public string Units { get; set; } = "KG";

    [JsonPropertyName("value")]
    public decimal Value { get; set; }
}
