using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsGuaranteedDelivery
{
    [JsonPropertyName("BusinessDaysInTransit")]
    public string? BusinessDaysInTransit { get; set; }

    [JsonPropertyName("DeliveryByTime")]
    public string? DeliveryByTime { get; set; }
}
