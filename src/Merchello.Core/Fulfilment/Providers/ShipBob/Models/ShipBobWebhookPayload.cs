using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// ShipBob webhook payload wrapper.
/// </summary>
public sealed record ShipBobWebhookPayload
{
    [JsonPropertyName("topic")]
    public string? Topic { get; init; }

    [JsonPropertyName("data")]
    public ShipBobWebhookData? Data { get; init; }
}
