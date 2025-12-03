using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Accounting.Models;

public class Invoice
{
    /// <summary>
    /// Basket Id
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// If a customer is logged in then this will be the customers id
    /// </summary>
    public Guid? CustomerId { get; set; }

    /// <summary>
    /// Human-readable invoice number (e.g., "INV-0001")
    /// </summary>
    public string InvoiceNumber { get; set; } = string.Empty;

    /// <summary>
    /// Billing address for this invoice
    /// </summary>
    public Address BillingAddress { get; set; } = new();

    /// <summary>
    /// Shipping address for this invoice (may differ from billing)
    /// </summary>
    public Address ShippingAddress { get; set; } = new();

    /// <summary>
    /// Sales channel (e.g., "Online Store", "Shop", "POS")
    /// </summary>
    public string Channel { get; set; } = "Online Store";

    /// <summary>
    /// Line items on this invoice
    /// </summary>
    public virtual ICollection<Order>? Orders { get; set; }

    /// <summary>
    /// Payments on this invoice
    /// </summary>
    public virtual ICollection<Payment>? Payments { get; set; }

    /// <summary>
    /// Adjustments for this basket (I.e. Discounts)
    /// </summary>
    public List<Adjustment> Adjustments { get; set; } = [];

    /// <summary>
    /// Notes about the invoice including any actions/changes on it
    /// </summary>
    public List<InvoiceNote> Notes { get; set; } = [];

    /// <summary>
    /// Holds the sub total of the basket
    /// </summary>
    public decimal SubTotal { get; set; }

    /// <summary>
    /// Holds any discount amount one the invoice as a whole
    /// </summary>
    public decimal Discount { get; set; }

    /// <summary>
    /// Subtotal after discounts are applied
    /// </summary>
    public decimal AdjustedSubTotal { get; set; }

    /// <summary>
    /// Holds any tax amount on the invoice as a whole
    /// </summary>
    public decimal Tax { get; set; }

    /// <summary>
    /// Holds the Total of the invoice
    /// </summary>
    public decimal Total { get; set; }

    /// <summary>
    /// Date invoice was created
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date invoice was last updated
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;
}
