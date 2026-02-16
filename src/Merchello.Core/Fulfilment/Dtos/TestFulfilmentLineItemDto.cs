namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// Line item payload for fulfilment test order submission.
/// </summary>
public class TestFulfilmentLineItemDto
{
    public string? Sku { get; set; }
    public string? Name { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
}
