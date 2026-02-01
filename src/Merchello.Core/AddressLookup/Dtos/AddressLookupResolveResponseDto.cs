namespace Merchello.Core.AddressLookup.Dtos;

public class AddressLookupResolveResponseDto
{
    public bool Success { get; init; }

    public string? ErrorMessage { get; init; }

    public AddressLookupAddressDto? Address { get; init; }
}
