namespace Merchello.Core.Settings.Dtos;

public class StoreConfigurationPoliciesDto
{
    /// <summary>
    /// TipTap payload JSON (markup + blocks).
    /// </summary>
    public string? TermsContent { get; set; }

    /// <summary>
    /// TipTap payload JSON (markup + blocks).
    /// </summary>
    public string? PrivacyContent { get; set; }
}
