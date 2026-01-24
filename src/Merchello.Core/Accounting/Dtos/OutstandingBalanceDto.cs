namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Outstanding balance summary for a customer.
/// All credit-related properties are computed dynamically - never stored.
/// </summary>
public record OutstandingBalanceDto
{
    /// <summary>
    /// Total outstanding balance across all unpaid invoices.
    /// </summary>
    public required decimal TotalOutstanding { get; init; }

    /// <summary>
    /// Total overdue balance (invoices past due date).
    /// </summary>
    public required decimal TotalOverdue { get; init; }

    /// <summary>
    /// Number of invoices with outstanding balance.
    /// </summary>
    public required int InvoiceCount { get; init; }

    /// <summary>
    /// Number of invoices that are past due date.
    /// </summary>
    public required int OverdueCount { get; init; }

    /// <summary>
    /// Next payment due date across all outstanding invoices.
    /// </summary>
    public DateTime? NextDueDate { get; init; }

    /// <summary>
    /// Currency code for the amounts.
    /// </summary>
    public required string CurrencyCode { get; init; }

    /// <summary>
    /// Customer's credit limit (from Customer model).
    /// </summary>
    public decimal? CreditLimit { get; init; }

    /// <summary>
    /// Whether the customer has exceeded their credit limit.
    /// Computed property - never stored.
    /// </summary>
    public bool CreditLimitExceeded => CreditLimit.HasValue && TotalOutstanding > CreditLimit.Value;

    /// <summary>
    /// Available credit (credit limit minus outstanding balance).
    /// Computed property - never stored.
    /// </summary>
    public decimal? AvailableCredit => CreditLimit.HasValue ? Math.Max(0, CreditLimit.Value - TotalOutstanding) : null;

    /// <summary>
    /// Credit utilization percentage (0-100+).
    /// Can exceed 100 if over limit.
    /// Computed property - never stored.
    /// </summary>
    public decimal? CreditUtilizationPercent => CreditLimit.HasValue && CreditLimit.Value > 0
        ? Math.Round((TotalOutstanding / CreditLimit.Value) * 100, 2)
        : null;

    /// <summary>
    /// Credit warning level: "ok", "warning" (>=80% utilized), "exceeded" (over limit).
    /// Computed property - never stored.
    /// </summary>
    public string CreditWarningLevel => CreditLimitExceeded ? "exceeded"
        : CreditUtilizationPercent >= 80 ? "warning"
        : "ok";
}
