namespace Merchello.Core.AddressLookup.Providers.Models;

/// <summary>
/// Normalized address result returned by a provider.
/// </summary>
public class AddressLookupAddress
{
    public string? Company { get; set; }

    public string? AddressOne { get; set; }

    public string? AddressTwo { get; set; }

    public string? TownCity { get; set; }

    public string? CountyState { get; set; }

    public string? RegionCode { get; set; }

    public string? PostalCode { get; set; }

    public string? Country { get; set; }

    public string? CountryCode { get; set; }
}
