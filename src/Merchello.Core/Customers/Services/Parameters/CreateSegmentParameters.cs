using Merchello.Core.Customers.Models;

namespace Merchello.Core.Customers.Services.Parameters;

/// <summary>
/// Parameters for creating a new customer segment.
/// </summary>
public class CreateSegmentParameters
{
    /// <summary>
    /// Display name of the segment (required).
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional description of the segment's purpose.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// The type of segment - Manual or Automated.
    /// </summary>
    public CustomerSegmentType SegmentType { get; set; }

    /// <summary>
    /// Criteria rules for automated segments.
    /// </summary>
    public List<SegmentCriteria>? Criteria { get; set; }

    /// <summary>
    /// How criteria are combined (All = AND, Any = OR).
    /// Defaults to All.
    /// </summary>
    public SegmentMatchMode MatchMode { get; set; } = SegmentMatchMode.All;

    /// <summary>
    /// The user creating this segment.
    /// </summary>
    public Guid? CreatedBy { get; set; }

    /// <summary>
    /// Whether this is a system segment that cannot be deleted.
    /// </summary>
    public bool IsSystemSegment { get; set; }
}
