using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsService
{
    [JsonPropertyName("Code")]
    public string Code { get; set; } = null!;

    [JsonPropertyName("Description")]
    public string? Description { get; set; }
}
