using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsDimensions
{
    [JsonPropertyName("UnitOfMeasurement")]
    public UpsUnitOfMeasurement UnitOfMeasurement { get; set; } = null!;

    [JsonPropertyName("Length")]
    public string Length { get; set; } = null!;

    [JsonPropertyName("Width")]
    public string Width { get; set; } = null!;

    [JsonPropertyName("Height")]
    public string Height { get; set; } = null!;
}
