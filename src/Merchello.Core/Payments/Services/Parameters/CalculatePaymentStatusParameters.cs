using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Payments.Services.Parameters;

/// <summary>
/// Parameters for calculating payment status
/// </summary>
public class CalculatePaymentStatusParameters
{
    /// <summary>
    /// The payments to analyze
    /// </summary>
    public required IEnumerable<Payment> Payments { get; init; }

    /// <summary>
    /// The invoice total amount
    /// </summary>
    public required decimal InvoiceTotal { get; init; }

    /// <summary>
    /// The invoice currency code for proper rounding
    /// </summary>
    public required string CurrencyCode { get; init; }

    /// <summary>
    /// Optional invoice total in store currency (for multi-currency scenarios)
    /// </summary>
    public decimal? InvoiceTotalInStoreCurrency { get; init; }

    /// <summary>
    /// Optional store currency code (defaults to store setting if not provided)
    /// </summary>
    public string? StoreCurrencyCode { get; init; }
}
