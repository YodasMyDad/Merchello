namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Overall analytics dashboard data for upsells.
/// </summary>
public class UpsellDashboardDto
{
    public int TotalActiveRules { get; set; }
    public int TotalImpressions { get; set; }
    public int TotalClicks { get; set; }
    public int TotalConversions { get; set; }
    public decimal OverallClickThroughRate { get; set; }
    public decimal OverallConversionRate { get; set; }
    public decimal TotalRevenue { get; set; }
    public List<UpsellSummaryDto> TopPerformers { get; set; } = [];
    public List<UpsellEventsByDateDto> TrendByDate { get; set; } = [];
}
