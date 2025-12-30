using System.Text.Json;
using Asp.Versioning;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Dtos;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Merchello.Controllers;

/// <summary>
/// API controller for managing payment providers in the backoffice
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class PaymentProvidersApiController(
    IPaymentProviderManager providerManager,
    IOptions<MerchelloSettings> merchelloSettings) : MerchelloApiControllerBase
{
    private readonly MerchelloSettings _settings = merchelloSettings.Value;

    /// <summary>
    /// Get all available payment providers discovered from assemblies
    /// </summary>
    [HttpGet("payment-providers/available")]
    [ProducesResponseType<List<PaymentProviderDto>>(StatusCodes.Status200OK)]
    public async Task<List<PaymentProviderDto>> GetAvailableProviders(CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetAvailableProvidersAsync(cancellationToken);
        return providers.Select(MapToProviderDto).ToList();
    }

    /// <summary>
    /// Get all configured payment provider settings
    /// </summary>
    [HttpGet("payment-providers")]
    [ProducesResponseType<List<PaymentProviderSettingDto>>(StatusCodes.Status200OK)]
    public async Task<List<PaymentProviderSettingDto>> GetProviderSettings(CancellationToken cancellationToken = default)
    {
        var settings = await providerManager.GetProviderSettingsAsync(cancellationToken);
        var providers = await providerManager.GetAvailableProvidersAsync(cancellationToken);

        List<PaymentProviderSettingDto> result = [];
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
        var setting = await providerManager.GetProviderSettingAsync(id, cancellationToken);
        if (setting == null)
        {
            return NotFound();
        }

        var provider = await providerManager.GetProviderAsync(setting.ProviderAlias, requireEnabled: false, cancellationToken);
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
        var provider = await providerManager.GetProviderAsync(alias, requireEnabled: false, cancellationToken);
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
        [FromBody] CreatePaymentProviderDto request,
        CancellationToken cancellationToken = default)
    {
        // Verify provider exists
        var provider = await providerManager.GetProviderAsync(request.ProviderAlias, requireEnabled: false, cancellationToken);
        if (provider == null)
        {
            return NotFound($"Provider '{request.ProviderAlias}' not found.");
        }

        // Check if already configured
        var existingSettings = await providerManager.GetProviderSettingsAsync(cancellationToken);
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

        var result = await providerManager.SaveProviderSettingAsync(setting, cancellationToken);
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
        [FromBody] UpdatePaymentProviderDto request,
        CancellationToken cancellationToken = default)
    {
        var setting = await providerManager.GetProviderSettingAsync(id, cancellationToken);
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

        var result = await providerManager.SaveProviderSettingAsync(setting, cancellationToken);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to update provider setting.");
        }

        var provider = await providerManager.GetProviderAsync(setting.ProviderAlias, requireEnabled: false, cancellationToken);
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
        var result = await providerManager.DeleteProviderSettingAsync(id, cancellationToken);
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
        var result = await providerManager.SetProviderEnabledAsync(id, request.IsEnabled, cancellationToken);
        if (!result.Successful)
        {
            return NotFound();
        }

        var setting = await providerManager.GetProviderSettingAsync(id, cancellationToken);
        var provider = await providerManager.GetProviderAsync(setting!.ProviderAlias, requireEnabled: false, cancellationToken);
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

        var result = await providerManager.UpdateProviderSortOrderAsync(request.OrderedIds, cancellationToken);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to reorder providers.");
        }

        return Ok();
    }

    /// <summary>
    /// Test a payment provider configuration by creating a test payment session
    /// </summary>
    [HttpPost("payment-providers/{id:guid}/test")]
    [ProducesResponseType<TestPaymentProviderResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TestProvider(
        Guid id,
        [FromBody] TestPaymentProviderDto request,
        CancellationToken cancellationToken = default)
    {
        // 1. Get provider setting
        var setting = await providerManager.GetProviderSettingAsync(id, cancellationToken);
        if (setting == null)
        {
            return NotFound("Provider setting not found.");
        }

        // 2. Get provider instance
        var provider = await providerManager.GetProviderAsync(setting.ProviderAlias, requireEnabled: false, cancellationToken);
        if (provider == null)
        {
            return NotFound("Provider not found.");
        }

        // 3. Build test payment request
        var paymentRequest = new PaymentRequest
        {
            InvoiceId = Guid.Empty, // Test mode - no real invoice
            Amount = request.Amount,
            Currency = request.CurrencyCode ?? _settings.StoreCurrencyCode,
            ReturnUrl = "https://test.example.com/return",
            CancelUrl = "https://test.example.com/cancel",
            Description = "Test payment session"
        };

        // 4. Create response
        var response = new TestPaymentProviderResultDto
        {
            ProviderAlias = setting.ProviderAlias,
            ProviderName = setting.DisplayName,
            IntegrationType = PaymentIntegrationType.Redirect // Will be updated from session result
        };

        try
        {
            var sessionResult = await provider.Provider.CreatePaymentSessionAsync(paymentRequest, cancellationToken);

            response.IntegrationType = sessionResult.IntegrationType;
            response.IsSuccessful = sessionResult.Success;
            response.SessionId = sessionResult.SessionId;
            response.RedirectUrl = sessionResult.RedirectUrl;
            response.ClientToken = sessionResult.ClientToken;
            response.ClientSecret = sessionResult.ClientSecret;
            response.JavaScriptSdkUrl = sessionResult.JavaScriptSdkUrl;
            response.ErrorMessage = sessionResult.ErrorMessage;
            response.ErrorCode = sessionResult.ErrorCode;

            if (sessionResult.FormFields != null)
            {
                response.FormFields = sessionResult.FormFields.Select(f => new TestCheckoutFormFieldDto
                {
                    Key = f.Key,
                    Label = f.Label,
                    Description = f.Description,
                    FieldType = f.FieldType.ToString(),
                    IsRequired = f.IsRequired
                }).ToList();
            }
        }
        catch (Exception ex)
        {
            response.IsSuccessful = false;
            response.ErrorMessage = ex.Message;
        }

        return Ok(response);
    }

    /// <summary>
    /// Get a preview of payment methods as they will appear at checkout.
    /// Shows which methods are active vs hidden due to deduplication when
    /// multiple providers offer the same method type.
    /// </summary>
    [HttpGet("payment-providers/checkout-preview")]
    [ProducesResponseType<CheckoutPaymentPreviewDto>(StatusCodes.Status200OK)]
    public async Task<CheckoutPaymentPreviewDto> GetCheckoutPreview(CancellationToken cancellationToken = default)
    {
        return await providerManager.GetCheckoutPreviewAsync(cancellationToken);
    }

    // ============================================
    // Payment Method Settings Endpoints
    // ============================================

    /// <summary>
    /// Get all payment methods for a provider with their current settings.
    /// </summary>
    [HttpGet("payment-providers/{id:guid}/methods")]
    [ProducesResponseType<List<PaymentMethodSettingDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProviderMethods(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        // 1. Get provider setting
        var setting = await providerManager.GetProviderSettingAsync(id, cancellationToken);
        if (setting == null)
        {
            return NotFound("Provider setting not found.");
        }

        // 2. Get provider instance
        var provider = await providerManager.GetProviderAsync(setting.ProviderAlias, requireEnabled: false, cancellationToken);
        if (provider == null)
        {
            return NotFound("Provider not found.");
        }

        // 3. Get method definitions from provider
        var methodDefinitions = provider.Provider.GetAvailablePaymentMethods();

        // 4. Get persisted method settings
        var methodSettings = await providerManager.GetMethodSettingsAsync(id, cancellationToken);

        // 5. Map to DTOs, merging definition with settings
        var result = methodDefinitions.Select(def =>
        {
            var persisted = methodSettings.FirstOrDefault(ms =>
                string.Equals(ms.MethodAlias, def.Alias, StringComparison.OrdinalIgnoreCase));

            return new PaymentMethodSettingDto
            {
                MethodAlias = def.Alias,
                DisplayName = persisted?.DisplayNameOverride ?? def.DisplayName,
                DefaultDisplayName = def.DisplayName,
                Icon = def.Icon,
                IconHtml = def.IconHtml,
                Description = def.Description,
                IsEnabled = persisted?.IsEnabled ?? true, // Default enabled if no setting
                SortOrder = persisted?.SortOrder ?? def.DefaultSortOrder,
                IsExpressCheckout = def.IsExpressCheckout,
                MethodType = def.MethodType
            };
        })
        .OrderBy(m => m.SortOrder)
        .ThenBy(m => m.DisplayName)
        .ToList();

        return Ok(result);
    }

    /// <summary>
    /// Update a payment method setting (enable/disable).
    /// </summary>
    [HttpPut("payment-providers/{id:guid}/methods/{alias}")]
    [ProducesResponseType<List<PaymentMethodSettingDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateMethodSetting(
        Guid id,
        string alias,
        [FromBody] UpdatePaymentMethodSettingDto request,
        CancellationToken cancellationToken = default)
    {
        // Update enabled status if provided
        if (request.IsEnabled.HasValue)
        {
            var result = await providerManager.SetMethodEnabledAsync(id, alias, request.IsEnabled.Value, cancellationToken);
            if (!result.Successful)
            {
                return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to update method.");
            }
        }

        // Return the updated method settings list
        return await GetProviderMethods(id, cancellationToken);
    }

    /// <summary>
    /// Reorder payment methods for a provider.
    /// </summary>
    [HttpPut("payment-providers/{id:guid}/methods/reorder")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ReorderMethods(
        Guid id,
        [FromBody] List<string> orderedMethodAliases,
        CancellationToken cancellationToken = default)
    {
        if (orderedMethodAliases == null || orderedMethodAliases.Count == 0)
        {
            return BadRequest("orderedMethodAliases is required.");
        }

        var result = await providerManager.UpdateMethodSortOrderAsync(id, orderedMethodAliases, cancellationToken);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to reorder methods.");
        }

        return Ok();
    }

    // ============================================
    // Mapping Helpers
    // ============================================

    private static PaymentProviderDto MapToProviderDto(RegisteredPaymentProvider registered)
    {
        var meta = registered.Metadata;
        // Get integration type from first payment method (providers can support multiple methods with different types)
        var firstMethod = registered.Provider.GetAvailablePaymentMethods().FirstOrDefault();
        return new PaymentProviderDto
        {
            Alias = meta.Alias,
            DisplayName = registered.DisplayName,
            Icon = meta.Icon,
            IconHtml = meta.IconHtml,
            Description = meta.Description,
            SupportsRefunds = meta.SupportsRefunds,
            SupportsPartialRefunds = meta.SupportsPartialRefunds,
            IntegrationType = firstMethod?.IntegrationType ?? PaymentIntegrationType.Redirect,
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

