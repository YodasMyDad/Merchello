namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// Request DTO for removing members from a segment.
/// </summary>
public class RemoveSegmentMembersDto
{
    public List<Guid> CustomerIds { get; set; } = [];
}
