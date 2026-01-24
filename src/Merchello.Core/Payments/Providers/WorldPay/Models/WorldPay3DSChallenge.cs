using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSChallenge
{
    [JsonPropertyName("windowSize")]
    public string? WindowSize { get; set; }

    [JsonPropertyName("preference")]
    public string? Preference { get; set; }

    [JsonPropertyName("returnUrl")]
    public string? ReturnUrl { get; set; }
}
