using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

internal class WorldPayAuthorizationResponse
{
    [JsonPropertyName("outcome")]
    public string? Outcome { get; set; }

    [JsonPropertyName("_links")]
    public WorldPayLinks? Links { get; set; }
}
