using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Discount to apply to a line item
/// </summary>
public class LineItemDiscountDto
{
    /// <summary>
    /// Type of discount value (FixedAmount, Percentage, or Free)
    /// </summary>
    public DiscountValueType Type { get; set; }

    /// <summary>
    /// Discount value (amount in currency or percentage)
    /// </summary>
    public decimal Value { get; set; }

    /// <summary>
    /// Reason for the discount (shown on invoice)
    /// </summary>
    public string? Reason { get; set; }

    /// <summary>
    /// Whether the discount reason is visible to customer
    /// </summary>
    public bool IsVisibleToCustomer { get; set; }
}

