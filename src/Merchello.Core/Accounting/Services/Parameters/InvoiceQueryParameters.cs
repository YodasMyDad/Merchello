namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Query parameters for filtering and paging invoices
/// </summary>
public class InvoiceQueryParameters
{
    /// <summary>
    /// Current page number (1-based)
    /// </summary>
    public int CurrentPage { get; set; } = 1;

    /// <summary>
    /// Number of items per page
    /// </summary>
    public int AmountPerPage { get; set; } = 50;

    /// <summary>
    /// Whether to use no-tracking queries for better performance
    /// </summary>
    public bool NoTracking { get; set; } = true;

    /// <summary>
    /// Sort order for results
    /// </summary>
    public InvoiceOrderBy OrderBy { get; set; } = InvoiceOrderBy.DateDesc;

    /// <summary>
    /// Filter by payment status (paid/unpaid)
    /// </summary>
    public InvoicePaymentStatusFilter? PaymentStatusFilter { get; set; }

    /// <summary>
    /// Filter by fulfillment status (fulfilled/unfulfilled)
    /// </summary>
    public InvoiceFulfillmentStatusFilter? FulfillmentStatusFilter { get; set; }

    /// <summary>
    /// Search text to filter invoices. Searches across:
    /// - Invoice number
    /// - Billing address: name, postal code, email
    /// - Shipping address: name, postal code, email
    /// </summary>
    public string? Search { get; set; }

    /// <summary>
    /// Filter by specific customer ID
    /// </summary>
    public Guid? CustomerId { get; set; }

    /// <summary>
    /// Filter by sales channel (e.g., "Online Store", "POS")
    /// </summary>
    public string? Channel { get; set; }

    /// <summary>
    /// Filter invoices created on or after this date
    /// </summary>
    public DateTime? DateFrom { get; set; }

    /// <summary>
    /// Filter invoices created on or before this date
    /// </summary>
    public DateTime? DateTo { get; set; }

    /// <summary>
    /// Whether to include soft-deleted invoices in results.
    /// Defaults to false (deleted invoices are excluded).
    /// </summary>
    public bool IncludeDeleted { get; set; }
}

