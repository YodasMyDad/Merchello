using Merchello.Core.Locality.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Shipping.Dtos;

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Full order detail for the order detail view
/// </summary>
public class OrderDetailDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime DateCreated { get; set; }
    public string Channel { get; set; } = string.Empty;
    public string? PurchaseOrder { get; set; }

    /// <summary>
    /// Source tracking information for analytics and auditing.
    /// </summary>
    public InvoiceSourceDto? Source { get; set; }

    public string CurrencyCode { get; set; } = string.Empty;
    public string CurrencySymbol { get; set; } = string.Empty;
    public string StoreCurrencyCode { get; set; } = string.Empty;
    public string StoreCurrencySymbol { get; set; } = string.Empty;

    public decimal? PricingExchangeRate { get; set; }
    public string? PricingExchangeRateSource { get; set; }
    public DateTime? PricingExchangeRateTimestampUtc { get; set; }

    // Financial
    public decimal SubTotal { get; set; }
    /// <summary>
    /// Total discount amount (always positive)
    /// </summary>
    public decimal DiscountTotal { get; set; }
    /// <summary>
    /// Individual discount line items for display
    /// </summary>
    public List<DiscountLineItemDto> Discounts { get; set; } = [];
    public decimal ShippingCost { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }

    public decimal? SubTotalInStoreCurrency { get; set; }
    public decimal? DiscountTotalInStoreCurrency { get; set; }
    public decimal? ShippingCostInStoreCurrency { get; set; }
    public decimal? TaxInStoreCurrency { get; set; }
    public decimal? TotalInStoreCurrency { get; set; }

    public decimal AmountPaid { get; set; }
    public decimal BalanceDue { get; set; }
    public decimal? AmountPaidInStoreCurrency { get; set; }
    public decimal? BalanceDueInStoreCurrency { get; set; }

    /// <summary>
    /// Balance status classification: "Balanced", "Underpaid", "Overpaid".
    /// Calculated by backend to avoid frontend logic duplication from comparing balanceDue values.
    /// </summary>
    public string BalanceStatus { get; set; } = "Balanced";

    /// <summary>
    /// CSS class for balance status styling (e.g., "balanced", "underpaid", "overpaid").
    /// Calculated by backend to avoid frontend logic duplication.
    /// </summary>
    public string BalanceStatusCssClass { get; set; } = "balanced";

    /// <summary>
    /// Display label for balance due row (e.g., "Balance Due", "Credit Due").
    /// Calculated by backend to avoid frontend logic duplication.
    /// </summary>
    public string BalanceStatusLabel { get; set; } = string.Empty;

    public InvoicePaymentStatus PaymentStatus { get; set; }
    public string PaymentStatusDisplay { get; set; } = string.Empty;
    public string FulfillmentStatus { get; set; } = string.Empty;

    /// <summary>
    /// CSS class for fulfillment status styling (e.g., "unfulfilled", "partial", "fulfilled").
    /// Calculated by backend to avoid frontend logic duplication.
    /// </summary>
    public string FulfillmentStatusCssClass { get; set; } = "unfulfilled";

    /// <summary>
    /// Maximum fraud/risk score across all payments (0-100 scale).
    /// </summary>
    public decimal? MaxRiskScore { get; set; }

    /// <summary>
    /// Source of the maximum risk score.
    /// </summary>
    public string? MaxRiskScoreSource { get; set; }

    /// <summary>
    /// Whether the invoice has been cancelled
    /// </summary>
    public bool IsCancelled { get; set; }

    // Addresses
    public AddressDto? BillingAddress { get; set; }
    public AddressDto? ShippingAddress { get; set; }

    // Orders (fulfillment units)
    public List<FulfillmentOrderDto> Orders { get; set; } = [];

    // Timeline/Notes
    public List<InvoiceNoteDto> Notes { get; set; } = [];

    /// <summary>
    /// Total number of items in the order (sum of line item quantities).
    /// Calculated by backend to avoid frontend logic duplication.
    /// </summary>
    public int ItemCount { get; set; }

    /// <summary>
    /// Count of orders with the same billing email (for customer order history)
    /// </summary>
    public int CustomerOrderCount { get; set; }

    /// <summary>
    /// Whether the invoice can be fulfilled (has unfulfilled items and is not cancelled).
    /// Calculated by backend to avoid frontend logic duplication.
    /// </summary>
    public bool CanFulfill { get; set; }

    /// <summary>
    /// Payment due date for account customers with payment terms.
    /// Null means payment is due immediately.
    /// </summary>
    public DateTime? DueDate { get; set; }

    /// <summary>
    /// Whether the invoice is overdue (DueDate has passed and balance is outstanding).
    /// Computed at mapping time.
    /// </summary>
    public bool IsOverdue { get; set; }

    /// <summary>
    /// Days until due date (negative if overdue).
    /// Computed at mapping time.
    /// </summary>
    public int? DaysUntilDue { get; set; }
}
