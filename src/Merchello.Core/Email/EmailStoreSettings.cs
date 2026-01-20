namespace Merchello.Core.Email;

/// <summary>
/// Store-specific settings available to email templates.
/// </summary>
public class EmailStoreSettings
{
    /// <summary>
    /// Store name displayed in emails.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Store email address.
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// URL to the store logo for email headers.
    /// </summary>
    public string? LogoUrl { get; set; }

    /// <summary>
    /// Store website URL.
    /// </summary>
    public string? WebsiteUrl { get; set; }

    /// <summary>
    /// Support email address.
    /// </summary>
    public string? SupportEmail { get; set; }

    /// <summary>
    /// Store phone number.
    /// </summary>
    public string? Phone { get; set; }
}
