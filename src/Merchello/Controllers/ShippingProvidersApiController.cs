using System.Text.Json;
using Asp.Versioning;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for managing shipping providers in the backoffice
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class ShippingProvidersApiController(
    IShippingProviderManager providerManager) : MerchelloApiControllerBase
{
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
