using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPay3DSAccount
{
    [JsonPropertyName("previousSuspiciousActivity")]
    public bool? PreviousSuspiciousActivity { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("history")]
    public WorldPay3DSAccountHistory? History { get; set; }
}
