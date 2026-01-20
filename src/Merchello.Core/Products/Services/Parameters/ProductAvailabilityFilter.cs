namespace Merchello.Core.Products.Services.Parameters;

/// <summary>
/// Filter options for product availability
/// </summary>
public enum ProductAvailabilityFilter
{
    /// <summary>All products regardless of availability</summary>
    All,
    /// <summary>Only products that are available for purchase</summary>
    Available,
    /// <summary>Only products that are unavailable for purchase</summary>
    Unavailable
}
