using Merchello.Core.Customers.Models;

namespace Merchello.Core.Customers.Services.Parameters;

/// <summary>
/// Parameters for updating an existing customer segment.
/// </summary>
public class UpdateSegmentParameters
{
    /// <summary>
    /// Updated name (null to keep existing).
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Updated description (null to keep existing).
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Updated criteria for automated segments (null to keep existing).
    /// </summary>
    public List<SegmentCriteria>? Criteria { get; set; }

    /// <summary>
    /// Updated match mode (null to keep existing).
    /// </summary>
    public SegmentMatchMode? MatchMode { get; set; }

    /// <summary>
    /// Updated active status (null to keep existing).
    /// </summary>
    public bool? IsActive { get; set; }
}
