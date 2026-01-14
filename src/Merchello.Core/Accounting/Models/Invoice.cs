using Merchello.Core.Locality.Models;
using Merchello.Core.Payments.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Accounting.Models;

public class Invoice
{
    /// <summary>
    /// Basket Id
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The customer who placed this order (required).
    /// Customers are auto-created during checkout based on billing email.
    /// </summary>
    public Guid CustomerId { get; set; }

    /// <summary>
    /// The basket this invoice was created from (null for draft orders).
    /// Used to find existing unpaid invoices when a customer returns to checkout,
    /// preventing duplicate "ghost" invoices.
    /// </summary>
    public Guid? BasketId { get; set; }

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
    /// Customer's purchase order number/reference
    /// </summary>
    public string? PurchaseOrder { get; set; }

    /// <summary>
    /// Line items on this invoice
    /// </summary>
    public virtual ICollection<Order>? Orders { get; set; }

    /// <summary>
    /// Payments on this invoice
    /// </summary>
    public virtual ICollection<Payment>? Payments { get; set; }

    /// <summary>
    /// Notes about the invoice including any actions/changes on it
    /// </summary>
    public List<InvoiceNote> Notes { get; set; } = [];

    /// <summary>
    /// Holds the sub total of the basket
    /// </summary>
    public decimal SubTotal { get; set; }

    /// <summary>
    /// Customer's currency (what they see/pay) - ISO 4217.
    /// </summary>
    public string CurrencyCode { get; set; } = "USD";

    /// <summary>
    /// Snapshot currency symbol for display convenience.
    /// </summary>
    public string CurrencySymbol { get; set; } = "$";

    /// <summary>
    /// Store currency snapshot (protects reporting if store settings ever change) - ISO 4217.
    /// </summary>
    public string StoreCurrencyCode { get; set; } = "USD";

    /// <summary>
    /// Pricing FX rate locked for the order (presentment -> store).
    /// </summary>
    public decimal? PricingExchangeRate { get; set; }

    /// <summary>
    /// Pricing FX rate source identifier (e.g. "frankfurter", "manual").
    /// </summary>
    public string? PricingExchangeRateSource { get; set; }

    /// <summary>
    /// UTC timestamp when PricingExchangeRate was locked.
    /// </summary>
    public DateTime? PricingExchangeRateTimestampUtc { get; set; }

    /// <summary>
    /// Holds any discount amount one the invoice as a whole
    /// </summary>
    public decimal Discount { get; set; }

    /// <summary>
    /// Store currency equivalent of SubTotal (for reporting).
    /// </summary>
    public decimal? SubTotalInStoreCurrency { get; set; }

    /// <summary>
    /// Store currency equivalent of Discount (for reporting).
    /// </summary>
    public decimal? DiscountInStoreCurrency { get; set; }

    /// <summary>
    /// Subtotal after discounts are applied
    /// </summary>
    public decimal AdjustedSubTotal { get; set; }

    /// <summary>
    /// Holds any tax amount on the invoice as a whole
    /// </summary>
    public decimal Tax { get; set; }

    /// <summary>
    /// Store currency equivalent of Tax (for reporting).
    /// </summary>
    public decimal? TaxInStoreCurrency { get; set; }

    /// <summary>
    /// Holds the Total of the invoice
    /// </summary>
    public decimal Total { get; set; }

    /// <summary>
    /// Store currency equivalent of Total (for reporting).
    /// </summary>
    public decimal? TotalInStoreCurrency { get; set; }

    /// <summary>
    /// Date invoice was created
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date invoice was last updated
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Payment due date for account customers with payment terms.
    /// Null means payment is due immediately (standard customer).
    /// Set automatically from Customer.PaymentTermsDays when invoice is created.
    /// </summary>
    public DateTime? DueDate { get; set; }

    /// <summary>
    /// Whether the invoice has been soft-deleted
    /// </summary>
    public bool IsDeleted { get; set; }

    /// <summary>
    /// Date the invoice was soft-deleted (null if not deleted)
    /// </summary>
    public DateTime? DateDeleted { get; set; }

    /// <summary>
    /// Whether the invoice has been cancelled
    /// </summary>
    public bool IsCancelled { get; set; }

    /// <summary>
    /// Date the invoice was cancelled (null if not cancelled)
    /// </summary>
    public DateTime? DateCancelled { get; set; }

    /// <summary>
    /// Reason for cancellation
    /// </summary>
    public string? CancellationReason { get; set; }

    /// <summary>
    /// Name of the user who cancelled the invoice
    /// </summary>
    public string? CancelledBy { get; set; }

    /// <summary>
    /// General-purpose extended data for storing additional invoice data.
    /// Used for payment links, custom metadata, and integration data.
    /// </summary>
    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
