namespace Merchello.Core.AddressLookup.Dtos;

public class TestAddressLookupProviderResultDto
{
    public bool IsSuccessful { get; set; }

    public string? ErrorMessage { get; set; }

    public Dictionary<string, string>? Details { get; set; }
}
