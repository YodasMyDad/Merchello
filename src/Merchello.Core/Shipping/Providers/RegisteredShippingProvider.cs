using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers.Interfaces;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Wraps a provider instance with its persisted configuration.
/// </summary>
public sealed class RegisteredShippingProvider
{
    public RegisteredShippingProvider(IShippingProvider provider, ShippingProviderConfiguration? configuration)
    {
        Provider = provider ?? throw new ArgumentNullException(nameof(provider));
        Configuration = configuration;
    }

    /// <summary>
    /// The provider implementation.
    /// </summary>
    public IShippingProvider Provider { get; }

    /// <summary>
    /// Persisted configuration (null if not configured).
    /// </summary>
    public ShippingProviderConfiguration? Configuration { get; }

    /// <summary>
    /// Provider metadata.
    /// </summary>
    public ShippingProviderMetadata Metadata => Provider.Metadata;

    /// <summary>
    /// Whether this provider is enabled.
    /// </summary>
    public bool IsEnabled => Configuration?.IsEnabled ?? false;

    /// <summary>
    /// Display name (from configuration or metadata).
    /// </summary>
    public string DisplayName => Configuration?.DisplayName ?? Metadata.DisplayName;

    /// <summary>
    /// Sort order for checkout display.
    /// </summary>
    public int SortOrder => Configuration?.SortOrder ?? 0;
}
