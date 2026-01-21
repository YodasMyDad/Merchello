namespace Merchello.Core.Fulfilment.Models;

/// <summary>
/// Address for fulfilment requests.
/// </summary>
public record FulfilmentAddress
{
    public string? Name { get; init; }
    public string? Company { get; init; }
    public required string Address1 { get; init; }
    public string? Address2 { get; init; }
    public required string City { get; init; }
    public string? StateOrProvince { get; init; }
    public required string PostalCode { get; init; }
    public required string CountryCode { get; init; }
    public string? Phone { get; init; }
}
