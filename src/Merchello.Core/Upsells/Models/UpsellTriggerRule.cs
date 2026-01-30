using System.Text.Json;

namespace Merchello.Core.Upsells.Models;

/// <summary>
/// Defines what must be in the basket for the upsell to activate.
/// </summary>
public class UpsellTriggerRule
{
    /// <summary>
    /// The type of trigger (ProductTypes, ProductFilters, Collections, etc.).
    /// </summary>
    public UpsellTriggerType TriggerType { get; set; }

    /// <summary>
    /// JSON array of target IDs (product type IDs, filter IDs, collection IDs, etc.).
    /// For cart value triggers, stores JSON like {"value": 100.00} or {"min": 80.00, "max": 100.00}.
    /// </summary>
    public string? TriggerIds { get; set; }

    /// <summary>
    /// Optional: Specific filter value IDs to extract from matching trigger products.
    /// When set, the engine captures these filter values from products matching this
    /// trigger and passes them to recommendation rules with MatchTriggerFilters = true.
    /// </summary>
    public string? ExtractFilterIds { get; set; }

    /// <summary>
    /// Gets the trigger IDs as a list of Guids.
    /// </summary>
    public List<Guid> GetTriggerIdsList()
    {
        if (string.IsNullOrEmpty(TriggerIds))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<Guid>>(TriggerIds) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    /// <summary>
    /// Gets the extract filter IDs as a list of Guids.
    /// </summary>
    public List<Guid> GetExtractFilterIdsList()
    {
        if (string.IsNullOrEmpty(ExtractFilterIds))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<Guid>>(ExtractFilterIds) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
