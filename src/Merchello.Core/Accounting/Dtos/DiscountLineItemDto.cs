namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Discount line item (child of a product line item)
/// </summary>
public class DiscountLineItemDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public decimal Amount { get; set; }
    public string? Reason { get; set; }
    public bool VisibleToCustomer { get; set; }
}

