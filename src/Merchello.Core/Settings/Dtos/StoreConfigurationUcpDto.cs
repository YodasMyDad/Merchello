namespace Merchello.Core.Settings.Dtos;

public class StoreConfigurationUcpDto
{
    public string? TermsUrl { get; set; }

    public string? PrivacyUrl { get; set; }

    /// <summary>
    /// Overrides ProtocolSettings.PublicBaseUrl when set.
    /// </summary>
    public string? PublicBaseUrl { get; set; }

    /// <summary>
    /// Overrides UcpSettings.AllowedAgents when set. Null = use appsettings default.
    /// </summary>
    public List<string>? AllowedAgents { get; set; }

    public bool? CapabilityCheckout { get; set; }

    public bool? CapabilityOrder { get; set; }

    public bool? CapabilityIdentityLinking { get; set; }

    public bool? ExtensionDiscount { get; set; }

    public bool? ExtensionFulfillment { get; set; }

    public bool? ExtensionBuyerConsent { get; set; }

    public bool? ExtensionAp2Mandates { get; set; }

    public int? WebhookTimeoutSeconds { get; set; }
}
