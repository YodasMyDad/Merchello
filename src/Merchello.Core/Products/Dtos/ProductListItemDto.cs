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

    public int VariantCount { get; set; }

    public string ProductTypeName { get; set; } = string.Empty;

    public List<string> CollectionNames { get; set; } = [];

    public string? ImageUrl { get; set; }

    /// <summary>
    /// Whether this product has at least one warehouse assigned (via ProductRootWarehouse)
    /// </summary>
    public bool HasWarehouse { get; set; }

    /// <summary>
    /// Whether any assigned warehouse has shipping options configured
    /// </summary>
    public bool HasShippingOptions { get; set; }

    /// <summary>
    /// Whether this is a digital product that doesn't require shipping
    /// </summary>
    public bool IsDigitalProduct { get; set; }
}
