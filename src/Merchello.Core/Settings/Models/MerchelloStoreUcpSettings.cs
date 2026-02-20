namespace Merchello.Core.Settings.Models;

/// <summary>
/// UCP-specific settings stored in the database, overlaid on top of appsettings defaults.
/// Null values indicate "use the appsettings default".
/// </summary>
public class MerchelloStoreUcpSettings
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

    /// <summary>Overrides UcpCapabilitySettings.Checkout. Null = use appsettings default.</summary>
    public bool? CapabilityCheckout { get; set; }

    /// <summary>Overrides UcpCapabilitySettings.Order. Null = use appsettings default.</summary>
    public bool? CapabilityOrder { get; set; }

    /// <summary>Overrides UcpCapabilitySettings.IdentityLinking. Null = use appsettings default.</summary>
    public bool? CapabilityIdentityLinking { get; set; }

    /// <summary>Overrides UcpExtensionSettings.Discount. Null = use appsettings default.</summary>
    public bool? ExtensionDiscount { get; set; }

    /// <summary>Overrides UcpExtensionSettings.Fulfillment. Null = use appsettings default.</summary>
    public bool? ExtensionFulfillment { get; set; }

    /// <summary>Overrides UcpExtensionSettings.BuyerConsent. Null = use appsettings default.</summary>
    public bool? ExtensionBuyerConsent { get; set; }

    /// <summary>Overrides UcpExtensionSettings.Ap2Mandates. Null = use appsettings default.</summary>
    public bool? ExtensionAp2Mandates { get; set; }

    /// <summary>Overrides UcpSettings.WebhookTimeoutSeconds. Null = use appsettings default.</summary>
    public int? WebhookTimeoutSeconds { get; set; }
}
