using System.Text.Json.Serialization;

namespace Merchello.Core.AddressLookup.Providers.BuiltIn;

internal sealed record GetAddressAddressResponse(
    [property: JsonPropertyName("postcode")] string? Postcode,
    [property: JsonPropertyName("line_1")] string? Line1,
    [property: JsonPropertyName("line_2")] string? Line2,
    [property: JsonPropertyName("line_3")] string? Line3,
    [property: JsonPropertyName("line_4")] string? Line4,
    [property: JsonPropertyName("town_or_city")] string? TownOrCity,
    [property: JsonPropertyName("county")] string? County,
    [property: JsonPropertyName("country")] string? Country,
    [property: JsonPropertyName("formatted_address")] string[]? FormattedAddress);
