using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPayLinks
{
    [JsonPropertyName("payments:cancel")]
    public WorldPayLink? Cancel { get; set; }

    [JsonPropertyName("payments:settle")]
    public WorldPayLink? Settle { get; set; }

    [JsonPropertyName("payments:partialSettle")]
    public WorldPayLink? PartialSettle { get; set; }

    [JsonPropertyName("payments:events")]
    public WorldPayLink? Events { get; set; }
}
