using Merchello.Core.AddressLookup.Providers.Interfaces;
using Merchello.Core.AddressLookup.Providers.Models;
using Merchello.Core.Shared.Providers;

namespace Merchello.Core.AddressLookup.Providers;

/// <summary>
/// Base class for address lookup providers with common functionality.
/// </summary>
public abstract class AddressLookupProviderBase : IAddressLookupProvider
{
    protected AddressLookupProviderConfiguration? Configuration { get; private set; }

    public abstract AddressLookupProviderMetadata Metadata { get; }

    public virtual ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>([]);
    }

    public virtual ValueTask ConfigureAsync(
        AddressLookupProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        Configuration = configuration;
        return ValueTask.CompletedTask;
    }

    public abstract Task<AddressLookupSuggestionsResult> GetSuggestionsAsync(
        AddressLookupSuggestionsRequest request,
        CancellationToken cancellationToken = default);

    public abstract Task<AddressLookupAddressResult> GetAddressAsync(
        AddressLookupResolveRequest request,
        CancellationToken cancellationToken = default);

    public virtual Task<AddressLookupProviderValidationResult> ValidateConfigurationAsync(
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(AddressLookupProviderValidationResult.Valid());
    }

    protected string? GetConfigValue(string key) => Configuration?.GetValue(key);

    protected string GetRequiredConfigValue(string key)
    {
        var value = Configuration?.GetValue(key);
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"Required configuration value '{key}' is missing for address lookup provider '{Metadata.Alias}'.");
        }

        return value;
    }

    protected bool GetConfigBool(string key, bool defaultValue = false)
    {
        var value = Configuration?.GetValue(key);
        return bool.TryParse(value, out var result) ? result : defaultValue;
    }

    protected int GetConfigInt(string key, int defaultValue = 0)
    {
        var value = Configuration?.GetValue(key);
        return int.TryParse(value, out var result) ? result : defaultValue;
    }
}
