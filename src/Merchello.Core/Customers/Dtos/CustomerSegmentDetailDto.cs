using Merchello.Core.Customers.Models;

namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// Detailed customer segment data including criteria.
/// </summary>
public class CustomerSegmentDetailDto : CustomerSegmentListItemDto
{
    public List<SegmentCriteriaDto>? Criteria { get; set; }
    public SegmentMatchMode MatchMode { get; set; }
    public DateTime DateUpdated { get; set; }
}
