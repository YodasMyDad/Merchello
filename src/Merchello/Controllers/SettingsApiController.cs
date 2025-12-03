using Asp.Versioning;
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
public class SettingsApiController : MerchelloApiControllerBase
{
    private readonly MerchelloSettings _settings;

    public SettingsApiController(IOptions<MerchelloSettings> settings)
    {
        _settings = settings.Value;
    }

    /// <summary>
    /// Get store settings for the admin UI
    /// </summary>
    [HttpGet("settings")]
    [ProducesResponseType<StoreSettingsDto>(StatusCodes.Status200OK)]
    public IActionResult GetSettings()
    {
        return Ok(new StoreSettingsDto
        {
            CurrencyCode = _settings.StoreCurrencyCode,
            CurrencySymbol = _settings.CurrencySymbol,
            InvoiceNumberPrefix = _settings.InvoiceNumberPrefix
        });
    }
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
