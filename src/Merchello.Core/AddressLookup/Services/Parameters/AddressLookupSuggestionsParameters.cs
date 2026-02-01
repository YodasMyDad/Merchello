namespace Merchello.Core.AddressLookup.Services.Parameters;

public class AddressLookupSuggestionsParameters
{
    public required string Query { get; init; }

    public string? CountryCode { get; init; }

    public int? Limit { get; init; }

    public string? SessionId { get; init; }
}
