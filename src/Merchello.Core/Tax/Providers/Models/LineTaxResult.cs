namespace Merchello.Core.Tax.Providers.Models;

/// <summary>
/// Tax calculation result for a single line item.
/// </summary>
public class LineTaxResult
{
    /// <summary>
    /// SKU of the line item.
    /// </summary>
    public required string Sku { get; init; }

    /// <summary>
    /// Tax rate percentage (0-100).
    /// </summary>
    public decimal TaxRate { get; init; }

    /// <summary>
    /// Calculated tax amount for this line.
    /// </summary>
    public decimal TaxAmount { get; init; }

    /// <summary>
    /// Whether tax was applied to this line.
    /// </summary>
    public bool IsTaxable { get; init; } = true;

    /// <summary>
    /// Jurisdiction or region where tax was calculated.
    /// </summary>
    public string? TaxJurisdiction { get; init; }

    /// <summary>
    /// Extended data from the provider (e.g., breakdown by tax type).
    /// </summary>
    public Dictionary<string, string>? ExtendedData { get; init; }
}
