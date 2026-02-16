namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// Address payload for fulfilment test order submission.
/// </summary>
public class TestFulfilmentAddressDto
{
    public string? Name { get; set; }
    public string? Company { get; set; }
    public string? AddressOne { get; set; }
    public string? AddressTwo { get; set; }
    public string? TownCity { get; set; }
    public string? CountyState { get; set; }
    public string? PostalCode { get; set; }
    public string? CountryCode { get; set; }
    public string? Phone { get; set; }
}
