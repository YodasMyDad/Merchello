using Merchello.Core.Accounting.Models;
using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Dtos;

/// <summary>
/// DTO for discount list items.
/// </summary>
public class DiscountListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool ShowInFeed { get; set; }
    public string? Code { get; set; }
    public DiscountStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public string StatusColor { get; set; } = "default";
    public DiscountCategory Category { get; set; }
    public string CategoryLabel { get; set; } = string.Empty;
    public DiscountMethod Method { get; set; }
    public DiscountValueType ValueType { get; set; }
    public decimal Value { get; set; }
    public string FormattedValue { get; set; } = string.Empty;
    public DateTime StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public int CurrentUsageCount { get; set; }
    public int? TotalUsageLimit { get; set; }
    public bool CanCombineWithProductDiscounts { get; set; }
    public bool CanCombineWithOrderDiscounts { get; set; }
    public bool CanCombineWithShippingDiscounts { get; set; }
    public bool ApplyAfterTax { get; set; }
    public DateTime DateCreated { get; set; }
}
