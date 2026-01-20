using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsPackageWeight
{
    [JsonPropertyName("UnitOfMeasurement")]
    public UpsUnitOfMeasurement UnitOfMeasurement { get; set; } = null!;

    [JsonPropertyName("Weight")]
    public string Weight { get; set; } = null!;
}
