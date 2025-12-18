namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Result DTO after applying a promotional discount to an invoice.
/// </summary>
public class ApplyDiscountResultDto
{
    /// <summary>
    /// Whether the discount was successfully applied.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if the operation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// The new invoice total after applying the discount.
    /// </summary>
    public decimal? NewTotal { get; set; }
}
