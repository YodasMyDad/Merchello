namespace Merchello.Core.AddressLookup.Providers.Models;

/// <summary>
/// Normalized address result returned by a provider.
/// </summary>
public class AddressLookupAddress
{
    public string? Company { get; set; }

    public string? Address1 { get; set; }

    public string? Address2 { get; set; }

    public string? City { get; set; }

    public string? State { get; set; }

    public string? StateCode { get; set; }

    public string? PostalCode { get; set; }

    public string? Country { get; set; }

    public string? CountryCode { get; set; }
}
