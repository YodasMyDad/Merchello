using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPayDeviceDataCollection
{
    [JsonPropertyName("jwt")]
    public string? Jwt { get; set; }

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("bin")]
    public string? Bin { get; set; }
}
