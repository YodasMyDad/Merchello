using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsEstimatedArrival
{
    [JsonPropertyName("Arrival")]
    public UpsArrival? Arrival { get; set; }

    [JsonPropertyName("BusinessDaysInTransit")]
    public string? BusinessDaysInTransit { get; set; }

    [JsonPropertyName("DayOfWeek")]
    public string? DayOfWeek { get; set; }
}
