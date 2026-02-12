namespace Merchello.Core.Upsells.Models;

/// <summary>
/// Per-surface style overrides for an upsell rule.
/// </summary>
public class UpsellDisplayStyles
{
    public UpsellSurfaceStyle? CheckoutInline { get; set; }
    public UpsellSurfaceStyle? CheckoutInterstitial { get; set; }
    public UpsellSurfaceStyle? PostPurchase { get; set; }
    public UpsellSurfaceStyle? Basket { get; set; }
    public UpsellSurfaceStyle? ProductPage { get; set; }
    public UpsellSurfaceStyle? Email { get; set; }
    public UpsellSurfaceStyle? Confirmation { get; set; }
}

