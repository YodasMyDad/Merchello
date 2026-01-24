namespace Merchello.Core.Customers.Models;

/// <summary>
/// Internal projection model for SQL-based criteria evaluation.
/// Contains customer data with pre-computed invoice aggregates.
/// </summary>
internal class CustomerWithMetrics
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public DateTime DateCreated { get; set; }
    public List<string> Tags { get; set; } = [];
    public int OrderCount { get; set; }
    public decimal TotalSpend { get; set; }
    public DateTime? FirstOrderDate { get; set; }
    public DateTime? LastOrderDate { get; set; }
    public string? Country { get; set; }
}
