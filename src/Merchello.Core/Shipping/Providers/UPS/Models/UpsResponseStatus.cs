using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsResponseStatus
{
    [JsonPropertyName("Code")]
    public string? Code { get; set; }

    [JsonPropertyName("Description")]
    public string? Description { get; set; }
}
