using System.Text.Json;
using Asp.Versioning;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Merchello.Controllers;

/// <summary>
/// API controller for managing shipping providers in the backoffice
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class ShippingProvidersApiController(
    IShippingProviderManager providerManager,
    IWarehouseService warehouseService,
    IShippingOptionService shippingOptionService,
    IOptions<MerchelloSettings> merchelloSettings) : MerchelloApiControllerBase
{
    private readonly MerchelloSettings _settings = merchelloSettings.Value;
    /// <summary>
    /// Get all available shipping providers discovered from assemblies
    /// </summary>
    [HttpGet("shipping-providers/available")]
    [ProducesResponseType<List<ShippingProviderDto>>(StatusCodes.Status200OK)]
    public async Task<List<ShippingProviderDto>> GetAvailableProviders(CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        return providers.Select(MapToProviderDto).ToList();
    }

    /// <summary>
    /// Get all configured shipping provider settings
    /// </summary>
    [HttpGet("shipping-providers")]
    [ProducesResponseType<List<ShippingProviderConfigurationDto>>(StatusCodes.Status200OK)]
    public async Task<List<ShippingProviderConfigurationDto>> GetProviderConfigurations(CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetProvidersAsync(cancellationToken);

        return providers
            .Where(p => p.Configuration != null)
            .OrderBy(p => p.SortOrder)
            .Select(p => MapToConfigurationDto(p.Configuration!, p))
            .ToList();
    }

    /// <summary>
    /// Get a specific shipping provider configuration by ID
    /// </summary>
    [HttpGet("shipping-providers/{id:guid}")]
    [ProducesResponseType<ShippingProviderConfigurationDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProviderConfiguration(Guid id, CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        var provider = providers.FirstOrDefault(p => p.Configuration?.Id == id);

        if (provider?.Configuration == null)
        {
            return NotFound();
        }

        return Ok(MapToConfigurationDto(provider.Configuration, provider));
    }

    /// <summary>
    /// Get configuration fields for a shipping provider
    /// </summary>
    [HttpGet("shipping-providers/{key}/fields")]
    [ProducesResponseType<List<ShippingProviderFieldDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProviderFields(string key, CancellationToken cancellationToken = default)
    {
        var provider = await providerManager.GetProviderAsync(key, requireEnabled: false, cancellationToken);
        if (provider == null)
        {
            return NotFound($"Provider '{key}' not found.");
        }

        var fields = await provider.Provider.GetConfigurationFieldsAsync(cancellationToken);
        var result = fields.Select(MapToFieldDto).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Create a new shipping provider configuration (enable a provider)
    /// </summary>
    [HttpPost("shipping-providers")]
    [ProducesResponseType<ShippingProviderConfigurationDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateProviderConfiguration(
        [FromBody] CreateShippingProviderDto request,
        CancellationToken cancellationToken = default)
    {
        var provider = await providerManager.GetProviderAsync(request.ProviderKey, requireEnabled: false, cancellationToken);
        if (provider == null)
        {
            return NotFound($"Provider '{request.ProviderKey}' not found.");
        }

        if (provider.Configuration != null)
        {
            return BadRequest($"Provider '{request.ProviderKey}' is already configured.");
        }

        var allProviders = await providerManager.GetProvidersAsync(cancellationToken);
        var maxSortOrder = allProviders
            .Where(p => p.Configuration != null)
            .Select(p => p.Configuration!.SortOrder)
            .DefaultIfEmpty(0)
            .Max();

        var configuration = new ShippingProviderConfiguration
        {
            ProviderKey = request.ProviderKey,
            DisplayName = request.DisplayName ?? provider.Metadata.DisplayName,
            IsEnabled = request.IsEnabled,
            SettingsJson = request.Configuration != null ? JsonSerializer.Serialize(request.Configuration) : null,
            SortOrder = maxSortOrder + 1
        };

        var result = await providerManager.SaveConfigurationAsync(configuration, cancellationToken);

        var updatedProvider = await providerManager.GetProviderAsync(request.ProviderKey, requireEnabled: false, cancellationToken);
        return Ok(MapToConfigurationDto(result, updatedProvider));
    }

    /// <summary>
    /// Update a shipping provider configuration
    /// </summary>
    [HttpPut("shipping-providers/{id:guid}")]
    [ProducesResponseType<ShippingProviderConfigurationDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProviderConfiguration(
        Guid id,
        [FromBody] UpdateShippingProviderDto request,
        CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        var provider = providers.FirstOrDefault(p => p.Configuration?.Id == id);

        if (provider?.Configuration == null)
        {
            return NotFound();
        }

        var configuration = provider.Configuration;

        if (request.DisplayName != null)
        {
            configuration.DisplayName = request.DisplayName;
        }

        if (request.IsEnabled.HasValue)
        {
            configuration.IsEnabled = request.IsEnabled.Value;
        }

        if (request.Configuration != null)
        {
            configuration.SettingsJson = JsonSerializer.Serialize(request.Configuration);
        }

        var result = await providerManager.SaveConfigurationAsync(configuration, cancellationToken);

        var updatedProvider = await providerManager.GetProviderAsync(provider.Metadata.Key, requireEnabled: false, cancellationToken);
        return Ok(MapToConfigurationDto(result, updatedProvider));
    }

    /// <summary>
    /// Delete a shipping provider configuration
    /// </summary>
    [HttpDelete("shipping-providers/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteProviderConfiguration(Guid id, CancellationToken cancellationToken = default)
    {
        var success = await providerManager.DeleteConfigurationAsync(id, cancellationToken);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }

    /// <summary>
    /// Toggle shipping provider enabled status
    /// </summary>
    [HttpPut("shipping-providers/{id:guid}/toggle")]
    [ProducesResponseType<ShippingProviderConfigurationDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleProvider(
        Guid id,
        [FromBody] ToggleShippingProviderDto request,
        CancellationToken cancellationToken = default)
    {
        var success = await providerManager.SetProviderEnabledAsync(id, request.IsEnabled, cancellationToken);
        if (!success)
        {
            return NotFound();
        }

        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        var provider = providers.FirstOrDefault(p => p.Configuration?.Id == id);

        if (provider?.Configuration == null)
        {
            return NotFound();
        }

        return Ok(MapToConfigurationDto(provider.Configuration, provider));
    }

    /// <summary>
    /// Reorder shipping providers
    /// </summary>
    [HttpPut("shipping-providers/reorder")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ReorderProviders(
        [FromBody] ReorderShippingProvidersDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.OrderedIds == null || request.OrderedIds.Count == 0)
        {
            return BadRequest("OrderedIds is required.");
        }

        await providerManager.UpdateSortOrderAsync(request.OrderedIds, cancellationToken);
        return Ok();
    }

    /// <summary>
    /// Get method configuration fields and capabilities for a provider.
    /// Used by UI to render the correct config form when adding/editing shipping methods.
    /// </summary>
    [HttpGet("shipping-providers/{providerKey}/method-config")]
    [ProducesResponseType<ProviderMethodConfigDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMethodConfig(string providerKey, CancellationToken cancellationToken = default)
    {
        var provider = await providerManager.GetProviderAsync(providerKey, requireEnabled: false, cancellationToken);
        if (provider == null)
        {
            return NotFound($"Provider '{providerKey}' not found.");
        }

        var fields = await provider.Provider.GetMethodConfigFieldsAsync(cancellationToken);

        return Ok(new ProviderMethodConfigDto
        {
            ProviderKey = providerKey,
            DisplayName = provider.Metadata.DisplayName,
            Fields = fields.Select(MapToFieldDto).ToList(),
            Capabilities = new ProviderConfigCapabilitiesDto
            {
                HasLocationBasedCosts = provider.Metadata.ConfigCapabilities.HasLocationBasedCosts,
                HasWeightTiers = provider.Metadata.ConfigCapabilities.HasWeightTiers,
                UsesLiveRates = provider.Metadata.ConfigCapabilities.UsesLiveRates,
                RequiresGlobalConfig = provider.Metadata.ConfigCapabilities.RequiresGlobalConfig
            }
        });
    }

    /// <summary>
    /// Get providers available for adding shipping methods to a warehouse.
    /// FlatRate is always available; others require global configuration.
    /// </summary>
    [HttpGet("shipping-providers/available-for-warehouse")]
    [ProducesResponseType<List<AvailableProviderDto>>(StatusCodes.Status200OK)]
    public async Task<List<AvailableProviderDto>> GetAvailableForWarehouse(CancellationToken cancellationToken = default)
    {
        var allProviders = await providerManager.GetProvidersAsync(cancellationToken);

        return allProviders.Select(p => new AvailableProviderDto
        {
            Key = p.Metadata.Key,
            DisplayName = p.Metadata.DisplayName,
            Icon = p.Metadata.Icon,
            Description = p.Metadata.Description,
            IsAvailable = !p.Metadata.ConfigCapabilities.RequiresGlobalConfig || p.Configuration != null,
            RequiresSetup = p.Metadata.ConfigCapabilities.RequiresGlobalConfig && p.Configuration == null,
            Capabilities = new ProviderConfigCapabilitiesDto
            {
                HasLocationBasedCosts = p.Metadata.ConfigCapabilities.HasLocationBasedCosts,
                HasWeightTiers = p.Metadata.ConfigCapabilities.HasWeightTiers,
                UsesLiveRates = p.Metadata.ConfigCapabilities.UsesLiveRates,
                RequiresGlobalConfig = p.Metadata.ConfigCapabilities.RequiresGlobalConfig
            }
        }).ToList();
    }

    /// <summary>
    /// Test a shipping provider configuration with sample data.
    /// Allows users to verify their API credentials and configuration are working correctly.
    /// </summary>
    [HttpPost("shipping-providers/{id:guid}/test")]
    [ProducesResponseType<TestShippingProviderResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> TestProvider(
        Guid id,
        [FromBody] TestShippingProviderDto request,
        CancellationToken cancellationToken = default)
    {
        // 1. Get the provider configuration
        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        var provider = providers.FirstOrDefault(p => p.Configuration?.Id == id);

        if (provider?.Configuration == null)
        {
            return NotFound("Provider configuration not found.");
        }

        // 2. Get the warehouse for origin address
        var warehouse = await warehouseService.GetWarehouseByIdAsync(request.WarehouseId, cancellationToken);
        if (warehouse == null)
        {
            return BadRequest("Warehouse not found.");
        }

        // 3. Build the shipping quote request
        var quoteRequest = new ShippingQuoteRequest
        {
            CountryCode = request.CountryCode,
            StateOrProvinceCode = request.StateOrProvinceCode,
            PostalCode = request.PostalCode,
            City = request.City,
            OriginWarehouseId = warehouse.Id,
            OriginAddress = warehouse.Address,
            ItemsSubtotal = request.ItemsSubtotal,
            CurrencyCode = _settings.StoreCurrencyCode,
            IsEstimateMode = string.IsNullOrEmpty(request.PostalCode),
            Packages =
            [
                new ShipmentPackage(
                    request.WeightKg,
                    request.LengthCm,
                    request.WidthCm,
                    request.HeightCm)
            ],
            Items =
            [
                new ShippingQuoteItem
                {
                    Quantity = 1,
                    IsShippable = true,
                    TotalWeightKg = request.WeightKg,
                    LengthCm = request.LengthCm,
                    WidthCm = request.WidthCm,
                    HeightCm = request.HeightCm
                }
            ]
        };

        // 4. Get configured service types for this provider
        var configuredServiceTypes = await shippingOptionService.GetConfiguredServiceTypesAsync(
            provider.Metadata.Key,
            cancellationToken);
        var configuredSet = new HashSet<string>(configuredServiceTypes, StringComparer.OrdinalIgnoreCase);

        // 5. Get rates from the provider
        var response = new TestShippingProviderResultDto
        {
            ProviderKey = provider.Metadata.Key,
            ProviderName = provider.DisplayName
        };

        try
        {
            if (!provider.Provider.IsAvailableFor(quoteRequest))
            {
                response.IsSuccessful = false;
                response.Errors.Add("Provider is not available for this destination or configuration.");
                return Ok(response);
            }

            var quote = await provider.Provider.GetRatesAsync(quoteRequest, cancellationToken);

            if (quote == null)
            {
                response.IsSuccessful = false;
                response.Errors.Add("Provider returned no rates for this request.");
                return Ok(response);
            }

            // Track which configured service types were returned
            var returnedServiceTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            response.IsSuccessful = quote.Errors.Count == 0;
            response.ServiceLevels = quote.ServiceLevels.Select(sl =>
            {
                // Extract service type from extended properties (provider-specific key)
                var serviceType = ExtractServiceType(sl);
                if (!string.IsNullOrEmpty(serviceType))
                {
                    returnedServiceTypes.Add(serviceType);
                }

                return new TestShippingServiceLevelDto
                {
                    ServiceCode = sl.ServiceCode,
                    ServiceType = serviceType,
                    ServiceName = sl.ServiceName,
                    TotalCost = sl.TotalCost,
                    CurrencyCode = sl.CurrencyCode,
                    TransitTime = sl.TransitTime?.TotalDays > 0
                        ? $"{(int)sl.TransitTime.Value.TotalDays} day{((int)sl.TransitTime.Value.TotalDays != 1 ? "s" : "")}"
                        : null,
                    EstimatedDeliveryDate = sl.EstimatedDeliveryDate,
                    Description = sl.Description,
                    IsConfigured = !string.IsNullOrEmpty(serviceType) && configuredSet.Contains(serviceType),
                    IsValid = true
                };
            }).ToList();

            // Add configured service types that were NOT returned (invalid/unavailable)
            foreach (var configuredType in configuredServiceTypes)
            {
                if (!returnedServiceTypes.Contains(configuredType))
                {
                    response.ServiceLevels.Add(new TestShippingServiceLevelDto
                    {
                        ServiceCode = $"{provider.Metadata.Key}-{configuredType.ToLowerInvariant()}",
                        ServiceType = configuredType,
                        ServiceName = configuredType,
                        TotalCost = 0,
                        CurrencyCode = _settings.StoreCurrencyCode ?? "USD",
                        IsConfigured = true,
                        IsValid = false
                    });
                }
            }

            response.Errors = quote.Errors.ToList();
        }
        catch (Exception ex)
        {
            response.IsSuccessful = false;
            response.Errors.Add($"Error testing provider: {ex.Message}");
        }

        return Ok(response);
    }

    /// <summary>
    /// Extract service type code from a shipping service level.
    /// Uses the concrete ServiceType property instead of magic strings in ExtendedProperties.
    /// </summary>
    private static string? ExtractServiceType(ShippingServiceLevel sl)
    {
        return sl.ServiceType?.Code;
    }

    // ============================================
    // Mapping Helpers
    // ============================================

    private static ShippingProviderDto MapToProviderDto(RegisteredShippingProvider registered)
    {
        var meta = registered.Metadata;
        return new ShippingProviderDto
        {
            Key = meta.Key,
            DisplayName = registered.DisplayName,
            Icon = meta.Icon,
            Description = meta.Description,
            SupportsRealTimeRates = meta.SupportsRealTimeRates,
            SupportsTracking = meta.SupportsTracking,
            SupportsLabelGeneration = meta.SupportsLabelGeneration,
            SupportsDeliveryDateSelection = meta.SupportsDeliveryDateSelection,
            SupportsInternational = meta.SupportsInternational,
            RequiresFullAddress = meta.RequiresFullAddress,
            IsEnabled = registered.IsEnabled,
            ConfigurationId = registered.Configuration?.Id,
            SetupInstructions = meta.SetupInstructions,
            ConfigCapabilities = new ProviderConfigCapabilitiesDto
            {
                HasLocationBasedCosts = meta.ConfigCapabilities.HasLocationBasedCosts,
                HasWeightTiers = meta.ConfigCapabilities.HasWeightTiers,
                UsesLiveRates = meta.ConfigCapabilities.UsesLiveRates,
                RequiresGlobalConfig = meta.ConfigCapabilities.RequiresGlobalConfig
            }
        };
    }

    private static ShippingProviderConfigurationDto MapToConfigurationDto(
        ShippingProviderConfiguration configuration,
        RegisteredShippingProvider? provider)
    {
        Dictionary<string, string>? config = null;
        if (!string.IsNullOrEmpty(configuration.SettingsJson))
        {
            try
            {
                config = JsonSerializer.Deserialize<Dictionary<string, string>>(configuration.SettingsJson);
            }
            catch
            {
                // Ignore deserialization errors
            }
        }

        return new ShippingProviderConfigurationDto
        {
            Id = configuration.Id,
            ProviderKey = configuration.ProviderKey,
            DisplayName = configuration.DisplayName ?? provider?.Metadata.DisplayName ?? configuration.ProviderKey,
            IsEnabled = configuration.IsEnabled,
            Configuration = config,
            SortOrder = configuration.SortOrder,
            DateCreated = configuration.CreateDate,
            DateUpdated = configuration.UpdateDate,
            Provider = provider != null ? MapToProviderDto(provider) : null
        };
    }

    private static ShippingProviderFieldDto MapToFieldDto(ShippingProviderConfigurationField field)
    {
        return new ShippingProviderFieldDto
        {
            Key = field.Key,
            Label = field.Label,
            Description = field.Description,
            FieldType = field.FieldType.ToString(),
            IsRequired = field.IsRequired,
            IsSensitive = field.IsSensitive,
            DefaultValue = field.DefaultValue,
            Placeholder = field.Placeholder,
            Options = field.Options?.Select(o => new SelectOptionDto
            {
                Value = o.Value,
                Label = o.Label
            }).ToList()
        };
    }
}
