namespace Merchello.Core.Customers.Services.Parameters;

/// <summary>
/// Parameters for getting paginated segment members.
/// </summary>
public class GetSegmentMembersParameters
{
    /// <summary>
    /// The segment ID.
    /// </summary>
    public required Guid SegmentId { get; set; }

    /// <summary>
    /// Page number (1-based).
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Items per page.
    /// </summary>
    public int PageSize { get; set; } = 50;
}
