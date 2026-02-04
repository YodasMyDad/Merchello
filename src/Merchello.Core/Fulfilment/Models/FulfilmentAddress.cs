namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Address for fulfilment requests.
/// </summary>
public record FulfilmentAddress
{
    public string? Name { get; init; }
    public string? Company { get; init; }
    public required string AddressOne { get; init; }
    public string? AddressTwo { get; init; }
    public required string TownCity { get; init; }
    public string? CountyState { get; init; }
    public required string PostalCode { get; init; }
    public required string CountryCode { get; init; }
    public string? Phone { get; init; }
}
