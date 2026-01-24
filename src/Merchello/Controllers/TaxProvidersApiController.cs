using System.Text.Json;
using Asp.Versioning;
using Merchello.Core.Tax.Dtos;
using Merchello.Core.Tax.Providers;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shared.Providers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for managing tax providers in the backoffice
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class TaxProvidersApiController(
    ITaxProviderManager providerManager) : MerchelloApiControllerBase
{
    /// <summary>
    /// Get all available tax providers
    /// </summary>
    [HttpGet("tax-providers")]
    [ProducesResponseType<List<TaxProviderDto>>(StatusCodes.Status200OK)]
    public async Task<List<TaxProviderDto>> GetProviders(CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        return providers.Select(MapToProviderDto).ToList();
    }

    /// <summary>
    /// Get the currently active tax provider
    /// </summary>
    [HttpGet("tax-providers/active")]
    [ProducesResponseType<TaxProviderDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetActiveProvider(CancellationToken cancellationToken = default)
    {
        var provider = await providerManager.GetActiveProviderAsync(cancellationToken);
        if (provider == null)
        {
            return NotFound("No active tax provider found.");
        }

        return Ok(MapToProviderDto(provider));
    }

    /// <summary>
    /// Get configuration fields for a tax provider
    /// </summary>
    [HttpGet("tax-providers/{alias}/fields")]
    [ProducesResponseType<List<ProviderConfigurationFieldDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProviderFields(string alias, CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        var provider = providers.FirstOrDefault(p =>
            string.Equals(p.Metadata.Alias, alias, StringComparison.OrdinalIgnoreCase));

        if (provider == null)
        {
            return NotFound($"Provider '{alias}' not found.");
        }

        var fields = await provider.Provider.GetConfigurationFieldsAsync(cancellationToken);
        var result = fields.Select(MapToFieldDto).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Activate a tax provider (only one can be active at a time)
    /// </summary>
    [HttpPut("tax-providers/{alias}/activate")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ActivateProvider(string alias, CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        var provider = providers.FirstOrDefault(p =>
            string.Equals(p.Metadata.Alias, alias, StringComparison.OrdinalIgnoreCase));

        if (provider == null)
        {
            return NotFound($"Provider '{alias}' not found.");
        }

        var success = await providerManager.SetActiveProviderAsync(alias, cancellationToken);
        if (!success)
        {
            return BadRequest("Failed to activate provider.");
        }

        return Ok(new { message = $"Tax provider '{provider.Metadata.DisplayName}' is now active." });
    }

    /// <summary>
    /// Save tax provider configuration settings
    /// </summary>
    [HttpPut("tax-providers/{alias}/settings")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SaveProviderSettings(
        string alias,
        [FromBody] SaveTaxProviderSettingsDto request,
        CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        var provider = providers.FirstOrDefault(p =>
            string.Equals(p.Metadata.Alias, alias, StringComparison.OrdinalIgnoreCase));

        if (provider == null)
        {
            return NotFound($"Provider '{alias}' not found.");
        }

        var success = await providerManager.SaveProviderSettingsAsync(alias, request.Configuration, cancellationToken);
        if (!success)
        {
            return BadRequest("Failed to save provider settings.");
        }

        return Ok(new { message = "Settings saved successfully." });
    }

    /// <summary>
    /// Test/validate a tax provider's configuration
    /// </summary>
    [HttpPost("tax-providers/{alias}/test")]
    [ProducesResponseType<TestTaxProviderResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TestProvider(string alias, CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        var provider = providers.FirstOrDefault(p =>
            string.Equals(p.Metadata.Alias, alias, StringComparison.OrdinalIgnoreCase));

        if (provider == null)
        {
            return NotFound($"Provider '{alias}' not found.");
        }

        var response = new TestTaxProviderResultDto();

        try
        {
            var result = await provider.Provider.ValidateConfigurationAsync(cancellationToken);
            response.IsSuccessful = result.IsValid;
            response.ErrorMessage = result.ErrorMessage;
            response.Details = result.Details;
        }
        catch (Exception ex)
        {
            response.IsSuccessful = false;
            response.ErrorMessage = ex.Message;
        }

        return Ok(response);
    }

    // ============================================
    // Mapping Helpers
    // ============================================

    private static TaxProviderDto MapToProviderDto(RegisteredTaxProvider registered)
    {
        var meta = registered.Metadata;
        Dictionary<string, string>? config = null;

        if (registered.Setting != null && !string.IsNullOrEmpty(registered.Setting.ConfigurationJson))
        {
            try
            {
                config = JsonSerializer.Deserialize<Dictionary<string, string>>(registered.Setting.ConfigurationJson);
            }
            catch
            {
                // Ignore deserialization errors
            }
        }

        return new TaxProviderDto
        {
            Alias = meta.Alias,
            DisplayName = meta.DisplayName,
            Icon = meta.Icon,
            Description = meta.Description,
            SupportsRealTimeCalculation = meta.SupportsRealTimeCalculation,
            RequiresApiCredentials = meta.RequiresApiCredentials,
            SetupInstructions = meta.SetupInstructions,
            IsActive = registered.IsActive,
            Configuration = config
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
