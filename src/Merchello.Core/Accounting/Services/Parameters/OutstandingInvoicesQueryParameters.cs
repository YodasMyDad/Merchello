namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Parameters for querying outstanding invoices.
/// </summary>
public class OutstandingInvoicesQueryParameters
{
    /// <summary>
    /// Optional customer ID to filter by.
    /// </summary>
    public Guid? CustomerId { get; set; }

    /// <summary>
    /// When true, only show invoices for customers with HasAccountTerms = true.
    /// Default is true (account customers only).
    /// </summary>
    public bool AccountCustomersOnly { get; set; } = true;

    /// <summary>
    /// Filter by overdue status.
    /// Null = all, true = overdue only, false = not overdue only.
    /// </summary>
    public bool? OverdueOnly { get; set; }

    /// <summary>
    /// Filter invoices due within this many days from now.
    /// </summary>
    public int? DueWithinDays { get; set; }

    /// <summary>
    /// Page number (1-based).
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Page size (max 200).
    /// </summary>
    public int PageSize { get; set; } = 50;

    /// <summary>
    /// Sort by field: "dueDate" (default), "total", "customer", "invoiceNumber".
    /// </summary>
    public string SortBy { get; set; } = "dueDate";

    /// <summary>
    /// Sort direction: "asc" (default - oldest due first) or "desc".
    /// </summary>
    public string SortDirection { get; set; } = "asc";

    /// <summary>
    /// Optional search term (invoice number or customer name/email).
    /// </summary>
    public string? Search { get; set; }
}
