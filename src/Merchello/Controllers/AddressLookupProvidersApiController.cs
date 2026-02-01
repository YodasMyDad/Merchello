using System.Text.Json;
using Asp.Versioning;
using Merchello.Core.AddressLookup.Dtos;
using Merchello.Core.AddressLookup.Providers;
using Merchello.Core.AddressLookup.Providers.Interfaces;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shared.Providers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for managing address lookup providers in the backoffice.
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class AddressLookupProvidersApiController(
    IAddressLookupProviderManager providerManager) : MerchelloApiControllerBase
{
    /// <summary>
    /// Get all available address lookup providers.
    /// </summary>
    [HttpGet("address-lookup-providers")]
    [ProducesResponseType<List<AddressLookupProviderDto>>(StatusCodes.Status200OK)]
    public async Task<List<AddressLookupProviderDto>> GetProviders(CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        return providers.Select(MapToProviderDto).ToList();
    }

    /// <summary>
    /// Get the currently active address lookup provider.
    /// </summary>
    [HttpGet("address-lookup-providers/active")]
    [ProducesResponseType<AddressLookupProviderDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetActiveProvider(CancellationToken cancellationToken = default)
    {
        var provider = await providerManager.GetActiveProviderAsync(cancellationToken);
        if (provider == null)
        {
            return NotFound("No active address lookup provider found.");
        }

        return Ok(MapToProviderDto(provider));
    }

    /// <summary>
    /// Get configuration fields for an address lookup provider.
    /// </summary>
    [HttpGet("address-lookup-providers/{alias}/fields")]
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
    /// Activate an address lookup provider (only one can be active at a time).
    /// </summary>
    [HttpPut("address-lookup-providers/{alias}/activate")]
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

        return Ok(new { message = $"Address lookup provider '{provider.Metadata.DisplayName}' is now active." });
    }

    /// <summary>
    /// Deactivate all address lookup providers.
    /// </summary>
    [HttpPut("address-lookup-providers/deactivate")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeactivateProviders(CancellationToken cancellationToken = default)
    {
        var success = await providerManager.DeactivateAllProvidersAsync(cancellationToken);
        if (!success)
        {
            return BadRequest("Failed to deactivate providers.");
        }

        return Ok(new { message = "Address lookup providers disabled." });
    }

    /// <summary>
    /// Save address lookup provider configuration settings.
    /// </summary>
    [HttpPut("address-lookup-providers/{alias}/settings")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SaveProviderSettings(
        string alias,
        [FromBody] SaveAddressLookupProviderSettingsDto request,
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
    /// Test/validate an address lookup provider's configuration.
    /// </summary>
    [HttpPost("address-lookup-providers/{alias}/test")]
    [ProducesResponseType<TestAddressLookupProviderResultDto>(StatusCodes.Status200OK)]
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

        var response = new TestAddressLookupProviderResultDto();

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

    private static AddressLookupProviderDto MapToProviderDto(RegisteredAddressLookupProvider registered)
    {
        var meta = registered.Metadata;
        Dictionary<string, string>? config = null;

        if (registered.Setting != null && !string.IsNullOrEmpty(registered.Setting.SettingsJson))
        {
            try
            {
                config = JsonSerializer.Deserialize<Dictionary<string, string>>(registered.Setting.SettingsJson);
            }
            catch
            {
                // Ignore deserialization errors
            }
        }

        return new AddressLookupProviderDto
        {
            Alias = meta.Alias,
            DisplayName = meta.DisplayName,
            Icon = meta.Icon,
            IconSvg = meta.IconSvg,
            Description = meta.Description,
            RequiresApiCredentials = meta.RequiresApiCredentials,
            SetupInstructions = meta.SetupInstructions,
            SupportedCountries = meta.SupportedCountries?.ToArray(),
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
}
