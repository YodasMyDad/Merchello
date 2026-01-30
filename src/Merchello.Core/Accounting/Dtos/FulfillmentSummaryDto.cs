namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Summary of fulfillment state for the entire invoice (used in fulfillment dialog)
/// </summary>
public class FulfillmentSummaryDto
{
    public Guid InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string OverallStatus { get; set; } = "Unfulfilled"; // Unfulfilled, Partial, Fulfilled
    public string OverallStatusCssClass { get; set; } = "unfulfilled";
    public List<OrderFulfillmentDto> Orders { get; set; } = [];
}
