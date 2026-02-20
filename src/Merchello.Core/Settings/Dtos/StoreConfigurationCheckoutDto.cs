namespace Merchello.Core.Settings.Dtos;

public class StoreConfigurationCheckoutDto
{
    public Guid? HeaderBackgroundImageMediaKey { get; set; }

    public string? HeaderBackgroundImageUrl { get; set; }

    public string? HeaderBackgroundColor { get; set; }

    public string LogoPosition { get; set; } = "Left";

    public int LogoMaxWidth { get; set; } = 200;

    public string PrimaryColor { get; set; } = "#000000";

    public string AccentColor { get; set; } = "#0066FF";

    public string BackgroundColor { get; set; } = "#FFFFFF";

    public string TextColor { get; set; } = "#333333";

    public string ErrorColor { get; set; } = "#DC2626";

    public string HeadingFontFamily { get; set; } = "system-ui";

    public string BodyFontFamily { get; set; } = "system-ui";

    public bool ShowExpressCheckout { get; set; } = true;

    public bool BillingPhoneRequired { get; set; } = true;

    public string? ConfirmationRedirectUrl { get; set; }

    public string? CustomScriptUrl { get; set; }

    public StoreConfigurationOrderTermsDto OrderTerms { get; set; } = new();
}
