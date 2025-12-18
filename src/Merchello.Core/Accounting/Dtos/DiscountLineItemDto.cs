using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Discount line item (child of a product line item)
/// </summary>
public class DiscountLineItemDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    /// <summary>
    /// The calculated discount amount (always positive)
    /// </summary>
    public decimal Amount { get; set; }
    /// <summary>
    /// The original discount value type (FixedAmount, Percentage, or Free)
    /// </summary>
    public DiscountValueType Type { get; set; }
    /// <summary>
    /// The original discount value (e.g., 10 for £10 off or 10%)
    /// </summary>
    public decimal Value { get; set; }
    public string? Reason { get; set; }
    public bool IsVisibleToCustomer { get; set; }
}

