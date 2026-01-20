namespace Merchello.Core.Customers.Models;

/// <summary>
/// A complete set of criteria rules with a match mode.
/// </summary>
public class SegmentCriteriaSet
{
    /// <summary>
    /// The list of criteria rules to evaluate.
    /// </summary>
    public List<SegmentCriteria> Criteria { get; set; } = [];

    /// <summary>
    /// How criteria are combined (All = AND, Any = OR).
    /// </summary>
    public SegmentMatchMode MatchMode { get; set; } = SegmentMatchMode.All;
}
