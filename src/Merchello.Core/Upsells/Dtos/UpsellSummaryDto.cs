using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Aggregated summary for a single upsell rule.
/// </summary>
public class UpsellSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public UpsellStatus Status { get; set; }
    public int Impressions { get; set; }
    public int Clicks { get; set; }
    public int Conversions { get; set; }
    public decimal Revenue { get; set; }
    public decimal ClickThroughRate { get; set; }
    public decimal ConversionRate { get; set; }
}
