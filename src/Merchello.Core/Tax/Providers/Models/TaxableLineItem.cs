namespace Merchello.Core.Tax.Providers.Models;

/// <summary>
/// Represents a line item for tax calculation.
/// </summary>
public class TaxableLineItem
{
    /// <summary>
    /// Product SKU.
    /// </summary>
    public required string Sku { get; init; }

    /// <summary>
    /// Product/line item name.
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
    /// Tax group/category ID for rate lookup.
    /// </summary>
    public Guid? TaxGroupId { get; init; }

    /// <summary>
    /// Provider-specific tax code (e.g., Avalara tax code).
    /// </summary>
    public string? TaxCode { get; init; }

    /// <summary>
    /// Whether this item is taxable.
    /// </summary>
    public bool IsTaxable { get; init; } = true;

    /// <summary>
    /// Extended data for provider-specific requirements.
    /// </summary>
    public Dictionary<string, string>? ExtendedData { get; init; }
}
