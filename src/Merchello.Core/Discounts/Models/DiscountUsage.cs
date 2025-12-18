using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Tracks usage of a discount for limits and reporting.
/// </summary>
public class DiscountUsage
{
    /// <summary>
    /// Unique identifier for the usage record.
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The discount that was used.
    /// </summary>
    public Guid DiscountId { get; set; }

    /// <summary>
    /// The invoice the discount was applied to.
    /// </summary>
    public Guid InvoiceId { get; set; }

    /// <summary>
    /// The customer who used the discount (optional for anonymous checkouts).
    /// </summary>
    public Guid? CustomerId { get; set; }

    /// <summary>
    /// The discount amount in the order's currency.
    /// </summary>
    public decimal DiscountAmount { get; set; }

    /// <summary>
    /// The discount amount converted to store currency for reporting.
    /// </summary>
    public decimal DiscountAmountInStoreCurrency { get; set; }

    /// <summary>
    /// The currency code of the order.
    /// </summary>
    public string CurrencyCode { get; set; } = string.Empty;

    /// <summary>
    /// When the discount was used (UTC).
    /// </summary>
    public DateTime DateUsed { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property to the parent discount.
    /// </summary>
    public virtual Discount Discount { get; set; } = null!;
}
