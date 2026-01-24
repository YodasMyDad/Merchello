using System.Text.Json;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Defines what products, categories, or other entities a discount applies to.
/// </summary>
public class DiscountTargetRule
{
    /// <summary>
    /// The type of target (AllProducts, SpecificProducts, Categories, etc.).
    /// </summary>
    public DiscountTargetType TargetType { get; set; }

    /// <summary>
    /// JSON array of target IDs (product IDs, category IDs, etc.).
    /// Null when TargetType is AllProducts.
    /// </summary>
    public string? TargetIds { get; set; }

    /// <summary>
    /// Whether this rule excludes the targets rather than includes them.
    /// </summary>
    public bool IsExclusion { get; set; }

    /// <summary>
    /// Gets the target IDs as a list of Guids.
    /// </summary>
    public List<Guid> GetTargetIdsList()
    {
        if (string.IsNullOrEmpty(TargetIds))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<Guid>>(TargetIds) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
