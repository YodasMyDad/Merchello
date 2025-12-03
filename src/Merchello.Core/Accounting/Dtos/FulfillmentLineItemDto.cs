namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Line item with fulfillment quantities
/// </summary>
public class FulfillmentLineItemDto
{
    public Guid Id { get; set; }
    public string? Sku { get; set; }
    public string? Name { get; set; }
    public int OrderedQuantity { get; set; }
    public int ShippedQuantity { get; set; }
    public int RemainingQuantity => OrderedQuantity - ShippedQuantity;
    public string? ImageUrl { get; set; }
    public decimal Amount { get; set; }
}
