using Merchello.Core.Shipping.Models;

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

    public IShippingProvider Provider { get; }

    public ShippingProviderConfiguration? Configuration { get; }

    public ShippingProviderMetadata Metadata => Provider.Metadata;
}
