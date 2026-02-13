using System.Text.Json;
using Merchello.Core.Shared.Providers;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Providers.Models;

namespace Merchello.Core.Tax.Providers;

/// <summary>
/// Base class for tax providers with common functionality.
/// </summary>
public abstract class TaxProviderBase : ITaxProvider
{
    protected TaxProviderConfiguration? Configuration { get; private set; }

    /// <inheritdoc />
    public abstract TaxProviderMetadata Metadata { get; }

    /// <inheritdoc />
    public virtual ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>([]);
    }

    /// <inheritdoc />
    public virtual ValueTask ConfigureAsync(
        TaxProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        Configuration = configuration;
        return ValueTask.CompletedTask;
    }

    /// <inheritdoc />
    public abstract Task<TaxCalculationResult> CalculateOrderTaxAsync(
        TaxCalculationRequest request,
        CancellationToken cancellationToken = default);

    /// <inheritdoc />
    public virtual Task<TaxProviderValidationResult> ValidateConfigurationAsync(
        CancellationToken cancellationToken = default)
    {
        // Default implementation - always valid for providers without API credentials
        return Task.FromResult(TaxProviderValidationResult.Valid());
    }

    /// <inheritdoc />
    public virtual Task<ShippingTaxConfigurationResult> GetShippingTaxConfigurationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(ShippingTaxConfigurationResult.ProviderCalculated());
    }

    /// <summary>
    /// Gets a configuration value by key.
    /// </summary>
    protected string? GetConfigValue(string key) => Configuration?.GetValue(key);

    /// <summary>
    /// Gets a required configuration value by key.
    /// </summary>
    /// <exception cref="InvalidOperationException">Thrown when the configuration value is missing.</exception>
    protected string GetRequiredConfigValue(string key)
    {
        var value = Configuration?.GetValue(key);
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"Required configuration value '{key}' is missing for tax provider '{Metadata.Alias}'.");
        }
        return value;
    }

    /// <summary>
    /// Gets a configuration value as boolean (defaults to false).
    /// </summary>
    protected bool GetConfigBool(string key, bool defaultValue = false)
    {
        var value = Configuration?.GetValue(key);
        return bool.TryParse(value, out var result) ? result : defaultValue;
    }

    /// <summary>
    /// Gets a configuration value as integer.
    /// </summary>
    protected int GetConfigInt(string key, int defaultValue = 0)
    {
        var value = Configuration?.GetValue(key);
        return int.TryParse(value, out var result) ? result : defaultValue;
    }

    /// <summary>
    /// Gets the provider-specific tax code for a TaxGroup from configuration.
    /// </summary>
    /// <param name="taxGroupId">The TaxGroup ID to look up</param>
    /// <returns>The mapped tax code, or null if no mapping exists</returns>
    protected string? GetTaxCodeForTaxGroup(Guid? taxGroupId)
    {
        if (!taxGroupId.HasValue)
        {
            return null;
        }

        var mappingsJson = GetConfigValue("taxGroupMappings");
        if (string.IsNullOrWhiteSpace(mappingsJson))
        {
            return null;
        }

        try
        {
            var mappings = JsonSerializer.Deserialize<Dictionary<string, string>>(mappingsJson);
            return mappings?.GetValueOrDefault(taxGroupId.Value.ToString());
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Gets the provider-specific shipping tax code from configuration.
    /// </summary>
    /// <returns>The configured shipping tax code, or null to use default</returns>
    protected string? GetShippingTaxCode()
    {
        return GetConfigValue("shippingTaxCode");
    }
}
