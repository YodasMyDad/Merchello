namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Paginated response wrapper.
/// </summary>
public class UpsellPageDto
{
    public int PageIndex { get; set; }
    public int TotalPages { get; set; }
    public int TotalItems { get; set; }
    public List<UpsellListItemDto> Items { get; set; } = [];
    public bool HasPreviousPage => PageIndex > 1;
    public bool HasNextPage => PageIndex < TotalPages;
}
