namespace Merchello.Core.Payments.Models;

/// <summary>
/// Address data returned from an express checkout provider (Apple Pay, Google Pay, PayPal).
/// All fields are optional since payment providers may return partial address data.
/// </summary>
public class ExpressCheckoutAddress
{
    /// <summary>
    /// Street address line 1.
    /// </summary>
    public string? Line1 { get; set; }

    /// <summary>
    /// Street address line 2 (apartment, suite, etc.).
    /// </summary>
    public string? Line2 { get; set; }

    /// <summary>
    /// City or locality.
    /// </summary>
    public string? City { get; set; }

    /// <summary>
    /// State, province, or region.
    /// </summary>
    public string? Region { get; set; }

    /// <summary>
    /// Postal or ZIP code.
    /// </summary>
    public string? PostalCode { get; set; }

    /// <summary>
    /// ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "CA").
    /// </summary>
    public string? CountryCode { get; set; }
}
