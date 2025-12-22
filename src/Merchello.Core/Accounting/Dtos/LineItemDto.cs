namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Line item DTO
/// </summary>
public class LineItemDto
{
    public Guid Id { get; set; }
    public string? Sku { get; set; }
    public string? Name { get; set; }
    public int Quantity { get; set; }
    public decimal Amount { get; set; }
    public decimal? OriginalAmount { get; set; }
    public string? ImageUrl { get; set; }

    /// <summary>
    /// Calculated total for this line item (Amount * Quantity, adjusted for any discounts)
    /// Backend is single source of truth for this value.
    /// </summary>
    public decimal CalculatedTotal { get; set; }
}
