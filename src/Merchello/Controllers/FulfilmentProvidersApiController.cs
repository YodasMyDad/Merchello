using System.Text.Json;
using Asp.Versioning;
using Merchello.Core.Fulfilment.Dtos;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Fulfilment.Services.Parameters;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shared.Providers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for managing fulfilment providers in the backoffice.
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class FulfilmentProvidersApiController(
    IFulfilmentProviderManager providerManager,
    IFulfilmentSyncService syncService) : MerchelloApiControllerBase
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
    [ProducesResponseType<List<ProviderConfigurationFieldDto>>(StatusCodes.Status200OK)]
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

        var testResult = await provider.Provider.TestConnectionAsync(cancellationToken);

        return Ok(new TestFulfilmentProviderDto
        {
            Success = testResult.Success,
            ProviderVersion = testResult.ProviderVersion,
            AccountName = testResult.AccountName,
            WarehouseCount = testResult.WarehouseCount,
            ErrorMessage = testResult.ErrorMessage,
            ErrorCode = testResult.ErrorCode
        });
    }

    /// <summary>
    /// Get configured fulfilment providers for dropdown selection.
    /// </summary>
    [HttpGet("fulfilment-providers/options")]
    [ProducesResponseType<List<FulfilmentProviderOptionDto>>(StatusCodes.Status200OK)]
    public async Task<List<FulfilmentProviderOptionDto>> GetProviderOptions(CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetProvidersAsync(cancellationToken);

        return providers
            .Where(p => p.Configuration != null)
            .Select(p => new FulfilmentProviderOptionDto
            {
                ConfigurationId = p.Configuration!.Id,
                DisplayName = p.DisplayName,
                ProviderKey = p.Metadata.Key,
                IsEnabled = p.IsEnabled
            })
            .ToList();
    }

    // ============================================
    // Sync Log Endpoints
    // ============================================

    /// <summary>
    /// Get paginated fulfilment sync logs.
    /// </summary>
    [HttpGet("fulfilment-providers/sync-logs")]
    [ProducesResponseType<FulfilmentSyncLogPageDto>(StatusCodes.Status200OK)]
    public async Task<FulfilmentSyncLogPageDto> GetSyncLogs(
        [FromQuery] Guid? providerConfigurationId,
        [FromQuery] FulfilmentSyncType? syncType,
        [FromQuery] FulfilmentSyncStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var parameters = new FulfilmentSyncLogQueryParameters
        {
            ProviderConfigurationId = providerConfigurationId,
            SyncType = syncType,
            Status = status,
            Page = page,
            PageSize = pageSize
        };

        var result = await syncService.GetSyncHistoryAsync(parameters, cancellationToken);

        // Get provider display names for the logs
        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        var providerLookup = providers
            .Where(p => p.Configuration != null)
            .ToDictionary(p => p.Configuration!.Id, p => p.DisplayName);

        return new FulfilmentSyncLogPageDto
        {
            Items = result.Items.Select(log => MapToSyncLogDto(log, providerLookup)).ToList(),
            Page = result.PageIndex,
            PageSize = pageSize,
            TotalItems = result.TotalItems,
            TotalPages = result.TotalPages,
            HasPreviousPage = result.HasPreviousPage,
            HasNextPage = result.HasNextPage
        };
    }

    /// <summary>
    /// Get a specific sync log entry.
    /// </summary>
    [HttpGet("fulfilment-providers/sync-logs/{id:guid}")]
    [ProducesResponseType<FulfilmentSyncLogDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSyncLog(Guid id, CancellationToken cancellationToken = default)
    {
        var log = await syncService.GetSyncLogByIdAsync(id, cancellationToken);

        if (log == null)
        {
            return NotFound();
        }

        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        var providerLookup = providers
            .Where(p => p.Configuration != null)
            .ToDictionary(p => p.Configuration!.Id, p => p.DisplayName);

        return Ok(MapToSyncLogDto(log, providerLookup));
    }

    /// <summary>
    /// Trigger a product sync for a provider.
    /// </summary>
    [HttpPost("fulfilment-providers/{id:guid}/sync/products")]
    [ProducesResponseType<FulfilmentSyncLogDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TriggerProductSync(Guid id, CancellationToken cancellationToken = default)
    {
        var provider = await providerManager.GetConfiguredProviderAsync(id, cancellationToken);

        if (provider?.Configuration == null)
        {
            return NotFound("Provider configuration not found.");
        }

        var log = await syncService.SyncProductsAsync(id, cancellationToken);

        var providerLookup = new Dictionary<Guid, string>
        {
            { id, provider.DisplayName }
        };

        return Ok(MapToSyncLogDto(log, providerLookup));
    }

    /// <summary>
    /// Trigger an inventory sync for a provider.
    /// </summary>
    [HttpPost("fulfilment-providers/{id:guid}/sync/inventory")]
    [ProducesResponseType<FulfilmentSyncLogDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TriggerInventorySync(Guid id, CancellationToken cancellationToken = default)
    {
        var provider = await providerManager.GetConfiguredProviderAsync(id, cancellationToken);

        if (provider?.Configuration == null)
        {
            return NotFound("Provider configuration not found.");
        }

        var log = await syncService.SyncInventoryAsync(id, cancellationToken);

        var providerLookup = new Dictionary<Guid, string>
        {
            { id, provider.DisplayName }
        };

        return Ok(MapToSyncLogDto(log, providerLookup));
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
            ApiStyleLabel = GetApiStyleLabel(meta.ApiStyle),
            IsEnabled = registered.IsEnabled,
            ConfigurationId = registered.Configuration?.Id
        };
    }

    private static FulfilmentProviderListItemDto MapToListItemDto(RegisteredFulfilmentProvider registered)
    {
        var meta = registered.Metadata;
        var syncMode = registered.Configuration?.InventorySyncMode ?? InventorySyncMode.Full;
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
            InventorySyncMode = syncMode,
            InventorySyncModeLabel = GetInventorySyncModeLabel(syncMode),
            ApiStyle = meta.ApiStyle,
            ApiStyleLabel = GetApiStyleLabel(meta.ApiStyle),
            SupportsOrderSubmission = meta.SupportsOrderSubmission,
            SupportsWebhooks = meta.SupportsWebhooks,
            SupportsProductSync = meta.SupportsProductSync,
            SupportsInventorySync = meta.SupportsInventorySync
        };
    }

    private static ProviderConfigurationFieldDto MapToFieldDto(ProviderConfigurationField field)
    {
        return new ProviderConfigurationFieldDto
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

    private static FulfilmentSyncLogDto MapToSyncLogDto(FulfilmentSyncLog log, Dictionary<Guid, string> providerLookup)
    {
        return new FulfilmentSyncLogDto
        {
            Id = log.Id,
            ProviderConfigurationId = log.ProviderConfigurationId,
            ProviderDisplayName = providerLookup.TryGetValue(log.ProviderConfigurationId, out var name) ? name : null,
            SyncType = log.SyncType,
            SyncTypeLabel = GetSyncTypeLabel(log.SyncType),
            Status = log.Status,
            StatusLabel = GetStatusLabel(log.Status),
            StatusCssClass = GetStatusCssClass(log.Status),
            ItemsProcessed = log.ItemsProcessed,
            ItemsSucceeded = log.ItemsSucceeded,
            ItemsFailed = log.ItemsFailed,
            ErrorMessage = log.ErrorMessage,
            StartedAt = log.StartedAt,
            CompletedAt = log.CompletedAt
        };
    }

    private static string GetSyncTypeLabel(FulfilmentSyncType syncType)
    {
        return syncType switch
        {
            FulfilmentSyncType.ProductsOut => "Products Out",
            FulfilmentSyncType.InventoryIn => "Inventory In",
            _ => "Unknown"
        };
    }

    private static string GetStatusLabel(FulfilmentSyncStatus status)
    {
        return status switch
        {
            FulfilmentSyncStatus.Pending => "Pending",
            FulfilmentSyncStatus.Running => "Running",
            FulfilmentSyncStatus.Completed => "Completed",
            FulfilmentSyncStatus.Failed => "Failed",
            _ => "Unknown"
        };
    }

    private static string GetStatusCssClass(FulfilmentSyncStatus status)
    {
        return status switch
        {
            FulfilmentSyncStatus.Pending => "status-pending",
            FulfilmentSyncStatus.Running => "status-running",
            FulfilmentSyncStatus.Completed => "status-completed",
            FulfilmentSyncStatus.Failed => "status-failed",
            _ => ""
        };
    }

    private static string GetApiStyleLabel(FulfilmentApiStyle apiStyle)
    {
        return apiStyle switch
        {
            FulfilmentApiStyle.Rest => "REST",
            FulfilmentApiStyle.GraphQL => "GraphQL",
            FulfilmentApiStyle.Sftp => "SFTP",
            _ => "Unknown"
        };
    }

    private static string GetInventorySyncModeLabel(InventorySyncMode mode)
    {
        return mode switch
        {
            InventorySyncMode.Full => "Full",
            InventorySyncMode.Delta => "Delta",
            _ => "Unknown"
        };
    }
}
