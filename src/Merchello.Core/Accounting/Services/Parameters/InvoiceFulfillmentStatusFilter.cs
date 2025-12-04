namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Filter options for invoice fulfillment status
/// </summary>
public enum InvoiceFulfillmentStatusFilter
{
    /// <summary>
    /// Show all invoices regardless of fulfillment status
    /// </summary>
    All,

    /// <summary>
    /// Show only invoices that have been fully fulfilled/shipped
    /// </summary>
    Fulfilled,

    /// <summary>
    /// Show only invoices with unfulfilled or partially fulfilled orders
    /// </summary>
    Unfulfilled
}

