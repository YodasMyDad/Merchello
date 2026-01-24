using System.Text.Json.Serialization;

namespace Merchello.Core.Fulfilment.Providers.ShipBob.Models;

/// <summary>
/// Paged response for inventory levels.
/// </summary>
public sealed record ShipBobInventoryLevelsResponse
{
    [JsonPropertyName("inventory")]
    public IReadOnlyList<ShipBobInventoryLevelResponse>? Inventory { get; init; }

    [JsonPropertyName("total_count")]
    public int? TotalCount { get; init; }

    [JsonPropertyName("next_page")]
    public string? NextPage { get; init; }
}
