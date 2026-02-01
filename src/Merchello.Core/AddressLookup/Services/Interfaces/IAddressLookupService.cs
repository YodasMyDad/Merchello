using Merchello.Core.AddressLookup.Dtos;
using Merchello.Core.AddressLookup.Providers.Models;
using Merchello.Core.AddressLookup.Services.Parameters;

namespace Merchello.Core.AddressLookup.Services.Interfaces;

public interface IAddressLookupService
{
    Task<AddressLookupClientConfigDto> GetClientConfigAsync(
        GetAddressLookupClientConfigParameters? parameters = null,
        CancellationToken cancellationToken = default);

    Task<AddressLookupSuggestionsResult> GetSuggestionsAsync(
        AddressLookupSuggestionsParameters parameters,
        CancellationToken cancellationToken = default);

    Task<AddressLookupAddressResult> ResolveAddressAsync(
        AddressLookupResolveParameters parameters,
        CancellationToken cancellationToken = default);
}
