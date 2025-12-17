namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// Request DTO for adding members to a segment.
/// </summary>
public class AddSegmentMembersDto
{
    public List<Guid> CustomerIds { get; set; } = [];
    public string? Notes { get; set; }
}
