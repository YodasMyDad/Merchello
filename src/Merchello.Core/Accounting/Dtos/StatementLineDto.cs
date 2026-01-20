namespace Merchello.Core.Accounting.Dtos;

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
