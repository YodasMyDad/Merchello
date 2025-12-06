namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Paginated response for order list
/// </summary>
public class OrderPageDto
{
    public List<OrderListItemDto> Items { get; set; } = [];
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
}
