namespace Merchello.Core.Protocols.Models;

/// <summary>
/// Protocol-agnostic representation of an address.
/// </summary>
public class CheckoutAddressState
{
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public string? Company { get; init; }
    public string? Address1 { get; init; }
    public string? Address2 { get; init; }
    public string? City { get; init; }

    /// <summary>
    /// State/Province name.
    /// </summary>
    public string? Region { get; init; }

    /// <summary>
    /// State/Province code.
    /// </summary>
    public string? RegionCode { get; init; }

    public string? PostalCode { get; init; }
    public string? Country { get; init; }

    /// <summary>
    /// ISO 3166-1 alpha-2 country code.
    /// </summary>
    public string? CountryCode { get; init; }

    /// <summary>
    /// E.164 format phone number.
    /// </summary>
    public string? Phone { get; init; }

    public string? Email { get; init; }
}
