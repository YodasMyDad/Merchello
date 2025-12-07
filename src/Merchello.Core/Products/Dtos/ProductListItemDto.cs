namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Product list item for the admin backoffice grid view
/// </summary>
public class ProductListItemDto
{
    public Guid Id { get; set; }

    public Guid ProductRootId { get; set; }

    public string RootName { get; set; } = string.Empty;

    public string? Sku { get; set; }

    public decimal Price { get; set; }

    public decimal? MinPrice { get; set; }

    public decimal? MaxPrice { get; set; }

    public bool Purchaseable { get; set; }

    public int TotalStock { get; set; }

    public int VariantCount { get; set; }

    public string ProductTypeName { get; set; } = string.Empty;

    public List<string> CategoryNames { get; set; } = [];

    public string? ImageUrl { get; set; }
}
