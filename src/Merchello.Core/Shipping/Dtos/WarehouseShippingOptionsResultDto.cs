namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Result for warehouse shipping options lookup.
/// Used by order create/edit modals to show shipping options after warehouse selection.
/// </summary>
public class WarehouseShippingOptionsResultDto
{
    /// <summary>
    /// Whether the warehouse can ship to this destination at all
    /// </summary>
    public bool CanShipToDestination { get; set; }

    /// <summary>
    /// Message explaining why shipping is not available (if applicable)
    /// </summary>
    public string? Message { get; set; }

    /// <summary>
    /// Available shipping options with pricing info
    /// </summary>
    public List<WarehouseShippingOptionDto> AvailableOptions { get; set; } = [];
}
