namespace Merchello.Core.Customers.Services.Parameters;

/// <summary>
/// Parameters for adding customers to a manual segment.
/// </summary>
public class AddSegmentMembersParameters
{
    /// <summary>
    /// The segment to add members to.
    /// </summary>
    public required Guid SegmentId { get; set; }

    /// <summary>
    /// Customer IDs to add.
    /// </summary>
    public required List<Guid> CustomerIds { get; set; }

    /// <summary>
    /// Optional user who performed the action.
    /// </summary>
    public Guid? AddedBy { get; set; }

    /// <summary>
    /// Optional notes about the addition.
    /// </summary>
    public string? Notes { get; set; }
}
