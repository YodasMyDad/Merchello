namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Product option value for the product detail view
/// </summary>
public class ProductOptionValueDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public int SortOrder { get; set; }
    public string? HexValue { get; set; }
    public Guid? MediaKey { get; set; }
    public decimal PriceAdjustment { get; set; }
    public decimal CostAdjustment { get; set; }
    public string? SkuSuffix { get; set; }
}
