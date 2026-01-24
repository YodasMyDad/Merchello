using System.Text.Json;
using Asp.Versioning;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shared.Providers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Media;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Services;

namespace Merchello.Controllers;

/// <summary>
/// API controller for managing payment providers in the backoffice
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class PaymentProvidersApiController(
    IPaymentProviderManager providerManager,
    IOptions<MerchelloSettings> merchelloSettings,
    IMediaService mediaService,
    MediaUrlGeneratorCollection mediaUrlGenerators) : MerchelloApiControllerBase
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
    [ProducesResponseType<List<ProviderConfigurationFieldDto>>(StatusCodes.Status200OK)]
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

        // 3. Build test payment request with a generated test ID (not Guid.Empty)
        var testInvoiceId = Guid.NewGuid();

        // Build return/cancel URLs that point back to the backoffice
        var httpRequest = HttpContext.Request;
        var baseUrl = $"{httpRequest.Scheme}://{httpRequest.Host}";
        var returnUrl = $"{baseUrl}/umbraco#/merchello/payment-providers?test-return=true&sessionId={testInvoiceId}";
        var cancelUrl = $"{baseUrl}/umbraco#/merchello/payment-providers?test-cancel=true&sessionId={testInvoiceId}";

        var paymentRequest = new PaymentRequest
        {
            InvoiceId = testInvoiceId,
            Amount = request.Amount,
            Currency = request.CurrencyCode ?? _settings.StoreCurrencyCode,
            ReturnUrl = returnUrl,
            CancelUrl = cancelUrl,
            Description = "Test payment session",
            IsTestMode = true
        };

        // 4. Create response
        var response = new TestPaymentProviderResultDto
        {
            ProviderAlias = setting.ProviderAlias,
            ProviderName = setting.DisplayName,
            TestInvoiceId = testInvoiceId,
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
            response.AdapterUrl = sessionResult.AdapterUrl;
            response.SdkConfiguration = sessionResult.SdkConfiguration;
            response.MethodAlias = sessionResult.MethodAlias;
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
    /// Process a test payment (for hosted fields/widget integration types).
    /// </summary>
    [HttpPost("payment-providers/{id:guid}/test/process-payment")]
    [ProducesResponseType<PaymentResult>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ProcessTestPayment(
        Guid id,
        [FromBody] ProcessTestPaymentDto request,
        CancellationToken cancellationToken = default)
    {
        var setting = await providerManager.GetProviderSettingAsync(id, cancellationToken);
        if (setting == null)
        {
            return NotFound("Provider setting not found.");
        }

        var provider = await providerManager.GetProviderAsync(setting.ProviderAlias, requireEnabled: false, cancellationToken);
        if (provider == null)
        {
            return NotFound("Provider not found.");
        }

        try
        {
            var processRequest = new ProcessPaymentRequest
            {
                InvoiceId = request.TestInvoiceId ?? Guid.NewGuid(),
                ProviderAlias = setting.ProviderAlias,
                MethodAlias = request.MethodAlias,
                SessionId = request.SessionId,
                PaymentMethodToken = request.PaymentMethodToken,
                FormData = request.FormData,
                Amount = request.Amount,
                IsTestMode = true // Skip features requiring production configuration
            };

            var result = await provider.Provider.ProcessPaymentAsync(processRequest, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return Ok(PaymentResult.Failed(ex.Message));
        }
    }

    /// <summary>
    /// Get express checkout client configuration for testing.
    /// </summary>
    [HttpGet("payment-providers/{id:guid}/test/express-config")]
    [ProducesResponseType<ExpressCheckoutClientConfig>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTestExpressConfig(
        Guid id,
        [FromQuery] string methodAlias,
        [FromQuery] decimal amount = 100m,
        CancellationToken cancellationToken = default)
    {
        var setting = await providerManager.GetProviderSettingAsync(id, cancellationToken);
        if (setting == null)
        {
            return NotFound("Provider setting not found.");
        }

        var provider = await providerManager.GetProviderAsync(setting.ProviderAlias, requireEnabled: false, cancellationToken);
        if (provider == null)
        {
            return NotFound("Provider not found.");
        }

        var config = await provider.Provider.GetExpressCheckoutClientConfigAsync(
            methodAlias,
            amount,
            _settings.StoreCurrencyCode,
            cancellationToken);

        if (config == null)
        {
            return NotFound("Express checkout not supported for this method.");
        }

        return Ok(config);
    }

    /// <summary>
    /// Get available webhook event templates for simulation.
    /// </summary>
    [HttpGet("payment-providers/{id:guid}/test/webhook-events")]
    [ProducesResponseType<List<WebhookEventTemplateDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetWebhookEventTemplates(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var setting = await providerManager.GetProviderSettingAsync(id, cancellationToken);
        if (setting == null)
        {
            return NotFound("Provider setting not found.");
        }

        var provider = await providerManager.GetProviderAsync(setting.ProviderAlias, requireEnabled: false, cancellationToken);
        if (provider == null)
        {
            return NotFound("Provider not found.");
        }

        var templates = await provider.Provider.GetWebhookEventTemplatesAsync(cancellationToken);
        var result = templates.Select(t => new WebhookEventTemplateDto
        {
            EventType = t.EventType,
            DisplayName = t.DisplayName,
            Description = t.Description,
            Category = t.Category.ToString().ToLowerInvariant()
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Simulate a webhook event for testing.
    /// Supports both template-based simulation (if provider implements templates)
    /// and manual payload testing (works for any provider).
    /// </summary>
    [HttpPost("payment-providers/{id:guid}/test/simulate-webhook")]
    [ProducesResponseType<WebhookSimulationResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SimulateWebhook(
        Guid id,
        [FromBody] SimulateWebhookDto request,
        CancellationToken cancellationToken = default)
    {
        var setting = await providerManager.GetProviderSettingAsync(id, cancellationToken);
        if (setting == null)
        {
            return NotFound("Provider setting not found.");
        }

        var provider = await providerManager.GetProviderAsync(setting.ProviderAlias, requireEnabled: false, cancellationToken);
        if (provider == null)
        {
            return NotFound("Provider not found.");
        }

        var response = new WebhookSimulationResultDto();

        try
        {
            string payload;
            IDictionary<string, string> headers;

            // Use custom payload if provided, otherwise generate from template
            if (!string.IsNullOrEmpty(request.CustomPayload))
            {
                payload = request.CustomPayload;
                headers = new Dictionary<string, string>();
                response.ValidationSkipped = true; // Custom payloads won't have valid signatures
            }
            else
            {
                // Try to generate payload from provider template
                var parameters = new TestWebhookParameters
                {
                    EventType = request.EventType,
                    TransactionId = request.TransactionId ?? $"test_{Guid.NewGuid():N}",
                    InvoiceId = request.InvoiceId ?? Guid.NewGuid(),
                    Amount = request.Amount,
                    Currency = _settings.StoreCurrencyCode
                };

                (payload, headers) = await provider.Provider.GenerateTestWebhookPayloadAsync(parameters, cancellationToken);

                // If provider returned empty payload, it doesn't support template generation
                if (string.IsNullOrEmpty(payload) || payload == "{}")
                {
                    return Ok(new WebhookSimulationResultDto
                    {
                        Success = false,
                        ErrorMessage = "This provider does not support webhook template generation. Please provide a custom payload."
                    });
                }
            }

            response.Payload = payload;

            // Process the webhook (skip validation for test mode)
            // Add a special header to signal providers should skip signature validation
            response.ValidationSkipped = true;
            headers["X-Merchello-Skip-Validation"] = "true";
            var result = await provider.Provider.ProcessWebhookAsync(payload, headers, cancellationToken);

            response.Success = result.Success;
            response.EventTypeDetected = result.EventType?.ToString();
            response.TransactionId = result.TransactionId;
            response.InvoiceId = result.InvoiceId;
            response.Amount = result.Amount;
            response.ErrorMessage = result.ErrorMessage;

            if (result.Success && result.EventType.HasValue)
            {
                response.ActionsPerformed.Add($"Detected event: {result.EventType}");
                if (result.TransactionId != null)
                    response.ActionsPerformed.Add($"Transaction ID: {result.TransactionId}");
                if (result.Amount.HasValue)
                    response.ActionsPerformed.Add($"Amount: {result.Amount:C}");
            }
        }
        catch (Exception ex)
        {
            response.Success = false;
            response.ErrorMessage = ex.Message;
        }

        return Ok(response);
    }

    /// <summary>
    /// Test payment link generation for a provider.
    /// Creates a test invoice and generates a payment link.
    /// </summary>
    [HttpPost("payment-providers/{id:guid}/test/payment-link")]
    [ProducesResponseType<TestPaymentLinkResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TestPaymentLink(
        Guid id,
        [FromBody] TestPaymentLinkRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var setting = await providerManager.GetProviderSettingAsync(id, cancellationToken);
        if (setting == null)
        {
            return NotFound("Provider setting not found.");
        }

        var provider = await providerManager.GetProviderAsync(setting.ProviderAlias, requireEnabled: false, cancellationToken);
        if (provider == null)
        {
            return NotFound("Provider not found.");
        }

        if (!provider.Metadata.SupportsPaymentLinks)
        {
            return BadRequest("This provider does not support payment links.");
        }

        try
        {
            // Create a payment link request with test data
            var linkRequest = new PaymentLinkRequest
            {
                InvoiceId = Guid.NewGuid(), // Dummy invoice ID for testing
                Amount = request.Amount > 0 ? request.Amount : 100.00m,
                Currency = _settings.StoreCurrencyCode,
                CustomerEmail = "test@example.com",
                CustomerName = "Test Customer",
                Description = "Test Payment Link",
                Metadata = new Dictionary<string, string>
                {
                    ["test"] = "true",
                    ["source"] = "admin-test"
                }
            };

            var result = await provider.Provider.CreatePaymentLinkAsync(linkRequest, cancellationToken);

            return Ok(new TestPaymentLinkResultDto
            {
                Success = result.Success,
                PaymentUrl = result.PaymentUrl,
                ErrorMessage = result.ErrorMessage
            });
        }
        catch (Exception ex)
        {
            return Ok(new TestPaymentLinkResultDto
            {
                Success = false,
                ErrorMessage = ex.Message
            });
        }
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
        List<PaymentMethodSettingDto> result = [];
        foreach (var def in methodDefinitions)
        {
            var persisted = methodSettings.FirstOrDefault(ms =>
                string.Equals(ms.MethodAlias, def.Alias, StringComparison.OrdinalIgnoreCase));

            // Resolve icon media URL if a custom icon is set
            string? iconMediaUrl = null;
            if (persisted?.IconMediaKey.HasValue == true)
            {
                iconMediaUrl = ResolveMediaUrl(persisted.IconMediaKey.Value);
            }

            result.Add(new PaymentMethodSettingDto
            {
                MethodAlias = def.Alias,
                DisplayName = persisted?.DisplayNameOverride ?? def.DisplayName,
                DefaultDisplayName = def.DisplayName,
                DisplayNameOverride = persisted?.DisplayNameOverride,
                Icon = def.Icon,
                IconHtml = def.IconHtml,
                IconMediaKey = persisted?.IconMediaKey,
                IconMediaUrl = iconMediaUrl,
                CheckoutStyleOverride = persisted?.CheckoutStyleOverride != null
                    ? new PaymentMethodCheckoutStyleDto
                    {
                        BackgroundColor = persisted.CheckoutStyleOverride.BackgroundColor,
                        BorderColor = persisted.CheckoutStyleOverride.BorderColor,
                        TextColor = persisted.CheckoutStyleOverride.TextColor,
                        SelectedBackgroundColor = persisted.CheckoutStyleOverride.SelectedBackgroundColor,
                        SelectedBorderColor = persisted.CheckoutStyleOverride.SelectedBorderColor,
                        SelectedTextColor = persisted.CheckoutStyleOverride.SelectedTextColor
                    }
                    : null,
                Description = def.Description,
                IsEnabled = persisted?.IsEnabled ?? true, // Default enabled if no setting
                SortOrder = persisted?.SortOrder ?? def.DefaultSortOrder,
                IsExpressCheckout = def.IsExpressCheckout,
                MethodType = def.MethodType,
                SupportedRegions = def.SupportedRegions?.Select(r => new PaymentMethodRegionDto
                {
                    Code = r.Code,
                    Name = r.Name
                }).ToList()
            });
        }

        return Ok(result.OrderBy(m => m.SortOrder).ThenBy(m => m.DisplayName).ToList());
    }

    /// <summary>
    /// Update a payment method setting (enable/disable, display name, icon, style).
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
        var result = await providerManager.UpdateMethodSettingAsync(id, alias, request, cancellationToken);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to update method.");
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

    /// <summary>
    /// Resolves a media key to a URL.
    /// </summary>
    private string? ResolveMediaUrl(Guid mediaKey)
    {
        var media = mediaService.GetById(mediaKey);
        if (media == null)
        {
            return null;
        }

        if (mediaUrlGenerators.TryGetMediaPath(media.ContentType.Alias, media.GetValue<string>("umbracoFile"), out var mediaPath))
        {
            return mediaPath;
        }

        return null;
    }

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
            SupportsPaymentLinks = meta.SupportsPaymentLinks,
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
}

