namespace Merchello.Core.Settings.Models;

public class MerchelloStorePoliciesSettings
{
    /// <summary>
    /// TipTap payload JSON (markup + blocks) for terms content.
    /// </summary>
    public string? TermsContent { get; set; }

    /// <summary>
    /// TipTap payload JSON (markup + blocks) for privacy content.
    /// </summary>
    public string? PrivacyContent { get; set; }
}
