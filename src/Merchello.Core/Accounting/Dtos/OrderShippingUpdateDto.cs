namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Per-order shipping cost update
/// </summary>
public class OrderShippingUpdateDto
{
    /// <summary>
    /// Order ID to update shipping for
    /// </summary>
    public Guid OrderId { get; set; }

    /// <summary>
    /// New shipping cost for this order
    /// </summary>
    public decimal ShippingCost { get; set; }
}

