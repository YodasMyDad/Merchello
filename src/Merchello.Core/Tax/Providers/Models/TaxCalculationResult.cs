using Merchello.Core.Shared.Models;

namespace Merchello.Core.Tax.Providers.Models;

/// <summary>
/// Result from a tax calculation request.
/// </summary>
public class TaxCalculationResult : IResult
{
    /// <summary>
    /// Whether the calculation succeeded.
    /// </summary>
    public bool Success { get; init; }

    /// <summary>
    /// Error message if calculation failed.
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Total tax amount across all line items.
    /// </summary>
    public decimal TotalTax { get; init; }

    /// <summary>
    /// Tax on shipping (if applicable).
    /// </summary>
    public decimal ShippingTax { get; init; }

    /// <summary>
    /// Per-line tax results.
    /// </summary>
    public List<LineTaxResult> LineResults { get; init; } = [];

    /// <summary>
    /// Provider-specific transaction ID for audit/reference.
    /// </summary>
    public string? TransactionId { get; init; }

    /// <summary>
    /// Creates a successful result.
    /// </summary>
    public static TaxCalculationResult Successful(
        decimal totalTax,
        List<LineTaxResult> lineResults,
        decimal shippingTax = 0,
        string? transactionId = null) => new()
    {
        Success = true,
        TotalTax = totalTax,
        LineResults = lineResults,
        ShippingTax = shippingTax,
        TransactionId = transactionId
    };

    /// <summary>
    /// Creates a failed result.
    /// </summary>
    public static TaxCalculationResult Failed(string errorMessage) => new()
    {
        Success = false,
        ErrorMessage = errorMessage
    };

    /// <summary>
    /// Creates a zero-tax result (e.g., tax-exempt or no rates configured).
    /// </summary>
    public static TaxCalculationResult ZeroTax(List<TaxableLineItem> lineItems) => new()
    {
        Success = true,
        TotalTax = 0,
        LineResults = lineItems.Select(li => new LineTaxResult
        {
            Sku = li.Sku,
            TaxRate = 0,
            TaxAmount = 0,
            IsTaxable = false
        }).ToList()
    };
}
