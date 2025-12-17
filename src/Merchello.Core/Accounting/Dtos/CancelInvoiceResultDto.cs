namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Result of cancelling an invoice
/// </summary>
public class CancelInvoiceResultDto
{
    /// <summary>
    /// Whether the cancellation was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Number of orders that were cancelled
    /// </summary>
    public int CancelledOrderCount { get; set; }

    /// <summary>
    /// Error message if cancellation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}
