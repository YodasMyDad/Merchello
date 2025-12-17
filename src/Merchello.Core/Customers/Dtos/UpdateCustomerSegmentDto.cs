using Merchello.Core.Customers.Models;

namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// Request DTO for updating a customer segment.
/// </summary>
public class UpdateCustomerSegmentDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public List<SegmentCriteriaDto>? Criteria { get; set; }
    public SegmentMatchMode? MatchMode { get; set; }
    public bool? IsActive { get; set; }
}
