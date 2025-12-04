namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Result for product page shipping options display
/// </summary>
public class ProductShippingOptionsResult
{
    /// <summary>
    /// Available shipping methods for the product at this location
    /// </summary>
    public List<ProductShippingMethod> AvailableMethods { get; set; } = [];

    /// <summary>
    /// Whether real-time rates need to be fetched at checkout (e.g., for FedEx/UPS)
    /// </summary>
    public bool RequiresCheckoutForRates { get; set; }

    /// <summary>
    /// Whether the product can be shipped to this location at all
    /// </summary>
    public bool CanShipToLocation { get; set; }

    /// <summary>
    /// Optional message for the user (e.g., "Shipping calculated at checkout")
    /// </summary>
    public string? Message { get; set; }
}

