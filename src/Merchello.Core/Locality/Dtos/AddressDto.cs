namespace Merchello.Core.Locality.Dtos;

/// <summary>
/// Address DTO for billing/shipping addresses
/// </summary>
public class AddressDto
{
    public string? Name { get; set; }
    public string? Company { get; set; }
    public string? AddressOne { get; set; }
    public string? AddressTwo { get; set; }
    public string? TownCity { get; set; }
    public string? CountyState { get; set; }
    public string? RegionCode { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? CountryCode { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
}
