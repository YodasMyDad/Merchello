namespace Merchello.Core.Discounts.Dtos;

/// <summary>
/// DTO for paginated discount list response.
/// </summary>
public class DiscountPageDto
{
    public List<DiscountListItemDto> Items { get; set; } = [];
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
    public bool HasPreviousPage { get; set; }
    public bool HasNextPage { get; set; }
}
