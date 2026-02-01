using Merchello.Core.AddressLookup.Providers.Models;
using Merchello.Core.Shared.Providers;

namespace Merchello.Core.AddressLookup.Providers.Interfaces;

/// <summary>
/// Interface for address lookup providers.
/// </summary>
public interface IAddressLookupProvider
{
    /// <summary>
    /// Provider metadata (alias, display name, capabilities).
    /// </summary>
    AddressLookupProviderMetadata Metadata { get; }

    /// <summary>
    /// Configuration fields required by this provider for the admin UI.
    /// </summary>
    ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Configure the provider with saved settings.
    /// </summary>
    ValueTask ConfigureAsync(
        AddressLookupProviderConfiguration? configuration,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get address suggestions for a query.
    /// </summary>
    Task<AddressLookupSuggestionsResult> GetSuggestionsAsync(
        AddressLookupSuggestionsRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Resolve a suggestion into a full address.
    /// </summary>
    Task<AddressLookupAddressResult> GetAddressAsync(
        AddressLookupResolveRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Validate configuration (e.g. test API credentials).
    /// </summary>
    Task<AddressLookupProviderValidationResult> ValidateConfigurationAsync(
        CancellationToken cancellationToken = default);
}
