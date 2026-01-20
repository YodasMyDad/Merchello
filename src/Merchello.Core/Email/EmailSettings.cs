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
