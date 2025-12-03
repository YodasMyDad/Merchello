namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Query parameters for order list
/// </summary>
public class OrderListQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string? Status { get; set; }
    public string? PaymentStatus { get; set; }
    public string? FulfillmentStatus { get; set; }
    public string? Search { get; set; }
    public string SortBy { get; set; } = "date";
    public string SortDir { get; set; } = "desc";
}
