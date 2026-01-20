using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.FedEx.Models;

public class FedExPackageLineItem
{
    [JsonPropertyName("weight")]
    public FedExWeight Weight { get; set; } = null!;

    [JsonPropertyName("dimensions")]
    public FedExDimensions? Dimensions { get; set; }
}
