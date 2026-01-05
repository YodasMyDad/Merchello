using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Tracks individual discount usage instances for atomic usage limit enforcement.
/// Each record represents one use of a discount on an invoice.
/// </summary>
public class DiscountUsage
{
    /// <summary>
    /// Unique identifier for this usage record.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// The discount that was used.
    /// </summary>
    public Guid DiscountId { get; set; }

    /// <summary>
    /// Navigation property to the discount.
    /// </summary>
    public virtual Discount Discount { get; set; } = null!;

    /// <summary>
    /// The invoice where this discount was applied.
    /// Unique constraint on (DiscountId, InvoiceId) prevents duplicate applications.
    /// </summary>
    public Guid InvoiceId { get; set; }

    /// <summary>
    /// Navigation property to the invoice.
    /// </summary>
    public virtual Invoice Invoice { get; set; } = null!;

    /// <summary>
    /// The customer who used the discount (if known).
    /// Used for per-customer usage limit enforcement.
    /// </summary>
    public Guid? CustomerId { get; set; }

    /// <summary>
    /// The amount of the discount that was applied.
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// When this usage was recorded.
    /// </summary>
    public DateTime DateCreated { get; set; }
}
