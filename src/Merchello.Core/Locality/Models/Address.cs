using Microsoft.EntityFrameworkCore;

namespace Merchello.Core.Locality.Models;

[Owned]
public class Address
{
    public string? Name { get; set; }
    public string? Company { get; set; }
    public string? AddressOne { get; set; }
    public string? AddressTwo { get; set; }
    public string? TownCity { get; set; }
    public CountyState CountyState { get; set; } = new();
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? CountryCode { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
}
