namespace Merchello.Core.Upsells.Models;

/// <summary>
/// A variant option for a recommended product.
/// Only populated when UpsellProduct.HasVariants is true.
/// </summary>
public class UpsellVariant
{
    public Guid ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public decimal Price { get; set; }
    public string FormattedPrice { get; set; } = string.Empty;
    public bool AvailableForPurchase { get; set; }
}
