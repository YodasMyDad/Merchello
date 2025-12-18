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
    public string? Code { get; set; }
    public DiscountStatus Status { get; set; }
    public DiscountCategory Category { get; set; }
    public DiscountMethod Method { get; set; }
    public DiscountValueType ValueType { get; set; }
    public decimal Value { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public int CurrentUsageCount { get; set; }
    public int? TotalUsageLimit { get; set; }
    public bool CanCombineWithProductDiscounts { get; set; }
    public bool CanCombineWithOrderDiscounts { get; set; }
    public bool CanCombineWithShippingDiscounts { get; set; }
    public DateTime DateCreated { get; set; }
}
