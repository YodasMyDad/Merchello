namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO to create a new variant
/// </summary>
public class CreateVariantDto
{
    public string? Name { get; set; }
    public string? Sku { get; set; }
    public string? Gtin { get; set; }
    public decimal Price { get; set; }
    public decimal CostOfGoods { get; set; }
    public bool AvailableForPurchase { get; set; } = true;
    public bool CanPurchase { get; set; } = true;
}
