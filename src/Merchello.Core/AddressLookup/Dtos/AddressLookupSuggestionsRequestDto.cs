namespace Merchello.Core.AddressLookup.Dtos;

public class AddressLookupSuggestionsRequestDto
{
    public string? Query { get; init; }

    public string? CountryCode { get; init; }

    public int? Limit { get; init; }

    public string? SessionId { get; init; }
}
