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
    public virtual ValueTask<IEnumerable<TaxProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<TaxProviderConfigurationField>>([]);
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
    /// <remarks>
    /// Default implementation returns null, indicating rate cannot be determined without full calculation.
    /// Providers that can determine rate statically (e.g., ManualTaxProvider) should override this.
    /// </remarks>
    public virtual Task<decimal?> GetShippingTaxRateForLocationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<decimal?>(null);
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
}
