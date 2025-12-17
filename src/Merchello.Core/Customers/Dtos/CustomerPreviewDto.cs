namespace Merchello.Core.Customers.Dtos;

/// <summary>
/// Customer preview for segment matching.
/// </summary>
public class CustomerPreviewDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int OrderCount { get; set; }
    public decimal TotalSpend { get; set; }
}
