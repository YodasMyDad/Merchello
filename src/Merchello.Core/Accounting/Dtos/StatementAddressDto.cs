namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Simplified address DTO for statements.
/// </summary>
public record StatementAddressDto
{
    public string? Company { get; init; }
    public string? AddressLine1 { get; init; }
    public string? AddressLine2 { get; init; }
    public string? City { get; init; }
    public string? Region { get; init; }
    public string? PostalCode { get; init; }
    public string? Country { get; init; }
}
