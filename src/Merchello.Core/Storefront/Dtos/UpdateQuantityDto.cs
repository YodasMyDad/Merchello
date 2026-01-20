namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Request to update line item quantity
/// </summary>
public class UpdateQuantityDto
{
    public Guid LineItemId { get; set; }
    public int Quantity { get; set; }
}
