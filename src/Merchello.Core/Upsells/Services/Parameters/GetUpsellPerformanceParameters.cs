namespace Merchello.Core.Upsells.Services.Parameters;

/// <summary>
/// Parameters for fetching performance data for a specific upsell rule.
/// </summary>
public class GetUpsellPerformanceParameters
{
    public Guid UpsellRuleId { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}
