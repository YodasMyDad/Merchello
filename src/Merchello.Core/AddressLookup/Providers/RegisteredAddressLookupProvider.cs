using Merchello.Core.AddressLookup.Models;
using Merchello.Core.AddressLookup.Providers.Interfaces;
using Merchello.Core.AddressLookup.Providers.Models;

namespace Merchello.Core.AddressLookup.Providers;

/// <summary>
/// Wrapper combining an address lookup provider instance with its persisted settings.
/// </summary>
public sealed class RegisteredAddressLookupProvider
{
    public RegisteredAddressLookupProvider(IAddressLookupProvider provider, AddressLookupProviderSetting? setting)
    {
        Provider = provider ?? throw new ArgumentNullException(nameof(provider));
        Setting = setting;
    }

    public IAddressLookupProvider Provider { get; }

    public AddressLookupProviderSetting? Setting { get; }

    public AddressLookupProviderMetadata Metadata => Provider.Metadata;

    public bool IsActive => Setting?.IsEnabled ?? false;
}
