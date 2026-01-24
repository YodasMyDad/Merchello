using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSChallengeResponse
{
    [JsonPropertyName("reference")]
    public string? Reference { get; set; }

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("jwt")]
    public string? Jwt { get; set; }

    [JsonPropertyName("payload")]
    public string? Payload { get; set; }
}
