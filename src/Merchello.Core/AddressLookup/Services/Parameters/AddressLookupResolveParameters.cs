namespace Merchello.Core.AddressLookup.Services.Parameters;

public class AddressLookupResolveParameters
{
    public required string Id { get; init; }

    public string? CountryCode { get; init; }

    public string? SessionId { get; init; }
}
