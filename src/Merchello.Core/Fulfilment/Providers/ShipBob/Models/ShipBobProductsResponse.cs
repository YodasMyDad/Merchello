using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Paged product response.
/// </summary>
public sealed record ShipBobProductsResponse
{
    [JsonPropertyName("products")]
    public IReadOnlyList<ShipBobProductResponse>? Products { get; init; }

    [JsonPropertyName("total_count")]
    public int? TotalCount { get; init; }

    [JsonPropertyName("next_page")]
    public string? NextPage { get; init; }
}
