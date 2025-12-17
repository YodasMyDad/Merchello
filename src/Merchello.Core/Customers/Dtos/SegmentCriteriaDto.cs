namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// Criterion rule for automated segments.
/// </summary>
public class SegmentCriteriaDto
{
    public string Field { get; set; } = string.Empty;
    public string Operator { get; set; } = string.Empty;
    public object? Value { get; set; }
    public object? Value2 { get; set; }
}
