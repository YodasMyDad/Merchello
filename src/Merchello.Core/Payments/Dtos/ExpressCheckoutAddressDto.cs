namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Address data from express checkout.
/// </summary>
public class ExpressCheckoutAddressDto
{
    /// <summary>
    /// Street address line 1.
    /// </summary>
    public required string Line1 { get; set; }

    /// <summary>
    /// Street address line 2 (apartment, suite, etc.).
    /// </summary>
    public string? Line2 { get; set; }

    /// <summary>
    /// City or locality.
    /// </summary>
    public required string City { get; set; }

    /// <summary>
    /// State, province, or region.
    /// </summary>
    public string? Region { get; set; }

    /// <summary>
    /// Postal or ZIP code.
    /// </summary>
    public required string PostalCode { get; set; }

    /// <summary>
    /// ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "CA").
    /// </summary>
    public required string CountryCode { get; set; }
}
