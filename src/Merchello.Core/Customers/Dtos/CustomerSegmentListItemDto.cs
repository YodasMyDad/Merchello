using Merchello.Core.Customers.Models;

namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// Customer segment data for list views.
/// </summary>
public class CustomerSegmentListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public CustomerSegmentType SegmentType { get; set; }
    public bool IsActive { get; set; }
    public bool IsSystemSegment { get; set; }
    public int MemberCount { get; set; }
    public DateTime DateCreated { get; set; }
}
