namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Variant search result used by order-edit custom item autocomplete.
/// </summary>
public class OrderProductAutocompleteDto
{
    /// <summary>
    /// Variant ID.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Product root ID.
    /// </summary>
    public Guid ProductRootId { get; set; }

    /// <summary>
    /// Product root display name.
    /// </summary>
    public string RootName { get; set; } = string.Empty;

    /// <summary>
    /// Variant name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Variant SKU.
    /// </summary>
    public string? Sku { get; set; }

    /// <summary>
    /// Variant price.
    /// </summary>
    public decimal Price { get; set; }

    /// <summary>
    /// Variant cost of goods.
    /// </summary>
    public decimal Cost { get; set; }

    /// <summary>
    /// Product root tax group ID.
    /// </summary>
    public Guid? TaxGroupId { get; set; }

    /// <summary>
    /// Whether this item should be treated as physical in order edit.
    /// </summary>
    public bool IsPhysicalProduct { get; set; }

    /// <summary>
    /// Optional image URL (variant first, then root image).
    /// </summary>
    public string? ImageUrl { get; set; }
}
