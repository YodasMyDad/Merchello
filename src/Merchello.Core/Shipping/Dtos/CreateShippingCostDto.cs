namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// DTO for creating/updating a shipping cost.
/// </summary>
public class CreateShippingCostDto
{
    public required string CountryCode { get; set; }
    public string? StateOrProvinceCode { get; set; }
    public required decimal Cost { get; set; }
}
