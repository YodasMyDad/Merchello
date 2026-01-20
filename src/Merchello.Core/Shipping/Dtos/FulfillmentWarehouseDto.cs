namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Warehouse that can fulfill a product
/// </summary>
public class FulfillmentWarehouseDto
{
    /// <summary>
    /// Warehouse ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Warehouse display name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Available stock at this warehouse (Stock - ReservedStock)
    /// </summary>
    public int AvailableStock { get; set; }
}
