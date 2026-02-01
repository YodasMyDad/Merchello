namespace Merchello.Core.AddressLookup.Dtos;

public class AddressLookupResolveRequestDto
{
    public string? Id { get; init; }

    public string? CountryCode { get; init; }

    public string? SessionId { get; init; }
}
