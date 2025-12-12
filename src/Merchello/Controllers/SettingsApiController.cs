using Asp.Versioning;
using Merchello.Core.Data;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
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
    MerchelloDataTypeInitializer dataTypeInitializer,
    ILogger<SettingsApiController> logger) : MerchelloApiControllerBase
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
    /// Get product option settings (available option types and UI aliases)
    /// </summary>
    [HttpGet("settings/product-options")]
    [ProducesResponseType<ProductOptionSettingsDto>(StatusCodes.Status200OK)]
    public IActionResult GetProductOptionSettings()
    {
        return Ok(new ProductOptionSettingsDto
        {
            OptionTypeAliases = settings.Value.OptionTypeAliases,
            OptionUiAliases = settings.Value.OptionUiAliases,
            MaxProductOptions = settings.Value.MaxProductOptions,
            MaxOptionValuesPerOption = settings.Value.MaxOptionValuesPerOption
        });
    }

    /// <summary>
    /// Get the DataType key for the Product Description rich text editor.
    /// This key can be used by the frontend to load the DataType configuration
    /// from Umbraco's Management API.
    /// </summary>
    [HttpGet("settings/description-editor")]
    [ProducesResponseType<DescriptionEditorSettingsDto>(StatusCodes.Status200OK)]
    public IActionResult GetDescriptionEditorSettings()
    {
        try
        {
            var dataTypeKey = dataTypeInitializer.GetProductDescriptionDataTypeKey();
            return Ok(new DescriptionEditorSettingsDto
            {
                DataTypeKey = dataTypeKey,
                PropertyEditorUiAlias = MerchelloDataTypeInitializer.TIPTAP_PROPERTY_EDITOR_UI_ALIAS
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get description editor settings");
            // Return fallback with null key - frontend will use default config
            return Ok(new DescriptionEditorSettingsDto
            {
                DataTypeKey = null,
                PropertyEditorUiAlias = MerchelloDataTypeInitializer.TIPTAP_PROPERTY_EDITOR_UI_ALIAS
            });
        }
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

/// <summary>
/// Product option configuration settings
/// </summary>
public class ProductOptionSettingsDto
{
    /// <summary>
    /// Available option type aliases (e.g., "colour", "size", "material", "pattern")
    /// </summary>
    public string[] OptionTypeAliases { get; set; } = [];

    /// <summary>
    /// Available option UI aliases (e.g., "dropdown", "colour", "image", "checkbox", "radiobutton")
    /// </summary>
    public string[] OptionUiAliases { get; set; } = [];

    /// <summary>
    /// Maximum number of options allowed per product
    /// </summary>
    public int MaxProductOptions { get; set; }

    /// <summary>
    /// Maximum number of values allowed per option
    /// </summary>
    public int MaxOptionValuesPerOption { get; set; }
}

/// <summary>
/// Settings for the Product Description rich text editor
/// </summary>
public class DescriptionEditorSettingsDto
{
    /// <summary>
    /// The DataType key (GUID) that can be used to fetch configuration
    /// from Umbraco's Management API (/umbraco/management/api/v1/data-type/{key})
    /// </summary>
    public Guid? DataTypeKey { get; set; }

    /// <summary>
    /// The property editor UI alias to use (e.g., "Umb.PropertyEditorUi.Tiptap")
    /// </summary>
    public string PropertyEditorUiAlias { get; set; } = string.Empty;
}
