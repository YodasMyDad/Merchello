using Merchello.Core.Customers.Models;

namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// Minimal segment data for displaying as a badge in the UI.
/// </summary>
public class CustomerSegmentBadgeDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public CustomerSegmentType SegmentType { get; set; }
}
