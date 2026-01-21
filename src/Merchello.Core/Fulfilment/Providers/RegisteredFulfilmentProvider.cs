using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers.Interfaces;

namespace Merchello.Core.Fulfilment.Providers;

/// <summary>
/// Wraps a provider instance with its persisted configuration.
/// </summary>
public sealed class RegisteredFulfilmentProvider
{
    public RegisteredFulfilmentProvider(IFulfilmentProvider provider, FulfilmentProviderConfiguration? configuration)
    {
        Provider = provider ?? throw new ArgumentNullException(nameof(provider));
        Configuration = configuration;
    }

    /// <summary>
    /// The provider implementation.
    /// </summary>
    public IFulfilmentProvider Provider { get; }

    /// <summary>
    /// Persisted configuration (null if not configured).
    /// </summary>
    public FulfilmentProviderConfiguration? Configuration { get; }

    /// <summary>
    /// Provider metadata.
    /// </summary>
    public FulfilmentProviderMetadata Metadata => Provider.Metadata;

    /// <summary>
    /// Whether this provider is enabled.
    /// </summary>
    public bool IsEnabled => Configuration?.IsEnabled ?? false;

    /// <summary>
    /// Display name (from configuration or metadata).
    /// </summary>
    public string DisplayName => Configuration?.DisplayName ?? Metadata.DisplayName;

    /// <summary>
    /// Sort order for display.
    /// </summary>
    public int SortOrder => Configuration?.SortOrder ?? 0;
}
