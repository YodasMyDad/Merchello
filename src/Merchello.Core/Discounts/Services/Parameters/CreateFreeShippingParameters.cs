using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Services.Parameters;

/// <summary>
/// Parameters for creating Free Shipping configuration.
/// </summary>
public class CreateFreeShippingParameters
{
    /// <summary>
    /// Whether free shipping applies to all countries or selected countries.
    /// </summary>
    public FreeShippingCountryScope CountryScope { get; set; }

    /// <summary>
    /// Country codes when CountryScope is SelectedCountries.
    /// </summary>
    public List<string>? CountryCodes { get; set; }

    /// <summary>
    /// Whether to exclude shipping rates over a certain amount.
    /// </summary>
    public bool ExcludeRatesOverAmount { get; set; }

    /// <summary>
    /// The maximum shipping rate value when ExcludeRatesOverAmount is true.
    /// </summary>
    public decimal? ExcludeRatesOverValue { get; set; }

    /// <summary>
    /// Allowed shipping option IDs. Null means all shipping options.
    /// </summary>
    public List<Guid>? AllowedShippingOptionIds { get; set; }
}
