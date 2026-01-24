using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Paged response wrapper for multiple orders.
/// </summary>
public sealed record ShipBobOrdersResponse
{
    [JsonPropertyName("orders")]
    public IReadOnlyList<ShipBobOrderResponse>? Orders { get; init; }

    [JsonPropertyName("total_count")]
    public int? TotalCount { get; init; }

    [JsonPropertyName("next_page")]
    public string? NextPage { get; init; }
}
