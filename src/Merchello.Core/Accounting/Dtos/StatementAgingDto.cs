namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Aging breakdown showing how long invoices have been outstanding.
/// </summary>
public record StatementAgingDto
{
    /// <summary>
    /// Amount due within 30 days (current).
    /// </summary>
    public required decimal Current { get; init; }

    /// <summary>
    /// Amount 31-60 days overdue.
    /// </summary>
    public required decimal ThirtyPlus { get; init; }

    /// <summary>
    /// Amount 61-90 days overdue.
    /// </summary>
    public required decimal SixtyPlus { get; init; }

    /// <summary>
    /// Amount over 90 days overdue.
    /// </summary>
    public required decimal NinetyPlus { get; init; }

    /// <summary>
    /// Total outstanding balance.
    /// </summary>
    public required decimal Total { get; init; }
}
