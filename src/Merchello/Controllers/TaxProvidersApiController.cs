using Asp.Versioning;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shared.Providers;
using Merchello.Core.Tax.Dtos;
using Merchello.Core.Tax.Providers;
using Merchello.Core.Tax.Providers.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for managing tax providers in the backoffice.
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class TaxProvidersApiController(
    ITaxProviderManager providerManager) : MerchelloApiControllerBase
{
    private const string SensitiveMask = "********";

    /// <summary>
    /// Get all available tax providers.
    /// </summary>
    [HttpGet("tax-providers")]
    [ProducesResponseType<List<TaxProviderDto>>(StatusCodes.Status200OK)]
    public async Task<List<TaxProviderDto>> GetProviders(CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        var dtos = await Task.WhenAll(providers.Select(p => MapToProviderDtoAsync(p, cancellationToken)));
        return dtos.ToList();
    }

    /// <summary>
    /// Get the currently active tax provider.
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

        return Ok(await MapToProviderDtoAsync(provider, cancellationToken));
    }

    /// <summary>
    /// Get configuration fields for a tax provider.
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
    /// Activate a tax provider (only one can be active at a time).
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
    /// Save tax provider configuration settings.
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

        var mergedConfiguration = new Dictionary<string, string>(
            request.Configuration ?? [],
            StringComparer.OrdinalIgnoreCase);

        var existingConfiguration = provider.Configuration?.GetAll();
        var fields = await provider.Provider.GetConfigurationFieldsAsync(cancellationToken);
        var sensitiveKeys = fields
            .Where(f => f.IsSensitive)
            .Select(f => f.Key)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var key in sensitiveKeys)
        {
            var submittedValue = mergedConfiguration.GetValueOrDefault(key);
            var shouldKeepExisting = string.IsNullOrWhiteSpace(submittedValue) || IsMaskedValue(submittedValue);

            if (!shouldKeepExisting)
            {
                continue;
            }

            if (existingConfiguration != null && existingConfiguration.TryGetValue(key, out var existingValue))
            {
                mergedConfiguration[key] = existingValue;
            }
            else
            {
                mergedConfiguration.Remove(key);
            }
        }

        var success = await providerManager.SaveProviderSettingsAsync(alias, mergedConfiguration, cancellationToken);
        if (!success)
        {
            return BadRequest("Failed to save provider settings.");
        }

        return Ok(new { message = "Settings saved successfully." });
    }

    /// <summary>
    /// Test/validate a tax provider's configuration.
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

    private async Task<TaxProviderDto> MapToProviderDtoAsync(
        RegisteredTaxProvider registered,
        CancellationToken cancellationToken)
    {
        var meta = registered.Metadata;
        Dictionary<string, string>? config = null;

        var configurationValues = registered.Configuration?.GetAll();
        if (configurationValues is { Count: > 0 })
        {
            config = configurationValues.ToDictionary(k => k.Key, v => v.Value, StringComparer.OrdinalIgnoreCase);

            var fields = await registered.Provider.GetConfigurationFieldsAsync(cancellationToken);
            var sensitiveKeys = fields
                .Where(f => f.IsSensitive)
                .Select(f => f.Key)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            foreach (var key in config.Keys.Where(k => sensitiveKeys.Contains(k)).ToList())
            {
                if (!string.IsNullOrEmpty(config[key]))
                {
                    config[key] = SensitiveMask;
                }
            }
        }

        return new TaxProviderDto
        {
            Alias = meta.Alias,
            DisplayName = meta.DisplayName,
            Icon = meta.Icon,
            IconSvg = meta.IconSvg,
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
            Options = field.Options?.Select(o => new SelectOption
            {
                Value = o.Value,
                Label = o.Label
            }).ToList()
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

        var bulletMask = new string('\u2022', 8);
        var mojibakeBulletMask = string.Concat(Enumerable.Repeat("\u00E2\u20AC\u00A2", 8));
        return value == bulletMask || value == mojibakeBulletMask;
    }
}
