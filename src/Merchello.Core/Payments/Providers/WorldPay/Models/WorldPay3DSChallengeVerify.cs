using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSChallengeVerify
{
    [JsonPropertyName("reference")]
    public string? Reference { get; set; }
}
