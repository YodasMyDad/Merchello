namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// Address DTO for warehouse shipping origin.
/// </summary>
public class WarehouseAddressDto
{
    public string? Name { get; set; }
    public string? Company { get; set; }
    public string? AddressOne { get; set; }
    public string? AddressTwo { get; set; }
    public string? TownCity { get; set; }
    public string? CountyState { get; set; }
    public string? CountyStateCode { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? CountryCode { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
}
