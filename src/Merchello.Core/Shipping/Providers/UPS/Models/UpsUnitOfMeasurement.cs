using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsUnitOfMeasurement
{
    /// <summary>
    /// Unit code. KGS for kilograms, LBS for pounds, CM for centimeters, IN for inches.
    /// </summary>
    [JsonPropertyName("Code")]
    public string Code { get; set; } = null!;

    [JsonPropertyName("Description")]
    public string? Description { get; set; }
}
