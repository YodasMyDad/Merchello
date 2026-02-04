using System.Text.Json.Serialization;

namespace Merchello.Core.AddressLookup.Providers.BuiltIn;

internal sealed record GetAddressSuggestion(
    [property: JsonPropertyName("address")] string? Address,
    [property: JsonPropertyName("url")] string? Url,
    [property: JsonPropertyName("id")] string? Id);
