using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPayLink
{
    [JsonPropertyName("href")]
    public string? Href { get; set; }
}
