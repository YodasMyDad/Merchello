namespace Merchello.Core.AddressLookup.Providers.Models;

/// <summary>
/// Request for address lookup suggestions.
/// </summary>
public class AddressLookupSuggestionsRequest
{
    public required string Query { get; init; }

    public string? CountryCode { get; init; }

    public int? Limit { get; init; }

    public string? SessionId { get; init; }
}
