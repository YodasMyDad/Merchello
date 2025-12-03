using System.Text.Json;
using Asp.Versioning;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Shared.Extensions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for managing payment providers in the backoffice
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class PaymentProvidersApiController : MerchelloApiControllerBase
{
    private readonly IPaymentProviderManager _providerManager;

    public PaymentProvidersApiController(IPaymentProviderManager providerManager)
    {
        _providerManager = providerManager;
    }

    /// <summary>
    /// Get all available payment providers discovered from assemblies
    /// </summary>
    [HttpGet("payment-providers/available")]
    [ProducesResponseType<List<PaymentProviderDto>>(StatusCodes.Status200OK)]
    public async Task<List<PaymentProviderDto>> GetAvailableProviders(CancellationToken cancellationToken = default)
    {
        var providers = await _providerManager.GetAvailableProvidersAsync(cancellationToken);
        return providers.Select(MapToProviderDto).ToList();
    }

    /// <summary>
    /// Get all configured payment provider settings
    /// </summary>
    [HttpGet("payment-providers")]
    [ProducesResponseType<List<PaymentProviderSettingDto>>(StatusCodes.Status200OK)]
    public async Task<List<PaymentProviderSettingDto>> GetProviderSettings(CancellationToken cancellationToken = default)
    {
        var settings = await _providerManager.GetProviderSettingsAsync(cancellationToken);
        var providers = await _providerManager.GetAvailableProvidersAsync(cancellationToken);

        var result = new List<PaymentProviderSettingDto>();
        foreach (var setting in settings.OrderBy(s => s.SortOrder))
        {
            var provider = providers.FirstOrDefault(p => p.Metadata.Alias == setting.ProviderAlias);
            result.Add(MapToSettingDto(setting, provider));
        }

        return result;
    }

    /// <summary>
    /// Get a specific payment provider setting by ID
    /// </summary>
    [HttpGet("payment-providers/{id:guid}")]
    [ProducesResponseType<PaymentProviderSettingDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProviderSetting(Guid id, CancellationToken cancellationToken = default)
    {
        var setting = await _providerManager.GetProviderSettingAsync(id, cancellationToken);
        if (setting == null)
        {
            return NotFound();
        }

        var provider = await _providerManager.GetProviderAsync(setting.ProviderAlias, requireEnabled: false, cancellationToken);
        return Ok(MapToSettingDto(setting, provider));
    }

    /// <summary>
    /// Get configuration fields for a payment provider
    /// </summary>
    [HttpGet("payment-providers/{alias}/fields")]
    [ProducesResponseType<List<PaymentProviderFieldDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProviderFields(string alias, CancellationToken cancellationToken = default)
    {
        var provider = await _providerManager.GetProviderAsync(alias, requireEnabled: false, cancellationToken);
        if (provider == null)
        {
            return NotFound($"Provider '{alias}' not found.");
        }

        var fields = await provider.Provider.GetConfigurationFieldsAsync(cancellationToken);
        var result = fields.Select(MapToFieldDto).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Create a new payment provider setting (enable a provider)
    /// </summary>
    [HttpPost("payment-providers")]
    [ProducesResponseType<PaymentProviderSettingDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateProviderSetting(
        [FromBody] CreatePaymentProviderSettingDto request,
        CancellationToken cancellationToken = default)
    {
        // Verify provider exists
        var provider = await _providerManager.GetProviderAsync(request.ProviderAlias, requireEnabled: false, cancellationToken);
        if (provider == null)
        {
            return NotFound($"Provider '{request.ProviderAlias}' not found.");
        }

        // Check if already configured
        var existingSettings = await _providerManager.GetProviderSettingsAsync(cancellationToken);
        if (existingSettings.Any(s => s.ProviderAlias == request.ProviderAlias))
        {
            return BadRequest($"Provider '{request.ProviderAlias}' is already configured.");
        }

        // Get max sort order
        var maxSortOrder = existingSettings.Any() ? existingSettings.Max(s => s.SortOrder) : 0;

        var setting = new PaymentProviderSetting
        {
            ProviderAlias = request.ProviderAlias,
            DisplayName = request.DisplayName ?? provider.Metadata.DisplayName,
            IsEnabled = request.IsEnabled,
            IsTestMode = request.IsTestMode,
            Configuration = request.Configuration != null ? JsonSerializer.Serialize(request.Configuration) : null,
            SortOrder = maxSortOrder + 1
        };

        var result = await _providerManager.SaveProviderSettingAsync(setting, cancellationToken);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to create provider setting.");
        }

        return Ok(MapToSettingDto(result.ResultObject!, provider));
    }

    /// <summary>
    /// Update a payment provider setting
    /// </summary>
    [HttpPut("payment-providers/{id:guid}")]
    [ProducesResponseType<PaymentProviderSettingDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProviderSetting(
        Guid id,
        [FromBody] UpdatePaymentProviderSettingDto request,
        CancellationToken cancellationToken = default)
    {
        var setting = await _providerManager.GetProviderSettingAsync(id, cancellationToken);
        if (setting == null)
        {
            return NotFound();
        }

        if (request.DisplayName != null)
        {
            setting.DisplayName = request.DisplayName;
        }

        if (request.IsEnabled.HasValue)
        {
            setting.IsEnabled = request.IsEnabled.Value;
        }

        if (request.IsTestMode.HasValue)
        {
            setting.IsTestMode = request.IsTestMode.Value;
        }

        if (request.Configuration != null)
        {
            setting.Configuration = JsonSerializer.Serialize(request.Configuration);
        }

        setting.DateUpdated = DateTime.UtcNow;

        var result = await _providerManager.SaveProviderSettingAsync(setting, cancellationToken);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to update provider setting.");
        }

        var provider = await _providerManager.GetProviderAsync(setting.ProviderAlias, requireEnabled: false, cancellationToken);
        return Ok(MapToSettingDto(result.ResultObject!, provider));
    }

    /// <summary>
    /// Delete a payment provider setting
    /// </summary>
    [HttpDelete("payment-providers/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteProviderSetting(Guid id, CancellationToken cancellationToken = default)
    {
        var result = await _providerManager.DeleteProviderSettingAsync(id, cancellationToken);
        if (!result.Successful)
        {
            return NotFound();
        }

        return NoContent();
    }

    /// <summary>
    /// Toggle payment provider enabled status
    /// </summary>
    [HttpPut("payment-providers/{id:guid}/toggle")]
    [ProducesResponseType<PaymentProviderSettingDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleProvider(
        Guid id,
        [FromBody] TogglePaymentProviderDto request,
        CancellationToken cancellationToken = default)
    {
        var result = await _providerManager.SetProviderEnabledAsync(id, request.IsEnabled, cancellationToken);
        if (!result.Successful)
        {
            return NotFound();
        }

        var setting = await _providerManager.GetProviderSettingAsync(id, cancellationToken);
        var provider = await _providerManager.GetProviderAsync(setting!.ProviderAlias, requireEnabled: false, cancellationToken);
        return Ok(MapToSettingDto(setting, provider));
    }

    /// <summary>
    /// Reorder payment providers
    /// </summary>
    [HttpPut("payment-providers/reorder")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ReorderProviders(
        [FromBody] ReorderPaymentProvidersDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.OrderedIds == null || request.OrderedIds.Count == 0)
        {
            return BadRequest("OrderedIds is required.");
        }

        var result = await _providerManager.UpdateProviderSortOrderAsync(request.OrderedIds, cancellationToken);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to reorder providers.");
        }

        return Ok();
    }

    // ============================================
    // Mapping Helpers
    // ============================================

    private static PaymentProviderDto MapToProviderDto(RegisteredPaymentProvider registered)
    {
        var meta = registered.Metadata;
        return new PaymentProviderDto
        {
            Alias = meta.Alias,
            DisplayName = registered.DisplayName,
            Icon = meta.Icon,
            Description = meta.Description,
            SupportsRefunds = meta.SupportsRefunds,
            SupportsPartialRefunds = meta.SupportsPartialRefunds,
            IntegrationType = meta.IntegrationType,
            SupportsAuthAndCapture = meta.SupportsAuthAndCapture,
            RequiresWebhook = meta.RequiresWebhook,
            WebhookPath = meta.WebhookPath,
            IsEnabled = registered.IsEnabled,
            SettingId = registered.Setting?.Id,
            SetupInstructions = meta.SetupInstructions
        };
    }

    private static PaymentProviderSettingDto MapToSettingDto(PaymentProviderSetting setting, RegisteredPaymentProvider? provider)
    {
        Dictionary<string, string>? config = null;
        if (!string.IsNullOrEmpty(setting.Configuration))
        {
            try
            {
                config = JsonSerializer.Deserialize<Dictionary<string, string>>(setting.Configuration);
            }
            catch
            {
                // Ignore deserialization errors
            }
        }

        return new PaymentProviderSettingDto
        {
            Id = setting.Id,
            ProviderAlias = setting.ProviderAlias,
            DisplayName = setting.DisplayName,
            IsEnabled = setting.IsEnabled,
            IsTestMode = setting.IsTestMode,
            Configuration = config,
            SortOrder = setting.SortOrder,
            DateCreated = setting.DateCreated,
            DateUpdated = setting.DateUpdated,
            Provider = provider != null ? MapToProviderDto(provider) : null
        };
    }

    private static PaymentProviderFieldDto MapToFieldDto(PaymentProviderConfigurationField field)
    {
        return new PaymentProviderFieldDto
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

