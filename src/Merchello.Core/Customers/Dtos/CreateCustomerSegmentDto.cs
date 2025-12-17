using Merchello.Core.Customers.Models;

namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// Request DTO for creating a customer segment.
/// </summary>
public class CreateCustomerSegmentDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public CustomerSegmentType SegmentType { get; set; }
    public List<SegmentCriteriaDto>? Criteria { get; set; }
    public SegmentMatchMode MatchMode { get; set; } = SegmentMatchMode.All;
}
