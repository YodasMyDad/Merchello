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

/// <summary>
/// A shipping method available for a product
/// </summary>
public class ProductShippingMethod
{
    /// <summary>
    /// Display name (e.g., "Standard Shipping", "Next Day Delivery")
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// Delivery time description (e.g., "3-5 business days", "Next Day")
    /// </summary>
    public string? DeliveryTimeDescription { get; set; }

    /// <summary>
    /// Estimated cost (null if requires checkout for real-time rate)
    /// </summary>
    public decimal? EstimatedCost { get; set; }

    /// <summary>
    /// Whether this is an estimated cost (flat rate) or exact (real-time API)
    /// </summary>
    public bool IsEstimate { get; set; }

    /// <summary>
    /// Service level identifier for sorting/grouping
    /// </summary>
    public string? ServiceLevel { get; set; }

    /// <summary>
    /// Sort order for display
    /// </summary>
    public int SortOrder { get; set; }
}
