using Microsoft.AspNetCore.Mvc;

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Query parameters for order list
/// </summary>
public class OrderListQuery
{
    [FromQuery(Name = "page")]
    public int Page { get; set; } = 1;

    [FromQuery(Name = "pageSize")]
    public int PageSize { get; set; } = 50;

    [FromQuery(Name = "status")]
    public string? Status { get; set; }

    [FromQuery(Name = "paymentStatus")]
    public string? PaymentStatus { get; set; }

    [FromQuery(Name = "fulfillmentStatus")]
    public string? FulfillmentStatus { get; set; }

    [FromQuery(Name = "search")]
    public string? Search { get; set; }

    [FromQuery(Name = "sortBy")]
    public string SortBy { get; set; } = "date";

    [FromQuery(Name = "sortDir")]
    public string SortDir { get; set; } = "desc";
}
