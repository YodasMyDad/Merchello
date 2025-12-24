namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Result of looking up a product variant by ID.
/// Used by property editors to detect deleted products.
/// </summary>
public class VariantLookupDto
{
    /// <summary>
    /// The requested variant ID.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Whether the variant was found in the database.
    /// </summary>
    public bool Found { get; set; }

    /// <summary>
    /// The product root ID (if found).
    /// </summary>
    public Guid? ProductRootId { get; set; }

    /// <summary>
    /// The product root name (if found).
    /// </summary>
    public string? RootName { get; set; }

    /// <summary>
    /// The variant name (if found). May contain option values like "Red / Large".
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// The variant SKU (if found).
    /// </summary>
    public string? Sku { get; set; }

    /// <summary>
    /// The variant price (if found).
    /// </summary>
    public decimal? Price { get; set; }

    /// <summary>
    /// The first image URL for the variant (if found).
    /// Falls back to root images if variant has no images.
    /// </summary>
    public string? ImageUrl { get; set; }
}
