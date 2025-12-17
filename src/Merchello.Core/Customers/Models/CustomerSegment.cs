using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Customers.Models;

/// <summary>
/// Represents a customer segment for grouping customers.
/// Segments can be manual (hand-picked members) or automated (criteria-based).
/// </summary>
public class CustomerSegment
{
    /// <summary>
    /// Unique identifier for the segment.
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// Display name of the segment.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional description of the segment's purpose.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// The type of segment (Manual or Automated).
    /// </summary>
    public CustomerSegmentType SegmentType { get; set; }

    /// <summary>
    /// JSON-serialized criteria rules for automated segments.
    /// Null for manual segments.
    /// </summary>
    public string? CriteriaJson { get; set; }

    /// <summary>
    /// How criteria are combined (All = AND, Any = OR).
    /// Only relevant for automated segments.
    /// </summary>
    public SegmentMatchMode MatchMode { get; set; } = SegmentMatchMode.All;

    /// <summary>
    /// Whether the segment is active and should be evaluated.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Whether this is a built-in system segment that cannot be deleted.
    /// </summary>
    public bool IsSystemSegment { get; set; }

    /// <summary>
    /// Date the segment was created (UTC).
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date the segment was last updated (UTC).
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// The user who created this segment (optional).
    /// </summary>
    public Guid? CreatedBy { get; set; }

    /// <summary>
    /// Navigation property: Members of this segment (manual segments only).
    /// </summary>
    public virtual ICollection<CustomerSegmentMember> Members { get; set; } = [];
}
