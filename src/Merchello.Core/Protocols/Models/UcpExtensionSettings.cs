namespace Merchello.Core.Protocols.Models;

/// <summary>
/// UCP extension toggles.
/// </summary>
public class UcpExtensionSettings
{
    /// <summary>
    /// Enable Discount extension.
    /// </summary>
    public bool Discount { get; set; } = true;

    /// <summary>
    /// Enable Fulfillment extension.
    /// </summary>
    public bool Fulfillment { get; set; } = true;

    /// <summary>
    /// Enable Buyer Consent extension.
    /// </summary>
    public bool BuyerConsent { get; set; } = false;

    /// <summary>
    /// Enable AP2 Mandates extension.
    /// </summary>
    public bool Ap2Mandates { get; set; } = false;
}
