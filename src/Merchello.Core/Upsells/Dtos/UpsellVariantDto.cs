namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Variant option for a recommended product.
/// </summary>
public class UpsellVariantDto
{
    public Guid ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public decimal Price { get; set; }
    public string FormattedPrice { get; set; } = string.Empty;
    public bool AvailableForPurchase { get; set; }
}
