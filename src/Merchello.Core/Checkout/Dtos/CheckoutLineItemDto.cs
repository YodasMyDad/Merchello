using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Line item DTO for checkout order summary.
/// </summary>
public class CheckoutLineItemDto
{
    public Guid Id { get; set; }
    public string Sku { get; set; } = "";
    public string Name { get; set; } = "";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string FormattedUnitPrice { get; set; } = "";
    public string FormattedLineTotal { get; set; } = "";
    public LineItemType LineItemType { get; set; }
    public string? ImageUrl { get; set; }
}
