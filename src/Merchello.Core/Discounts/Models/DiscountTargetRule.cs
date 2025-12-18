using System.Text.Json;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Defines what products, categories, or other entities a discount applies to.
/// </summary>
public class DiscountTargetRule
{
    /// <summary>
    /// Unique identifier for the target rule.
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The discount this rule belongs to.
    /// </summary>
    public Guid DiscountId { get; set; }

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
    /// Navigation property to the parent discount.
    /// </summary>
    public virtual Discount Discount { get; set; } = null!;

    /// <summary>
    /// Gets the target IDs as a list of Guids.
    /// </summary>
    public List<Guid> GetTargetIdsList()
    {
        if (string.IsNullOrEmpty(TargetIds))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<Guid>>(TargetIds) ?? [];
        }
        catch (JsonException ex)
        {
            // Log warning - malformed JSON in TargetIds
            System.Diagnostics.Debug.WriteLine($"[DiscountTargetRule] Failed to deserialize TargetIds JSON for rule {Id}: {ex.Message}");
            return [];
        }
    }
}
