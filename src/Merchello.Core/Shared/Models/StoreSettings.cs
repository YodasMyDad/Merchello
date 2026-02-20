namespace Merchello.Core.Shared.Models;

/// <summary>
/// Store identity and contact information used across checkout, emails, and documents.
/// Configured via appsettings.json under "Merchello:Store".
/// </summary>
public class StoreSettings
{
    /// <summary>
    /// Store/company name displayed in checkout, emails, and invoices.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Store contact email address (used as default from address for emails).
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// Store phone number displayed in checkout and email footers.
    /// </summary>
    public string? Phone { get; set; }

    /// <summary>
    /// URL to the store logo displayed in checkout header and emails.
    /// </summary>
    public string? LogoUrl { get; set; }

    /// <summary>
    /// Store website base URL (e.g., "https://store.example.com").
    /// Used for generating download links and email links.
    /// </summary>
    public string? WebsiteUrl { get; set; }

    /// <summary>
    /// Store physical address displayed on invoices, statements, and email footers.
    /// Can include multiple lines separated by newlines.
    /// </summary>
    public string? Address { get; set; }

    /// <summary>
    /// URL to the terms and conditions page.
    /// </summary>
    public string? TermsUrl { get; set; }

    /// <summary>
    /// URL to the privacy policy page.
    /// </summary>
    public string? PrivacyUrl { get; set; }
}
