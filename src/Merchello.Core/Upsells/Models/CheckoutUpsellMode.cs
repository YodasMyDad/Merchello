using System.Text.Json.Serialization;

namespace Merchello.Core.Upsells.Models;

/// <summary>
/// Controls how upsells display within the integrated checkout.
/// Only applies when DisplayLocation includes Checkout.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CheckoutUpsellMode
{
    /// <summary>
    /// Collapsible section at top of checkout page.
    /// </summary>
    Inline,

    /// <summary>
    /// Replaces checkout content until dismissed.
    /// </summary>
    Interstitial,

    /// <summary>
    /// Checkbox upsell integrated into checkout form (non-variant or pre-selected variant).
    /// </summary>
    OrderBump,

    /// <summary>
    /// After payment, before confirmation. Requires VaultedPayments.
    /// </summary>
    PostPurchase
}
