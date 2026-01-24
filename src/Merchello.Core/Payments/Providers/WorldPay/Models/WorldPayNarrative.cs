using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPayNarrative
{
    [JsonPropertyName("line1")]
    public string? Line1 { get; set; }
}
