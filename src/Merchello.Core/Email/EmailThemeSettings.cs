namespace Merchello.Core.Email;

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
