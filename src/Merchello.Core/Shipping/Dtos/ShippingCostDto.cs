namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// DTO for shipping cost entries.
/// </summary>
public class ShippingCostDto
{
    public Guid Id { get; set; }
    public string CountryCode { get; set; } = null!;
    public string? StateOrProvinceCode { get; set; }
    public decimal Cost { get; set; }

    /// <summary>
    /// Display-friendly region name (e.g., "United Kingdom" or "California, US").
    /// </summary>
    public string? RegionDisplay { get; set; }
}
