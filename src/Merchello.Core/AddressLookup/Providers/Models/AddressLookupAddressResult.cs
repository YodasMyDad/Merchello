namespace Merchello.Core.AddressLookup.Providers.Models;

/// <summary>
/// Result of resolving an address lookup suggestion.
/// </summary>
public class AddressLookupAddressResult
{
    private AddressLookupAddressResult(bool success, AddressLookupAddress? address, string? errorMessage)
    {
        Success = success;
        Address = address;
        ErrorMessage = errorMessage;
    }

    public bool Success { get; }

    public AddressLookupAddress? Address { get; }

    public string? ErrorMessage { get; }

    public static AddressLookupAddressResult Ok(AddressLookupAddress address)
        => new(true, address, null);

    public static AddressLookupAddressResult Fail(string errorMessage)
        => new(false, null, errorMessage);
}
