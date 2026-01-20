using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsBillingWeight
{
    [JsonPropertyName("UnitOfMeasurement")]
    public UpsUnitOfMeasurement? UnitOfMeasurement { get; set; }

    [JsonPropertyName("Weight")]
    public string? Weight { get; set; }
}
