using Merchello.Core.Checkout.Dtos;

namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Line item within a shipment
/// </summary>
public class ShipmentLineItemDto
{
    public Guid Id { get; set; }
    public Guid LineItemId { get; set; }
    public string? Sku { get; set; }

    /// <summary>
    /// The variant name (e.g., "S-Grey"). Kept for backward compatibility.
    /// For display, prefer ProductRootName with SelectedOptions.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// The root product name (e.g., "Premium V-Neck").
    /// </summary>
    public string ProductRootName { get; set; } = "";

    /// <summary>
    /// Selected options for this variant (e.g., Color: Grey, Size: S).
    /// </summary>
    public List<SelectedOptionDto> SelectedOptions { get; set; } = [];

    public int Quantity { get; set; }
    public string? ImageUrl { get; set; }
}
