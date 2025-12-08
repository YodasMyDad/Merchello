using Asp.Versioning;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Merchello.Controllers;

/// <summary>
/// API controller for store settings
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class SettingsApiController(
    IOptions<MerchelloSettings> settings,
    ILocalityCatalog localityCatalog,
    ITaxService taxService) : MerchelloApiControllerBase
{
    /// <summary>
    /// Get store settings for the admin UI
    /// </summary>
    [HttpGet("settings")]
    [ProducesResponseType<StoreSettingsDto>(StatusCodes.Status200OK)]
    public IActionResult GetSettings()
    {
        return Ok(new StoreSettingsDto
        {
            CurrencyCode = settings.Value.StoreCurrencyCode,
            CurrencySymbol = settings.Value.CurrencySymbol,
            InvoiceNumberPrefix = settings.Value.InvoiceNumberPrefix
        });
    }

    /// <summary>
    /// Get list of countries for address dropdowns.
    /// Returns only countries allowed by store settings (AllowedCountries).
    /// If no restrictions are configured, returns all countries.
    /// </summary>
    [HttpGet("countries")]
    [ProducesResponseType<List<CountryDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCountries(CancellationToken ct)
    {
        var countries = await localityCatalog.GetStoreCountriesAsync(ct);
        var result = countries.Select(c => new CountryDto
        {
            Code = c.Code,
            Name = c.Name
        }).ToList();
        return Ok(result);
    }

    /// <summary>
    /// Get regions/states for a country
    /// </summary>
    [HttpGet("countries/{countryCode}/regions")]
    [ProducesResponseType<List<RegionDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRegions(string countryCode, CancellationToken ct)
    {
        var regions = await localityCatalog.GetRegionsAsync(countryCode, ct);
        var result = regions.Select(r => new RegionDto
        {
            CountryCode = r.CountryCode,
            RegionCode = r.RegionCode,
            Name = r.Name
        }).ToList();
        return Ok(result);
    }

    /// <summary>
    /// Get list of tax groups for tax rate selection
    /// </summary>
    [HttpGet("tax-groups")]
    [ProducesResponseType<List<TaxGroupDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTaxGroups(CancellationToken ct)
    {
        var taxGroups = await taxService.GetTaxGroups(ct);
        var result = taxGroups.Select(tg => new TaxGroupDto
        {
            Id = tg.Id,
            Name = tg.Name ?? "Unnamed",
            TaxPercentage = tg.TaxPercentage
        }).ToList();
        return Ok(result);
    }
}

/// <summary>
/// Country data for dropdowns
/// </summary>
public class CountryDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

/// <summary>
/// Region/state data for dropdowns
/// </summary>
public class RegionDto
{
    public string CountryCode { get; set; } = string.Empty;
    public string RegionCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

/// <summary>
/// Tax group data for dropdowns
/// </summary>
public class TaxGroupDto
{
    /// <summary>
    /// Tax group ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Tax group name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Tax percentage rate
    /// </summary>
    public decimal TaxPercentage { get; set; }
}

/// <summary>
/// Store settings exposed to the admin UI
/// </summary>
public class StoreSettingsDto
{
    /// <summary>
    /// Store currency code (ISO 4217), e.g., "GBP", "USD", "EUR"
    /// </summary>
    public string CurrencyCode { get; set; } = string.Empty;

    /// <summary>
    /// Store currency symbol, e.g., "£", "$", "€"
    /// </summary>
    public string CurrencySymbol { get; set; } = string.Empty;

    /// <summary>
    /// Invoice number prefix, e.g., "INV-"
    /// </summary>
    public string InvoiceNumberPrefix { get; set; } = string.Empty;
}
