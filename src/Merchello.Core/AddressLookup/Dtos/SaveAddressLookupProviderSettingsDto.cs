namespace Merchello.Core.AddressLookup.Dtos;

public class SaveAddressLookupProviderSettingsDto
{
    public Dictionary<string, string> Configuration { get; init; } = new();
}
