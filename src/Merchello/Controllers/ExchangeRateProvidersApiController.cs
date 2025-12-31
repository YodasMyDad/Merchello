using System.Text.Json;
using Asp.Versioning;
using Merchello.Core.ExchangeRates.Dtos;
using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.ExchangeRates.Providers;
using Merchello.Core.ExchangeRates.Providers.Interfaces;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Merchello.Controllers;

/// <summary>
/// API controller for managing exchange rate providers in the backoffice
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class ExchangeRateProvidersApiController(
    IExchangeRateProviderManager providerManager,
    IExchangeRateCache exchangeRateCache,
    IOptions<MerchelloSettings> merchelloSettings) : MerchelloApiControllerBase
{
    private readonly MerchelloSettings _settings = merchelloSettings.Value;

    /// <summary>
    /// Get all available exchange rate providers discovered from assemblies
    /// </summary>
    [HttpGet("exchange-rate-providers/available")]
    [ProducesResponseType<List<ExchangeRateProviderDto>>(StatusCodes.Status200OK)]
    public async Task<List<ExchangeRateProviderDto>> GetAvailableProviders(CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        return providers.Select(MapToProviderDto).ToList();
    }

    /// <summary>
    /// Get all exchange rate providers with their settings
    /// </summary>
    [HttpGet("exchange-rate-providers")]
    [ProducesResponseType<List<ExchangeRateProviderDto>>(StatusCodes.Status200OK)]
    public async Task<List<ExchangeRateProviderDto>> GetProviders(CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetProvidersAsync(cancellationToken);
        return providers.Select(MapToProviderDto).ToList();
    }

    /// <summary>
    /// Get configuration fields for an exchange rate provider
    /// </summary>
    [HttpGet("exchange-rate-providers/{alias}/fields")]
    [ProducesResponseType<List<ExchangeRateProviderFieldDto>>(StatusCodes.Status200OK)]
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
    /// Activate an exchange rate provider (only one can be active at a time)
    /// </summary>
    [HttpPut("exchange-rate-providers/{alias}/activate")]
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

        // Invalidate cache so new provider's rates will be fetched
        await exchangeRateCache.InvalidateAsync(cancellationToken);

        return Ok(new { message = $"Provider '{provider.Metadata.DisplayName}' is now active." });
    }

    /// <summary>
    /// Save exchange rate provider configuration settings
    /// </summary>
    [HttpPut("exchange-rate-providers/{alias}/settings")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SaveProviderSettings(
        string alias,
        [FromBody] SaveExchangeRateProviderSettingsDto request,
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

        // Invalidate cache so provider will be reconfigured
        await exchangeRateCache.InvalidateAsync(cancellationToken);

        return Ok(new { message = "Settings saved successfully." });
    }

    /// <summary>
    /// Test an exchange rate provider by fetching rates
    /// </summary>
    [HttpPost("exchange-rate-providers/{alias}/test")]
    [ProducesResponseType<TestExchangeRateProviderResultDto>(StatusCodes.Status200OK)]
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

        var baseCurrency = _settings.StoreCurrencyCode;
        var response = new TestExchangeRateProviderResultDto
        {
            BaseCurrency = baseCurrency
        };

        try
        {
            var result = await provider.Provider.GetRatesAsync(baseCurrency, cancellationToken);

            response.IsSuccessful = result.Success;
            response.ErrorMessage = result.ErrorMessage;
            response.RateTimestamp = result.TimestampUtc;
            response.TotalRatesCount = result.Rates.Count;

            if (result.Success && result.Rates.Count > 0)
            {
                // Return a sample of common currencies
                var commonCurrencies = new[] { "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "MXN", "BRL" };
                response.SampleRates = result.Rates
                    .Where(r => commonCurrencies.Contains(r.Key, StringComparer.OrdinalIgnoreCase))
                    .OrderBy(r => Array.IndexOf(commonCurrencies, r.Key.ToUpperInvariant()))
                    .Take(10)
                    .ToDictionary(r => r.Key, r => r.Value);

                // If no common currencies found, just take first 10
                if (response.SampleRates.Count == 0)
                {
                    response.SampleRates = result.Rates
                        .Take(10)
                        .ToDictionary(r => r.Key, r => r.Value);
                }
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
    /// Force refresh the exchange rate cache
    /// </summary>
    [HttpPost("exchange-rate-providers/refresh")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> RefreshRates(CancellationToken cancellationToken = default)
    {
        var success = await exchangeRateCache.RefreshAsync(cancellationToken);
        if (!success)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Failed to refresh exchange rates." });
        }

        return Ok(new { message = "Exchange rates refreshed successfully." });
    }

    /// <summary>
    /// Get the current exchange rate snapshot from cache
    /// </summary>
    [HttpGet("exchange-rate-providers/snapshot")]
    [ProducesResponseType<ExchangeRateSnapshotDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSnapshot(CancellationToken cancellationToken = default)
    {
        var snapshot = await exchangeRateCache.GetSnapshotAsync(cancellationToken);
        if (snapshot == null)
        {
            return NotFound("No exchange rate snapshot available.");
        }

        // Get the active provider's setting for LastFetchedAt
        var activeProvider = await providerManager.GetActiveProviderAsync(cancellationToken);

        var dto = new ExchangeRateSnapshotDto
        {
            ProviderAlias = snapshot.ProviderAlias,
            BaseCurrency = snapshot.BaseCurrency,
            Rates = snapshot.Rates,
            TimestampUtc = snapshot.TimestampUtc,
            LastFetchedAt = activeProvider?.Setting?.LastFetchedAt
        };

        return Ok(dto);
    }

    // ============================================
    // Mapping Helpers
    // ============================================

    private static ExchangeRateProviderDto MapToProviderDto(RegisteredExchangeRateProvider registered)
    {
        var meta = registered.Metadata;
        Dictionary<string, string>? config = null;

        // Parse configuration but mask sensitive values
        if (registered.Setting != null && !string.IsNullOrEmpty(registered.Setting.ConfigurationJson))
        {
            try
            {
                config = JsonSerializer.Deserialize<Dictionary<string, string>>(registered.Setting.ConfigurationJson);
                // Note: We could mask sensitive values here if needed
            }
            catch
            {
                // Ignore deserialization errors
            }
        }

        return new ExchangeRateProviderDto
        {
            Alias = meta.Alias,
            DisplayName = meta.DisplayName,
            Icon = meta.Icon,
            Description = meta.Description,
            SupportsHistoricalRates = meta.SupportsHistoricalRates,
            SupportedCurrencies = meta.SupportedCurrencies,
            IsActive = registered.IsActive,
            LastFetchedAt = registered.Setting?.LastFetchedAt,
            Configuration = config
        };
    }

    private static ExchangeRateProviderFieldDto MapToFieldDto(ExchangeRateProviderConfigurationField field)
    {
        return new ExchangeRateProviderFieldDto
        {
            Key = field.Key,
            Label = field.Label,
            Description = field.Description,
            FieldType = field.FieldType.ToString(),
            IsRequired = field.IsRequired,
            IsSensitive = field.IsSensitive,
            DefaultValue = field.DefaultValue,
            Placeholder = field.Placeholder
        };
    }
}
