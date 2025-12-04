namespace Merchello.Core.Products.Models;

/// <summary>
/// Represents package dimensions and weight for shipping calculations.
/// Used when a product ships in multiple boxes or has specific packaging requirements.
/// </summary>
public class ProductPackage
{
    /// <summary>
    /// Package weight in kilograms
    /// </summary>
    public decimal Weight { get; set; }

    /// <summary>
    /// Package length in centimeters
    /// </summary>
    public decimal? LengthCm { get; set; }

    /// <summary>
    /// Package width in centimeters
    /// </summary>
    public decimal? WidthCm { get; set; }

    /// <summary>
    /// Package height in centimeters
    /// </summary>
    public decimal? HeightCm { get; set; }
}
