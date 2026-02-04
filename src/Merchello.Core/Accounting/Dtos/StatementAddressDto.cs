namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Simplified address DTO for statements.
/// </summary>
public record StatementAddressDto
{
    public string? Company { get; init; }
    public string? AddressOne { get; init; }
    public string? AddressTwo { get; init; }
    public string? TownCity { get; init; }
    public string? CountyState { get; init; }
    public string? PostalCode { get; init; }
    public string? Country { get; init; }
}
