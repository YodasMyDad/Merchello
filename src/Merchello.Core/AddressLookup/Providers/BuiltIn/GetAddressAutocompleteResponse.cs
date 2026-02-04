using System.Text.Json.Serialization;

namespace Merchello.Core.AddressLookup.Providers.BuiltIn;

internal sealed record GetAddressAutocompleteResponse(
    [property: JsonPropertyName("suggestions")] List<GetAddressSuggestion>? Suggestions);
