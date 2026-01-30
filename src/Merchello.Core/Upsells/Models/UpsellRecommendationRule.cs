using System.Text.Json;

namespace Merchello.Core.Upsells.Models;

/// <summary>
/// Defines what products to recommend when triggers are matched.
/// </summary>
public class UpsellRecommendationRule
{
    /// <summary>
    /// The type of recommendation (ProductTypes, ProductFilters, Collections, etc.).
    /// </summary>
    public UpsellRecommendationType RecommendationType { get; set; }

    /// <summary>
    /// JSON array of target IDs (product type IDs, filter IDs, collection IDs, etc.).
    /// </summary>
    public string? RecommendationIds { get; set; }

    /// <summary>
    /// When true, recommended products are filtered to match the filter values
    /// extracted from trigger products (via ExtractFilterIds on the trigger rule).
    /// </summary>
    public bool MatchTriggerFilters { get; set; }

    /// <summary>
    /// Optional: Specific filter value IDs to match from trigger.
    /// When null/empty and MatchTriggerFilters is true, matches ALL extracted filter values.
    /// When specified, only matches the listed filter values.
    /// </summary>
    public string? MatchFilterIds { get; set; }

    /// <summary>
    /// Gets the recommendation IDs as a list of Guids.
    /// </summary>
    public List<Guid> GetRecommendationIdsList()
    {
        if (string.IsNullOrEmpty(RecommendationIds))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<Guid>>(RecommendationIds) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    /// <summary>
    /// Gets the match filter IDs as a list of Guids.
    /// </summary>
    public List<Guid> GetMatchFilterIdsList()
    {
        if (string.IsNullOrEmpty(MatchFilterIds))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<Guid>>(MatchFilterIds) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
