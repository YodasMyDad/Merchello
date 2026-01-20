using Merchello.Core.Accounting.Dtos;

namespace Merchello.Controllers.Dtos;

/// <summary>
/// DTO for outstanding orders page response
/// </summary>
public record OutstandingOrdersPageDto
{
    public List<OrderListItemDto> Items { get; init; } = [];
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalItems { get; init; }
    public int TotalPages { get; init; }
}
