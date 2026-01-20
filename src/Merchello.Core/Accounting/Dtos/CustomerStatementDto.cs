namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// DTO representing a customer statement with all transactions for a period.
/// </summary>
public record CustomerStatementDto
{
    /// <summary>
    /// The customer's unique identifier.
    /// </summary>
    public required Guid CustomerId { get; init; }

    /// <summary>
    /// The customer's full name.
    /// </summary>
    public required string CustomerName { get; init; }

    /// <summary>
    /// The customer's email address.
    /// </summary>
    public required string CustomerEmail { get; init; }

    /// <summary>
    /// The customer's billing address, if available.
    /// </summary>
    public StatementAddressDto? BillingAddress { get; init; }

    /// <summary>
    /// The date the statement was generated.
    /// </summary>
    public required DateTime StatementDate { get; init; }

    /// <summary>
    /// Start of the statement period.
    /// </summary>
    public required DateTime PeriodStart { get; init; }

    /// <summary>
    /// End of the statement period.
    /// </summary>
    public required DateTime PeriodEnd { get; init; }

    /// <summary>
    /// Outstanding balance at the start of the period.
    /// </summary>
    public required decimal OpeningBalance { get; init; }

    /// <summary>
    /// All transactions (invoices and payments) within the period, ordered by date.
    /// </summary>
    public required List<StatementLineDto> Lines { get; init; }

    /// <summary>
    /// Outstanding balance at the end of the period.
    /// </summary>
    public required decimal ClosingBalance { get; init; }

    /// <summary>
    /// Aging breakdown of outstanding invoices.
    /// </summary>
    public required StatementAgingDto Aging { get; init; }

    /// <summary>
    /// Currency code for all amounts (e.g., "GBP", "USD").
    /// </summary>
    public required string CurrencyCode { get; init; }

    /// <summary>
    /// Payment terms in days, if the customer has account terms.
    /// </summary>
    public int? PaymentTermsDays { get; init; }

    /// <summary>
    /// Credit limit, if the customer has one set.
    /// </summary>
    public decimal? CreditLimit { get; init; }
}
