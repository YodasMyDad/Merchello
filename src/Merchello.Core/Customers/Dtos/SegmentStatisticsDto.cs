namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// Statistics for a customer segment.
/// </summary>
public class SegmentStatisticsDto
{
    /// <summary>
    /// Total number of members in the segment.
    /// </summary>
    public int TotalMembers { get; set; }

    /// <summary>
    /// Number of members with recent activity (orders).
    /// </summary>
    public int ActiveMembers { get; set; }

    /// <summary>
    /// Combined revenue from all segment members.
    /// </summary>
    public decimal TotalRevenue { get; set; }

    /// <summary>
    /// Average order value across all members.
    /// </summary>
    public decimal AverageOrderValue { get; set; }
}
