using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Dtos;

/// <summary>
/// DTO for creating Free Shipping configuration.
/// </summary>
public class CreateFreeShippingConfigDto
{
    public FreeShippingCountryScope CountryScope { get; set; }
    public List<string>? CountryCodes { get; set; }
    public bool ExcludeRatesOverAmount { get; set; }
    public decimal? ExcludeRatesOverValue { get; set; }
    public List<Guid>? AllowedShippingOptionIds { get; set; }
}
