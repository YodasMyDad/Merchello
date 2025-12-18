namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Parameters for applying a promotional discount to an invoice
/// </summary>
public class ApplyPromotionalDiscountParameters
{
    /// <summary>
    /// The invoice ID to apply the discount to
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// The promotional discount ID to apply
    /// </summary>
    public required Guid DiscountId { get; init; }

    /// <summary>
    /// Optional author user ID (for audit trail)
    /// </summary>
    public Guid? AuthorId { get; init; }

    /// <summary>
    /// Optional author name (defaults to "System" if not provided)
    /// </summary>
    public string? AuthorName { get; init; }
}
