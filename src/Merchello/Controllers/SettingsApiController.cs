using Asp.Versioning;
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
    ILocalityCatalog localityCatalog) : MerchelloApiControllerBase
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
    /// Get list of countries for address dropdowns
    /// </summary>
    [HttpGet("countries")]
    [ProducesResponseType<List<CountryDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCountries(CancellationToken ct)
    {
        var countries = await localityCatalog.GetCountriesAsync(ct);
        var result = countries.Select(c => new CountryDto
        {
            Code = c.Code,
            Name = c.Name
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
