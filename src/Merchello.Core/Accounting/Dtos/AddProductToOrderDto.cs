namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Request to add a product (variant) to an order, with optional add-on selections
/// </summary>
public class AddProductToOrderDto
{
    /// <summary>
    /// The product variant ID
    /// </summary>
    public Guid ProductId { get; set; }

    /// <summary>
    /// Quantity to add
    /// </summary>
    public int Quantity { get; set; } = 1;

    /// <summary>
    /// The warehouse that will fulfill this product
    /// </summary>
    public Guid WarehouseId { get; set; }

    /// <summary>
    /// The shipping option for this product
    /// </summary>
    public Guid ShippingOptionId { get; set; }

    /// <summary>
    /// Selected add-on options (non-variant product options)
    /// </summary>
    public List<OrderAddonDto> Addons { get; set; } = [];
}
