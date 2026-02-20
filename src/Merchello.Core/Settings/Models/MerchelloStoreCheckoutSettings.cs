using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Settings.Models;

public class MerchelloStoreCheckoutSettings
{
    public Guid? HeaderBackgroundImageMediaKey { get; set; }

    public string? HeaderBackgroundColor { get; set; }

    public LogoPosition LogoPosition { get; set; } = LogoPosition.Left;

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

    public OrderTermsSettings OrderTerms { get; set; } = new()
    {
        ShowCheckbox = true,
        CheckboxText = "I agree to the {terms:Terms & Conditions} and {privacy:Privacy Policy}",
        CheckboxRequired = true
    };
}
