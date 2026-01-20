using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Services.Parameters;

/// <summary>
/// Parameters for creating a discount target rule.
/// </summary>
public class CreateDiscountTargetRuleParameters
{
    /// <summary>
    /// The type of target.
    /// </summary>
    public DiscountTargetType TargetType { get; set; }

    /// <summary>
    /// The target IDs (product IDs, category IDs, etc.).
    /// </summary>
    public List<Guid>? TargetIds { get; set; }

    /// <summary>
    /// Whether this rule excludes the targets rather than includes them.
    /// </summary>
    public bool IsExclusion { get; set; }
}
