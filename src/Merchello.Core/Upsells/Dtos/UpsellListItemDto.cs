using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// List view rows.
/// </summary>
public class UpsellListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Heading { get; set; } = string.Empty;
    public UpsellStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public string StatusColor { get; set; } = "default";
    public int Priority { get; set; }
    public UpsellDisplayLocation DisplayLocation { get; set; }
    public CheckoutUpsellMode CheckoutMode { get; set; }
    public int TriggerRuleCount { get; set; }
    public int RecommendationRuleCount { get; set; }
    public int TotalImpressions { get; set; }
    public int TotalClicks { get; set; }
    public int TotalConversions { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal ClickThroughRate { get; set; }
    public decimal ConversionRate { get; set; }
    public DateTime DateCreated { get; set; }
}
