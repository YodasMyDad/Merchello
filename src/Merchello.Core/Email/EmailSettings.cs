namespace Merchello.Core.Email;

/// <summary>
/// Configuration settings for the email system.
/// </summary>
public class EmailSettings
{
    /// <summary>
    /// Whether the email system is enabled.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// View locations for email templates (supports format string with {0} placeholder).
    /// Example: "/Views/Emails/{0}.cshtml"
    /// </summary>
    public string[] TemplateViewLocations { get; set; } = ["/Views/Emails/{0}.cshtml"];

    /// <summary>
    /// Default from email address. Used when no FromExpression is specified
    /// or when the expression evaluates to empty.
    /// If null, falls back to Umbraco SMTP settings.
    /// </summary>
    public string? DefaultFromAddress { get; set; }

    /// <summary>
    /// Default from display name.
    /// </summary>
    public string? DefaultFromName { get; set; }

    /// <summary>
    /// Maximum number of retry attempts for failed email deliveries.
    /// </summary>
    public int MaxRetries { get; set; } = 3;

    /// <summary>
    /// Delay in seconds between retry attempts.
    /// Array index corresponds to attempt number (0 = first retry, 1 = second retry, etc.).
    /// </summary>
    public int[] RetryDelaysSeconds { get; set; } = [60, 300, 900]; // 1min, 5min, 15min

    /// <summary>
    /// Number of days to retain delivery records before cleanup.
    /// </summary>
    public int DeliveryRetentionDays { get; set; } = 30;

    /// <summary>
    /// Store context information for email templates.
    /// </summary>
    public EmailStoreSettings Store { get; set; } = new();

    /// <summary>
    /// Theme settings for MJML email templates.
    /// </summary>
    public EmailThemeSettings Theme { get; set; } = new();
}

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

/// <summary>
/// Theme settings for MJML email templates.
/// </summary>
public class EmailThemeSettings
{
    /// <summary>
    /// Primary color for buttons and accents (e.g., "#007bff").
    /// </summary>
    public string PrimaryColor { get; set; } = "#007bff";

    /// <summary>
    /// Main text color (e.g., "#333333").
    /// </summary>
    public string TextColor { get; set; } = "#333333";

    /// <summary>
    /// Background color for the email body (e.g., "#f4f4f4").
    /// </summary>
    public string BackgroundColor { get; set; } = "#f4f4f4";

    /// <summary>
    /// Font family for email text.
    /// </summary>
    public string FontFamily { get; set; } = "'Helvetica Neue', Helvetica, Arial, sans-serif";

    /// <summary>
    /// Secondary/muted text color (e.g., "#666666").
    /// </summary>
    public string SecondaryTextColor { get; set; } = "#666666";

    /// <summary>
    /// Content section background color (e.g., "#ffffff").
    /// </summary>
    public string ContentBackgroundColor { get; set; } = "#ffffff";
}
