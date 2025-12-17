namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// Paginated response for segment members.
/// </summary>
public class SegmentMembersResponseDto
{
    public List<SegmentMemberDto> Items { get; set; } = [];
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
}
