namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// DTO for line items within an abandoned checkout.
/// </summary>
public class AbandonedCheckoutLineItemDto
{
    public Guid Id { get; set; }
    public Guid? ProductId { get; set; }
    public string? Sku { get; set; }
    public string? Name { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string FormattedUnitPrice { get; set; } = string.Empty;
    public string FormattedLineTotal { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}
