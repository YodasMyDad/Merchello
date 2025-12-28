namespace Merchello.Core.Checkout.Models;

/// <summary>
/// Configuration settings for the Merchello checkout.
/// Configured via appsettings.json under "Merchello:Checkout".
/// </summary>
public class CheckoutSettings
{
    // === Header/Banner ===

    /// <summary>
    /// Banner image URL (1000x400px recommended).
    /// </summary>
    public string? HeaderBackgroundImageUrl { get; set; }

    /// <summary>
    /// Fallback background color if no image is set.
    /// </summary>
    public string? HeaderBackgroundColor { get; set; }

    // === Logo ===

    /// <summary>
    /// Logo image URL displayed in checkout header.
    /// </summary>
    public string? LogoUrl { get; set; }

    /// <summary>
    /// Logo position in the header.
    /// </summary>
    public LogoPosition LogoPosition { get; set; } = LogoPosition.Left;

    /// <summary>
    /// Maximum width of the logo in pixels.
    /// </summary>
    public int LogoMaxWidth { get; set; } = 200;

    // === Colors ===

    /// <summary>
    /// Primary brand color (buttons, links).
    /// </summary>
    public string PrimaryColor { get; set; } = "#000000";

    /// <summary>
    /// Accent color for highlights and focus states.
    /// </summary>
    public string AccentColor { get; set; } = "#0066FF";

    /// <summary>
    /// Page background color.
    /// </summary>
    public string BackgroundColor { get; set; } = "#FFFFFF";

    /// <summary>
    /// Main text color.
    /// </summary>
    public string TextColor { get; set; } = "#333333";

    /// <summary>
    /// Error message color.
    /// </summary>
    public string ErrorColor { get; set; } = "#DC2626";

    // === Typography ===

    /// <summary>
    /// Font family for headings.
    /// </summary>
    public string HeadingFontFamily { get; set; } = "system-ui";

    /// <summary>
    /// Font family for body text.
    /// </summary>
    public string BodyFontFamily { get; set; } = "system-ui";

    // === Company Info ===

    /// <summary>
    /// Company name displayed in checkout.
    /// </summary>
    public string? CompanyName { get; set; }

    /// <summary>
    /// Support email displayed in checkout footer.
    /// </summary>
    public string? SupportEmail { get; set; }

    /// <summary>
    /// Support phone number displayed in checkout footer.
    /// </summary>
    public string? SupportPhone { get; set; }

    // === Behavior ===

    /// <summary>
    /// Whether to show express checkout buttons (Apple Pay, Google Pay, etc.).
    /// </summary>
    public bool ShowExpressCheckout { get; set; } = true;

    /// <summary>
    /// Whether phone number is required during checkout.
    /// </summary>
    public bool RequirePhone { get; set; } = false;

    /// <summary>
    /// URL to redirect to after order confirmation.
    /// If set, user is redirected with invoice number in query string.
    /// </summary>
    public string? ConfirmationRedirectUrl { get; set; }

    /// <summary>
    /// URL to terms and conditions page.
    /// </summary>
    public string? TermsUrl { get; set; }

    /// <summary>
    /// URL to privacy policy page.
    /// </summary>
    public string? PrivacyUrl { get; set; }
}

/// <summary>
/// Logo position options for checkout header.
/// </summary>
public enum LogoPosition
{
    Left,
    Center,
    Right
}
