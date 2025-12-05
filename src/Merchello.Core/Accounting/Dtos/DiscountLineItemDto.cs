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
    /// The original discount type (Amount or Percentage)
    /// </summary>
    public DiscountType Type { get; set; }
    /// <summary>
    /// The original discount value (e.g., 10 for £10 off or 10%)
    /// </summary>
    public decimal Value { get; set; }
    public string? Reason { get; set; }
    public bool VisibleToCustomer { get; set; }
}

