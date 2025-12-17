using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Customers.Models;

/// <summary>
/// Represents a customer's membership in a manual segment.
/// Only used for manual segments - automated segments calculate membership dynamically.
/// </summary>
public class CustomerSegmentMember
{
    /// <summary>
    /// Unique identifier for this membership record.
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The segment this membership belongs to.
    /// </summary>
    public Guid SegmentId { get; set; }

    /// <summary>
    /// The customer who is a member of the segment.
    /// </summary>
    public Guid CustomerId { get; set; }

    /// <summary>
    /// Date the customer was added to the segment (UTC).
    /// </summary>
    public DateTime DateAdded { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// The user who added this customer to the segment (optional).
    /// </summary>
    public Guid? AddedBy { get; set; }

    /// <summary>
    /// Optional notes about why this customer was added to the segment.
    /// </summary>
    public string? Notes { get; set; }

    /// <summary>
    /// Navigation property: The parent segment.
    /// </summary>
    public virtual CustomerSegment Segment { get; set; } = null!;
}
