using System.Text.Json;
using System.Text;
using Asp.Versioning;
using Merchello.Core.Fulfilment.Dtos;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Fulfilment.Services.Parameters;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shared.Extensions;
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
    IFulfilmentService fulfilmentService,
    IFulfilmentSyncService syncService) : MerchelloApiControllerBase
{
    private const string SensitiveMask = "********";

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
    [ProducesResponseType<FulfilmentProviderConfigurationDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProviderConfiguration(Guid id, CancellationToken cancellationToken = default)
    {
        var provider = await providerManager.GetConfiguredProviderAsync(id, cancellationToken);

        if (provider?.Configuration == null)
        {
            return NotFound();
        }

        return Ok(await MapToConfigurationDtoAsync(provider, cancellationToken));
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
        var configuredProviders = allProviders.Where(p => p.Configuration != null).ToList();

        var configuration = new FulfilmentProviderConfiguration
        {
            ProviderKey = request.ProviderKey,
            DisplayName = request.DisplayName ?? provider.Metadata.DisplayName,
            IsEnabled = request.IsEnabled,
            InventorySyncMode = request.InventorySyncMode,
            SettingsJson = request.Configuration != null ? JsonSerializer.Serialize(request.Configuration) : null,
            SortOrder = configuredProviders.GetNextSortOrder(p => p.Configuration!.SortOrder)
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
            // Retain sensitive field values when masked/empty on update
            if (!string.IsNullOrEmpty(configuration.SettingsJson))
            {
                try
                {
                    var existingConfig = ParseSettingsAsStrings(configuration.SettingsJson);
                    var fields = await provider.Provider.GetConfigurationFieldsAsync(cancellationToken);
                    var sensitiveKeys = fields.Where(f => f.IsSensitive).Select(f => f.Key).ToHashSet();

                    if (existingConfig != null)
                    {
                        foreach (var key in sensitiveKeys)
                        {
                            var newValue = request.Configuration.GetValueOrDefault(key);
                            var isMaskedOrEmpty = string.IsNullOrEmpty(newValue) || IsMaskedValue(newValue);
                            if (isMaskedOrEmpty && existingConfig.TryGetValue(key, out var existingValue))
                            {
                                request.Configuration[key] = existingValue;
                            }
                        }
                    }
                }
                catch
                {
                    // Ignore deserialization errors - proceed with raw update
                }
            }

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
    [HttpPost("fulfilment-providers/{id:guid}/test/connection")]
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
    /// Submits a test order payload directly to the configured provider.
    /// </summary>
    [HttpPost("fulfilment-providers/{id:guid}/test/order")]
    [ProducesResponseType<TestFulfilmentOrderSubmissionResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TestOrderSubmission(
        Guid id,
        [FromBody] TestFulfilmentOrderSubmissionDto request,
        CancellationToken cancellationToken = default)
    {
        var provider = await providerManager.GetConfiguredProviderAsync(id, cancellationToken);
        if (provider?.Configuration == null)
        {
            return NotFound("Provider configuration not found.");
        }

        if (!provider.Metadata.SupportsOrderSubmission)
        {
            return Ok(new TestFulfilmentOrderSubmissionResultDto
            {
                Success = false,
                ErrorMessage = $"Provider '{provider.Metadata.Key}' does not support order submission."
            });
        }

        var lineItems = request.LineItems?.Count > 0
            ? request.LineItems
            : [new TestFulfilmentLineItemDto { Sku = "TEST-SKU-001", Name = "Test Product", Quantity = 1, UnitPrice = 10m }];

        var shippingAddress = request.ShippingAddress ?? new TestFulfilmentAddressDto
        {
            Name = "Test Customer",
            AddressOne = "123 Test Street",
            TownCity = "Test City",
            CountyState = "CA",
            PostalCode = "90210",
            CountryCode = "US"
        };

        var fulfilmentRequest = new FulfilmentOrderRequest
        {
            OrderId = Guid.NewGuid(),
            OrderNumber = string.IsNullOrWhiteSpace(request.OrderNumber)
                ? $"TEST-{DateTime.UtcNow:yyyyMMddHHmmss}"
                : request.OrderNumber,
            CustomerEmail = string.IsNullOrWhiteSpace(request.CustomerEmail)
                ? "test@example.com"
                : request.CustomerEmail,
            ShippingAddress = new FulfilmentAddress
            {
                Name = shippingAddress.Name ?? "Test Customer",
                Company = shippingAddress.Company,
                AddressOne = shippingAddress.AddressOne ?? "123 Test Street",
                AddressTwo = shippingAddress.AddressTwo,
                TownCity = shippingAddress.TownCity ?? "Test City",
                CountyState = shippingAddress.CountyState ?? "CA",
                PostalCode = shippingAddress.PostalCode ?? "90210",
                CountryCode = shippingAddress.CountryCode ?? "US",
                Phone = shippingAddress.Phone
            },
            LineItems = lineItems
                .Where(x => !string.IsNullOrWhiteSpace(x.Sku))
                .Select(x => new FulfilmentLineItem
                {
                    LineItemId = Guid.NewGuid(),
                    Sku = x.Sku!,
                    Name = x.Name ?? x.Sku!,
                    Quantity = Math.Max(1, x.Quantity),
                    UnitPrice = x.UnitPrice
                })
                .ToList(),
            ExtendedData = new Dictionary<string, object>
            {
                ["IsTestOrder"] = true,
                ["UseRealSandbox"] = request.UseRealSandbox
            }
        };

        var submitResult = await provider.Provider.SubmitOrderAsync(fulfilmentRequest, cancellationToken);
        return Ok(new TestFulfilmentOrderSubmissionResultDto
        {
            Success = submitResult.Success,
            ProviderReference = submitResult.ProviderReference,
            ProviderStatus = submitResult.ExtendedData.GetValueOrDefault("ProviderStatus")?.ToString(),
            ErrorMessage = submitResult.ErrorMessage
        });
    }

    /// <summary>
    /// Gets webhook event templates supported by a fulfilment provider for simulation.
    /// </summary>
    [HttpGet("fulfilment-providers/{id:guid}/test/webhook-events")]
    [ProducesResponseType<List<FulfilmentWebhookEventTemplateDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetWebhookEventTemplates(Guid id, CancellationToken cancellationToken = default)
    {
        var provider = await providerManager.GetConfiguredProviderAsync(id, cancellationToken);
        if (provider?.Configuration == null)
        {
            return NotFound("Provider configuration not found.");
        }

        var templates = await provider.Provider.GetWebhookEventTemplatesAsync(cancellationToken);
        var result = templates.Select(x => new FulfilmentWebhookEventTemplateDto
        {
            EventType = x.EventType,
            DisplayName = x.DisplayName,
            Description = x.Description
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Simulates provider webhook parsing and applies resulting updates through fulfilment services.
    /// </summary>
    [HttpPost("fulfilment-providers/{id:guid}/test/simulate-webhook")]
    [ProducesResponseType<FulfilmentWebhookSimulationResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SimulateWebhook(
        Guid id,
        [FromBody] SimulateFulfilmentWebhookDto request,
        CancellationToken cancellationToken = default)
    {
        var provider = await providerManager.GetConfiguredProviderAsync(id, cancellationToken);
        if (provider?.Configuration == null)
        {
            return NotFound("Provider configuration not found.");
        }

        var simulationResult = new FulfilmentWebhookSimulationResultDto();

        try
        {
            var payloadRequest = new GenerateFulfilmentWebhookPayloadRequest
            {
                EventType = request.EventType,
                ProviderReference = request.ProviderReference,
                ProviderShipmentId = request.ProviderShipmentId,
                TrackingNumber = request.TrackingNumber,
                Carrier = request.Carrier,
                ShippedDate = request.ShippedDate,
                CustomPayload = request.CustomPayload
            };

            var (payload, headers) = await provider.Provider.GenerateTestWebhookPayloadAsync(payloadRequest, cancellationToken);
            simulationResult.Payload = payload;

            var webhookRequest = BuildWebhookRequest(payload, headers);
            var webhookResult = await provider.Provider.ProcessWebhookAsync(webhookRequest, cancellationToken);

            simulationResult.Success = webhookResult.Success;
            simulationResult.EventTypeDetected = webhookResult.EventType;

            if (!webhookResult.Success)
            {
                simulationResult.ErrorMessage = webhookResult.ErrorMessage;
                return Ok(simulationResult);
            }

            simulationResult.ActionsPerformed.Add($"Parsed event '{webhookResult.EventType}'.");

            foreach (var statusUpdate in webhookResult.StatusUpdates)
            {
                var updateResult = await fulfilmentService.ProcessStatusUpdateAsync(statusUpdate, cancellationToken);
                if (updateResult.Success)
                {
                    simulationResult.ActionsPerformed.Add(
                        $"Updated order '{statusUpdate.ProviderReference}' status to {statusUpdate.MappedStatus}.");
                }
                else
                {
                    var message = updateResult.Messages.FirstOrDefault()?.Message ?? "Unknown error";
                    simulationResult.ActionsPerformed.Add(
                        $"Failed status update for '{statusUpdate.ProviderReference}': {message}");
                }
            }

            foreach (var shipmentUpdate in webhookResult.ShipmentUpdates)
            {
                var shipmentResult = await fulfilmentService.ProcessShipmentUpdateAsync(shipmentUpdate, cancellationToken);
                if (shipmentResult.Success)
                {
                    simulationResult.ActionsPerformed.Add(
                        $"Processed shipment '{shipmentUpdate.ProviderShipmentId}' for order '{shipmentUpdate.ProviderReference}'.");
                }
                else
                {
                    var message = shipmentResult.Messages.FirstOrDefault()?.Message ?? "Unknown error";
                    simulationResult.ActionsPerformed.Add(
                        $"Failed shipment update for '{shipmentUpdate.ProviderReference}': {message}");
                }
            }
        }
        catch (Exception ex)
        {
            simulationResult.Success = false;
            simulationResult.ErrorMessage = ex.Message;
        }

        return Ok(simulationResult);
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
    [HttpPost("fulfilment-providers/{id:guid}/test/product-sync")]
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
    [HttpPost("fulfilment-providers/{id:guid}/test/inventory-sync")]
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

    private async Task<FulfilmentProviderConfigurationDto> MapToConfigurationDtoAsync(
        RegisteredFulfilmentProvider registered,
        CancellationToken cancellationToken)
    {
        var configuration = registered.Configuration!;

        Dictionary<string, string>? config = null;
        if (!string.IsNullOrEmpty(configuration.SettingsJson))
        {
            config = ParseSettingsAsStrings(configuration.SettingsJson);

            // Mask sensitive field values
            if (config != null)
            {
                var fields = await registered.Provider.GetConfigurationFieldsAsync(cancellationToken);
                var sensitiveKeys = fields.Where(f => f.IsSensitive).Select(f => f.Key).ToHashSet();

                foreach (var key in config.Keys.Where(k => sensitiveKeys.Contains(k)).ToList())
                {
                    if (!string.IsNullOrEmpty(config[key]))
                    {
                        config[key] = SensitiveMask;
                    }
                }
            }
        }

        return new FulfilmentProviderConfigurationDto
        {
            Id = configuration.Id,
            ProviderKey = configuration.ProviderKey,
            DisplayName = configuration.DisplayName ?? registered.Metadata.DisplayName,
            IsEnabled = configuration.IsEnabled,
            InventorySyncMode = configuration.InventorySyncMode,
            Configuration = config,
            SortOrder = configuration.SortOrder,
            DateCreated = configuration.CreateDate,
            DateUpdated = configuration.UpdateDate,
            Provider = MapToProviderDto(registered)
        };
    }

    private static FulfilmentProviderDto MapToProviderDto(RegisteredFulfilmentProvider registered)
    {
        var meta = registered.Metadata;
        var iconSvg = meta.IconSvg ?? ProviderBrandLogoCatalog.GetFulfilmentProviderIconSvg(meta.Key);
        return new FulfilmentProviderDto
        {
            Key = meta.Key,
            DisplayName = registered.DisplayName,
            Icon = meta.Icon,
            IconSvg = iconSvg,
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
        var iconSvg = meta.IconSvg ?? ProviderBrandLogoCatalog.GetFulfilmentProviderIconSvg(meta.Key);
        return new FulfilmentProviderListItemDto
        {
            Key = meta.Key,
            DisplayName = registered.DisplayName,
            Icon = meta.Icon,
            IconSvg = iconSvg,
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
            Options = field.Options?.Select(o => new SelectOption
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
    private static bool IsMaskedValue(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        if (value == SensitiveMask)
        {
            return true;
        }

        // Backward compatibility for historic bullet masks.
        var bulletMask = new string('\u2022', 8);
        var mojibakeBulletMask = string.Concat(Enumerable.Repeat("\u00E2\u20AC\u00A2", 8));
        return value == bulletMask || value == mojibakeBulletMask;
    }

    private static Dictionary<string, string>? ParseSettingsAsStrings(string? settingsJson)
    {
        if (string.IsNullOrWhiteSpace(settingsJson))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(settingsJson);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            Dictionary<string, string> parsed = [];
            foreach (var property in document.RootElement.EnumerateObject())
            {
                parsed[property.Name] = property.Value.ValueKind switch
                {
                    JsonValueKind.String => property.Value.GetString() ?? string.Empty,
                    JsonValueKind.Number => property.Value.GetRawText(),
                    JsonValueKind.True => "true",
                    JsonValueKind.False => "false",
                    JsonValueKind.Null or JsonValueKind.Undefined => string.Empty,
                    _ => property.Value.GetRawText()
                };
            }

            return parsed;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static HttpRequest BuildWebhookRequest(string payload, IDictionary<string, string> headers)
    {
        var context = new DefaultHttpContext();
        var bytes = Encoding.UTF8.GetBytes(payload);
        context.Request.Body = new MemoryStream(bytes);
        context.Request.ContentLength = bytes.Length;
        context.Request.ContentType = "application/json";
        context.Request.Method = HttpMethods.Post;

        foreach (var header in headers)
        {
            context.Request.Headers[header.Key] = header.Value;
        }

        if (!context.Request.Headers.ContainsKey("x-webhook-topic") &&
            headers.TryGetValue("x-webhook-topic", out var topicHeader))
        {
            context.Request.Headers["x-webhook-topic"] = topicHeader;
        }

        return context.Request;
    }
}

