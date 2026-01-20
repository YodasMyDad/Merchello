namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Result of addon price preview calculation.
/// Backend-calculated to ensure proper currency handling.
/// </summary>
public class AddonPricePreviewDto
{
    /// <summary>
    /// Base price of the variant
    /// </summary>
    public decimal BasePrice { get; set; }

    /// <summary>
    /// Total price adjustment from selected add-ons
    /// </summary>
    public decimal AddonsTotal { get; set; }

    /// <summary>
    /// Total price (BasePrice + AddonsTotal)
    /// </summary>
    public decimal TotalPrice { get; set; }
}
