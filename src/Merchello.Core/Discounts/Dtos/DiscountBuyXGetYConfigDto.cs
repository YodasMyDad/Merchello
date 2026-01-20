using Merchello.Core.Accounting.Models;
using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Dtos;

/// <summary>
/// DTO for Buy X Get Y configuration.
/// </summary>
public class DiscountBuyXGetYConfigDto
{
    public BuyXTriggerType BuyTriggerType { get; set; }
    public decimal BuyTriggerValue { get; set; }
    public DiscountTargetType BuyTargetType { get; set; }
    public List<Guid>? BuyTargetIds { get; set; }
    public List<string>? BuyTargetNames { get; set; }
    public int GetQuantity { get; set; }
    public DiscountTargetType GetTargetType { get; set; }
    public List<Guid>? GetTargetIds { get; set; }
    public List<string>? GetTargetNames { get; set; }
    public DiscountValueType GetValueType { get; set; }
    public decimal GetValue { get; set; }
    public BuyXGetYSelectionMethod SelectionMethod { get; set; }
}
