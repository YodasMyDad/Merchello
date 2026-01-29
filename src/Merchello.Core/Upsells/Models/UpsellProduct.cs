namespace Merchello.Core.Upsells.Models;

/// <summary>
/// A product recommended by the upsell engine.
/// </summary>
public class UpsellProduct
{
    public Guid ProductId { get; set; }
    public Guid ProductRootId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Sku { get; set; }

    // Pricing - follows DisplayPricesIncTax setting
    public decimal Price { get; set; }
    public string FormattedPrice { get; set; } = string.Empty;
    public bool PriceIncludesTax { get; set; }
    public decimal TaxRate { get; set; }
    public decimal? TaxAmount { get; set; }
    public string? FormattedTaxAmount { get; set; }

    // Sale pricing
    public bool OnSale { get; set; }
    public decimal? PreviousPrice { get; set; }
    public string? FormattedPreviousPrice { get; set; }

    // Product info
    public string? Url { get; set; }
    public List<string> Images { get; set; } = [];
    public string? ProductTypeName { get; set; }
    public bool AvailableForPurchase { get; set; }

    // Variants (for products with options like Size, Color)
    public bool HasVariants { get; set; }
    public List<UpsellVariant>? Variants { get; set; }
}
