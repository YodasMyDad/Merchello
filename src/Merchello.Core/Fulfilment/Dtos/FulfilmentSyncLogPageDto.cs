namespace Merchello.Core.Fulfilment.Dtos;

/// <summary>
/// DTO for paginated fulfilment sync log list response.
/// </summary>
public class FulfilmentSyncLogPageDto
{
    public List<FulfilmentSyncLogDto> Items { get; set; } = [];
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
    public bool HasPreviousPage { get; set; }
    public bool HasNextPage { get; set; }
}
