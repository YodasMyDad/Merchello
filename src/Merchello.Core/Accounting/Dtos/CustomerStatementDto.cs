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

/// <summary>
/// A single line item on a statement (invoice or payment).
/// </summary>
public record StatementLineDto
{
    /// <summary>
    /// Date of the transaction.
    /// </summary>
    public required DateTime Date { get; init; }

    /// <summary>
    /// Type of transaction: "Invoice" or "Payment".
    /// </summary>
    public required string Type { get; init; }

    /// <summary>
    /// Reference number (invoice number or payment reference).
    /// </summary>
    public required string Reference { get; init; }

    /// <summary>
    /// Description of the transaction.
    /// </summary>
    public required string Description { get; init; }

    /// <summary>
    /// Amount debited (for invoices). Null for payments.
    /// </summary>
    public decimal? Debit { get; init; }

    /// <summary>
    /// Amount credited (for payments). Null for invoices.
    /// </summary>
    public decimal? Credit { get; init; }

    /// <summary>
    /// Running balance after this transaction.
    /// </summary>
    public required decimal Balance { get; init; }
}

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

/// <summary>
/// Simplified address DTO for statements.
/// </summary>
public record StatementAddressDto
{
    public string? Company { get; init; }
    public string? AddressLine1 { get; init; }
    public string? AddressLine2 { get; init; }
    public string? City { get; init; }
    public string? Region { get; init; }
    public string? PostalCode { get; init; }
    public string? Country { get; init; }
}
