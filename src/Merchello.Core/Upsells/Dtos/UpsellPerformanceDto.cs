namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Performance metrics for a specific upsell rule.
/// </summary>
public class UpsellPerformanceDto
{
    public Guid UpsellRuleId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int TotalImpressions { get; set; }
    public int TotalClicks { get; set; }
    public int TotalConversions { get; set; }
    public decimal ClickThroughRate { get; set; }
    public decimal ConversionRate { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal AverageOrderValue { get; set; }
    public int UniqueCustomersCount { get; set; }
    public DateTime? FirstImpression { get; set; }
    public DateTime? LastConversion { get; set; }
    public List<UpsellEventsByDateDto> EventsByDate { get; set; } = [];
}
