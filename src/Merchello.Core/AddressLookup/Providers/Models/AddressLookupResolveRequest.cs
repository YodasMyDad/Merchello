namespace Merchello.Core.AddressLookup.Providers.Models;

/// <summary>
/// Request to resolve an address lookup suggestion.
/// </summary>
public class AddressLookupResolveRequest
{
    public required string Id { get; init; }

    public string? CountryCode { get; init; }

    public string? SessionId { get; init; }
}
