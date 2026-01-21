using System.Text.Json;
using Asp.Versioning;
using Merchello.Core.Fulfilment.Dtos;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for managing fulfilment providers in the backoffice.
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class FulfilmentProvidersApiController(
    IFulfilmentProviderManager providerManager) : MerchelloApiControllerBase
{
    /// <summary>
    /// Get all available fulfilment providers discovered from assemblies.
    /// </summary>
    [HttpGet("fulfilment-providers/available")]
    [ProducesResponseType<List<FulfilmentProviderDto>>(StatusCodes.Status200OK)]
    public async Task<List<FulfilmentProviderDto>> GetAvailableProviders(CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        return providers.Select(MapToProviderDto).ToList();
    }

    /// <summary>
    /// Get all configured fulfilment providers.
    /// </summary>
    [HttpGet("fulfilment-providers")]
    [ProducesResponseType<List<FulfilmentProviderListItemDto>>(StatusCodes.Status200OK)]
    public async Task<List<FulfilmentProviderListItemDto>> GetProviderConfigurations(CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetProvidersAsync(cancellationToken);

        return providers
            .Where(p => p.Configuration != null)
            .OrderBy(p => p.SortOrder)
            .Select(MapToListItemDto)
            .ToList();
    }

    /// <summary>
    /// Get a specific fulfilment provider configuration by ID.
    /// </summary>
    [HttpGet("fulfilment-providers/{id:guid}")]
    [ProducesResponseType<FulfilmentProviderDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProviderConfiguration(Guid id, CancellationToken cancellationToken = default)
    {
        var provider = await providerManager.GetConfiguredProviderAsync(id, cancellationToken);

        if (provider?.Configuration == null)
        {
            return NotFound();
        }

        return Ok(MapToProviderDto(provider));
    }

    /// <summary>
    /// Get configuration fields for a fulfilment provider.
    /// </summary>
    [HttpGet("fulfilment-providers/{key}/fields")]
    [ProducesResponseType<List<FulfilmentProviderConfigurationFieldDto>>(StatusCodes.Status200OK)]
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
    /// Create a new fulfilment provider configuration (enable a provider).
    /// </summary>
    [HttpPost("fulfilment-providers")]
    [ProducesResponseType<FulfilmentProviderDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateProviderConfiguration(
        [FromBody] CreateFulfilmentProviderDto request,
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

        var configuration = new FulfilmentProviderConfiguration
        {
            ProviderKey = request.ProviderKey,
            DisplayName = request.DisplayName ?? provider.Metadata.DisplayName,
            IsEnabled = request.IsEnabled,
            InventorySyncMode = request.InventorySyncMode,
            SettingsJson = request.Configuration != null ? JsonSerializer.Serialize(request.Configuration) : null,
            SortOrder = maxSortOrder + 1
        };

        var result = await providerManager.SaveConfigurationAsync(configuration, cancellationToken);

        var updatedProvider = await providerManager.GetProviderAsync(request.ProviderKey, requireEnabled: false, cancellationToken);
        return Ok(MapToProviderDto(updatedProvider!));
    }

    /// <summary>
    /// Update a fulfilment provider configuration.
    /// </summary>
    [HttpPut("fulfilment-providers/{id:guid}")]
    [ProducesResponseType<FulfilmentProviderDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProviderConfiguration(
        Guid id,
        [FromBody] UpdateFulfilmentProviderDto request,
        CancellationToken cancellationToken = default)
    {
        var provider = await providerManager.GetConfiguredProviderAsync(id, cancellationToken);

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

        if (request.InventorySyncMode.HasValue)
        {
            configuration.InventorySyncMode = request.InventorySyncMode.Value;
        }

        if (request.Configuration != null)
        {
            configuration.SettingsJson = JsonSerializer.Serialize(request.Configuration);
        }

        await providerManager.SaveConfigurationAsync(configuration, cancellationToken);

        var updatedProvider = await providerManager.GetProviderAsync(provider.Metadata.Key, requireEnabled: false, cancellationToken);
        return Ok(MapToProviderDto(updatedProvider!));
    }

    /// <summary>
    /// Delete a fulfilment provider configuration.
    /// </summary>
    [HttpDelete("fulfilment-providers/{id:guid}")]
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
    /// Toggle fulfilment provider enabled status.
    /// </summary>
    [HttpPut("fulfilment-providers/{id:guid}/toggle")]
    [ProducesResponseType<FulfilmentProviderDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleProvider(
        Guid id,
        [FromBody] ToggleFulfilmentProviderDto request,
        CancellationToken cancellationToken = default)
    {
        var success = await providerManager.SetProviderEnabledAsync(id, request.IsEnabled, cancellationToken);
        if (!success)
        {
            return NotFound();
        }

        var provider = await providerManager.GetConfiguredProviderAsync(id, cancellationToken);

        if (provider?.Configuration == null)
        {
            return NotFound();
        }

        return Ok(MapToProviderDto(provider));
    }

    /// <summary>
    /// Test a fulfilment provider connection.
    /// </summary>
    [HttpPost("fulfilment-providers/{id:guid}/test")]
    [ProducesResponseType<TestFulfilmentProviderDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TestProvider(Guid id, CancellationToken cancellationToken = default)
    {
        var provider = await providerManager.GetConfiguredProviderAsync(id, cancellationToken);

        if (provider?.Configuration == null)
        {
            return NotFound("Provider configuration not found.");
        }

        var result = await provider.Provider.TestConnectionAsync(cancellationToken);

        return Ok(new TestFulfilmentProviderDto
        {
            Success = result.Success,
            ProviderVersion = result.ProviderVersion,
            AccountName = result.AccountName,
            WarehouseCount = result.WarehouseCount,
            ErrorMessage = result.ErrorMessage,
            ErrorCode = result.ErrorCode
        });
    }

    // ============================================
    // Mapping Helpers
    // ============================================

    private static FulfilmentProviderDto MapToProviderDto(RegisteredFulfilmentProvider registered)
    {
        var meta = registered.Metadata;
        return new FulfilmentProviderDto
        {
            Key = meta.Key,
            DisplayName = registered.DisplayName,
            Icon = meta.Icon,
            IconSvg = meta.IconSvg,
            Description = meta.Description,
            SetupInstructions = meta.SetupInstructions,
            SupportsOrderSubmission = meta.SupportsOrderSubmission,
            SupportsOrderCancellation = meta.SupportsOrderCancellation,
            SupportsWebhooks = meta.SupportsWebhooks,
            SupportsPolling = meta.SupportsPolling,
            SupportsProductSync = meta.SupportsProductSync,
            SupportsInventorySync = meta.SupportsInventorySync,
            ApiStyle = meta.ApiStyle,
            IsEnabled = registered.IsEnabled,
            ConfigurationId = registered.Configuration?.Id
        };
    }

    private static FulfilmentProviderListItemDto MapToListItemDto(RegisteredFulfilmentProvider registered)
    {
        var meta = registered.Metadata;
        return new FulfilmentProviderListItemDto
        {
            Key = meta.Key,
            DisplayName = registered.DisplayName,
            Icon = meta.Icon,
            IconSvg = meta.IconSvg,
            Description = meta.Description,
            IsEnabled = registered.IsEnabled,
            ConfigurationId = registered.Configuration?.Id,
            SortOrder = registered.SortOrder,
            InventorySyncMode = registered.Configuration?.InventorySyncMode ?? InventorySyncMode.Full,
            ApiStyle = meta.ApiStyle,
            SupportsOrderSubmission = meta.SupportsOrderSubmission,
            SupportsWebhooks = meta.SupportsWebhooks,
            SupportsProductSync = meta.SupportsProductSync,
            SupportsInventorySync = meta.SupportsInventorySync
        };
    }

    private static FulfilmentProviderConfigurationFieldDto MapToFieldDto(FulfilmentProviderConfigurationField field)
    {
        return new FulfilmentProviderConfigurationFieldDto
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
