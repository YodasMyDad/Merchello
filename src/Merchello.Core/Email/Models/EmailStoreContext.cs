using Merchello.Core.Locality.Models;

namespace Merchello.Core.Email.Models;

/// <summary>
/// Provides store context information available to email templates.
/// </summary>
public class EmailStoreContext
{
    /// <summary>
    /// Store name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Store email address (default from address).
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// URL to the store logo for email headers.
    /// </summary>
    public string? LogoUrl { get; set; }

    /// <summary>
    /// Store website URL.
    /// </summary>
    public string? WebsiteUrl { get; set; }

    /// <summary>
    /// Store phone number.
    /// </summary>
    public string? Phone { get; set; }

    /// <summary>
    /// Store physical address.
    /// </summary>
    public Address? Address { get; set; }

    /// <summary>
    /// Currency code (e.g., "GBP", "USD").
    /// </summary>
    public string? CurrencyCode { get; set; }

    /// <summary>
    /// Currency symbol (e.g., "£", "$").
    /// </summary>
    public string? CurrencySymbol { get; set; }
}
