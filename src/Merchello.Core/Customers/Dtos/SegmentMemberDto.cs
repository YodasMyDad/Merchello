namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// Segment member with customer details.
/// </summary>
public class SegmentMemberDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public DateTime DateAdded { get; set; }
    public string? Notes { get; set; }
}
