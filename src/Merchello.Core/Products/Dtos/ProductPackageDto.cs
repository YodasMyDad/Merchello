namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Package configuration for shipping calculations
/// </summary>
public class ProductPackageDto
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
