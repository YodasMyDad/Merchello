namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Product recommendation for storefront display.
/// </summary>
public class UpsellProductDto
{
    public Guid ProductId { get; set; }
    public Guid ProductRootId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Sku { get; set; }
    public decimal Price { get; set; }
    public string FormattedPrice { get; set; } = string.Empty;
    public bool PriceIncludesTax { get; set; }
    public decimal TaxRate { get; set; }
    public decimal? TaxAmount { get; set; }
    public string? FormattedTaxAmount { get; set; }
    public bool OnSale { get; set; }
    public decimal? PreviousPrice { get; set; }
    public string? FormattedPreviousPrice { get; set; }
    public string? Url { get; set; }
    public string? ImageUrl { get; set; }
    public string? ProductTypeName { get; set; }
    public bool AvailableForPurchase { get; set; }
    public bool HasVariants { get; set; }
    public List<UpsellVariantDto>? Variants { get; set; }
}
