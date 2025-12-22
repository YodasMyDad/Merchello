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
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime DateCreated { get; set; }
    public string Channel { get; set; } = string.Empty;
    public string? PurchaseOrder { get; set; }

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

    public InvoicePaymentStatus PaymentStatus { get; set; }
    public string PaymentStatusDisplay { get; set; } = string.Empty;
    public string FulfillmentStatus { get; set; } = string.Empty;

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
    /// Count of orders with the same billing email (for customer order history)
    /// </summary>
    public int CustomerOrderCount { get; set; }
}
