using Asp.Versioning;
using Merchello.Core.Data;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Settings.Dtos;
using Merchello.Core.Settings.Services.Interfaces;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shared.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
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
    IConfiguration configuration,
    ILocalityCatalog localityCatalog,
    MerchelloDataTypeInitializer dataTypeInitializer,
    IMerchelloStoreSettingsService storeSettingsService,
    ILogger<SettingsApiController> logger) : MerchelloApiControllerBase
{
    private static readonly string[] DefaultOptionTypeAliases = ["colour", "size", "material", "pattern"];
    private static readonly string[] DefaultOptionUiAliases = ["dropdown", "colour", "image", "checkbox", "radiobutton"];

    /// <summary>
    /// Get store settings for the admin UI
    /// </summary>
    [HttpGet("settings")]
    [ProducesResponseType<StoreSettingsDto>(StatusCodes.Status200OK)]
    public IActionResult GetSettings()
    {
        var runtimeSettings = storeSettingsService.GetRuntimeSettings();
        return Ok(new StoreSettingsDto
        {
            CurrencyCode = settings.Value.StoreCurrencyCode,
            CurrencySymbol = settings.Value.CurrencySymbol,
            InvoiceNumberPrefix = runtimeSettings.Merchello.InvoiceNumberPrefix,
            LowStockThreshold = runtimeSettings.Merchello.LowStockThreshold
        });
    }

    /// <summary>
    /// Gets the DB-backed full store configuration payload for the root settings workspace.
    /// </summary>
    [HttpGet("settings/store-configuration")]
    [ProducesResponseType<StoreConfigurationDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStoreConfiguration(CancellationToken ct)
    {
        var configuration = await storeSettingsService.GetStoreConfigurationAsync(ct);
        return Ok(configuration);
    }

    /// <summary>
    /// Saves the DB-backed full store configuration payload for the root settings workspace.
    /// </summary>
    [HttpPut("settings/store-configuration")]
    [ProducesResponseType<StoreConfigurationDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SaveStoreConfiguration(
        [FromBody] StoreConfigurationDto configuration,
        CancellationToken ct)
    {
        var result = await storeSettingsService.SaveStoreConfigurationAsync(configuration, ct);
        if (CrudErrors(result) is { } error)
        {
            return error;
        }

        return Ok(result.ResultObject);
    }

    /// <summary>
    /// Get list of all countries for address dropdowns and admin configuration.
    /// For storefront country selection (countries warehouses can ship to),
    /// use the storefront API's shipping/countries endpoint instead.
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
        var optionTypeAliases = ResolveAliases(
            configuration.GetSection("Merchello:OptionTypeAliases").Get<string[]>(),
            settings.Value.OptionTypeAliases,
            DefaultOptionTypeAliases);
        var optionUiAliases = ResolveAliases(
            configuration.GetSection("Merchello:OptionUiAliases").Get<string[]>(),
            settings.Value.OptionUiAliases,
            DefaultOptionUiAliases);

        return Ok(new ProductOptionSettingsDto
        {
            OptionTypeAliases = optionTypeAliases,
            OptionUiAliases = optionUiAliases,
            MaxProductOptions = settings.Value.MaxProductOptions,
            MaxOptionValuesPerOption = settings.Value.MaxOptionValuesPerOption
        });
    }

    private static string[] ResolveAliases(string[]? configuredAliases, string[]? boundAliases, string[] defaults)
    {
        if (configuredAliases is { Length: > 0 })
        {
            return NormalizeAliases(configuredAliases, defaults);
        }

        return NormalizeAliases(boundAliases, defaults);
    }

    private static string[] NormalizeAliases(IEnumerable<string>? aliases, string[] defaults)
    {
        var normalized = aliases?
            .Where(alias => !string.IsNullOrWhiteSpace(alias))
            .Select(alias => alias.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray() ?? [];

        return normalized.Length > 0 ? normalized : defaults;
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
