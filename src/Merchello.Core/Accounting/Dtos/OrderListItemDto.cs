using Merchello.Core.Payments.Models;

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Order list item for the orders grid view
/// </summary>
public class OrderListItemDto
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime DateCreated { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;

    /// <summary>
    /// Source type identifier (e.g., "web", "ucp", "api", "pos").
    /// </summary>
    public string? SourceType { get; set; }

    /// <summary>
    /// Source name/label for display (e.g., agent name, API key name).
    /// </summary>
    public string? SourceName { get; set; }

    /// <summary>
    /// Presentment currency (invoice currency).
    /// </summary>
    public string CurrencyCode { get; set; } = string.Empty;
    public string CurrencySymbol { get; set; } = string.Empty;

    /// <summary>
    /// Store currency snapshot for reporting/admin display.
    /// </summary>
    public string StoreCurrencyCode { get; set; } = string.Empty;
    public string StoreCurrencySymbol { get; set; } = string.Empty;

    public decimal Total { get; set; }
    public decimal? TotalInStoreCurrency { get; set; }
    public bool IsMultiCurrency { get; set; }
    public InvoicePaymentStatus PaymentStatus { get; set; }
    public string PaymentStatusDisplay { get; set; } = string.Empty;
    public string PaymentStatusCssClass { get; set; } = "unpaid";
    public string FulfillmentStatus { get; set; } = string.Empty;
    public bool IsCancelled { get; set; }
    public int ItemCount { get; set; }
    public string DeliveryStatus { get; set; } = string.Empty;
    public string DeliveryMethod { get; set; } = string.Empty;

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
