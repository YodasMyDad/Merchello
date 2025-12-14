namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Product option for the product detail view
/// </summary>
public class ProductOptionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Alias { get; set; }
    public int SortOrder { get; set; }
    public string? OptionTypeAlias { get; set; }
    public string? OptionUiAlias { get; set; }
    public bool IsVariant { get; set; }
    public List<ProductOptionValueDto> Values { get; set; } = [];
}
