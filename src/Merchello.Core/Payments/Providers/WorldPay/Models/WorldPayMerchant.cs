using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPayMerchant
{
    [JsonPropertyName("entity")]
    public string? Entity { get; set; }
}
