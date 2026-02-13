namespace Merchello.Core.Tax.Providers.Models;

/// <summary>
/// Represents a line item for tax calculation.
/// </summary>
public class TaxableLineItem
{
    /// <summary>
    /// Optional source line item id for deterministic mapping.
    /// </summary>
    public Guid? LineItemId { get; init; }

    /// <summary>
    /// Product SKU.
    /// </summary>
    public required string Sku { get; init; }

    /// <summary>
    /// Product or line item name.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Unit price amount.
    /// </summary>
    public required decimal Amount { get; init; }

    /// <summary>
    /// Quantity of items.
    /// </summary>
    public required int Quantity { get; init; }

    /// <summary>
    /// Tax group/category id for rate lookup.
    /// </summary>
    public Guid? TaxGroupId { get; init; }

    /// <summary>
    /// Provider-specific tax code (for example, Avalara tax code).
    /// </summary>
    public string? TaxCode { get; init; }

    /// <summary>
    /// Whether this line belongs to a taxable category.
    /// A zero tax rate can still be taxable for proportional shipping rules.
    /// </summary>
    public bool IsTaxable { get; init; } = true;

    /// <summary>
    /// Extended data for provider-specific requirements.
    /// </summary>
    public Dictionary<string, string>? ExtendedData { get; init; }
}
