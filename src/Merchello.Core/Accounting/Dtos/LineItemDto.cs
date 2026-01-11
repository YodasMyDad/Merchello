using Merchello.Core.Checkout.Dtos;

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Line item DTO
/// </summary>
public class LineItemDto
{
    public Guid Id { get; set; }
    public string? Sku { get; set; }

    /// <summary>
    /// The variant name (e.g., "S-Grey"). Kept for backward compatibility.
    /// For display, prefer ProductRootName with SelectedOptions.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// The root product name (e.g., "Premium V-Neck").
    /// </summary>
    public string ProductRootName { get; set; } = "";

    /// <summary>
    /// Selected options for this variant (e.g., Color: Grey, Size: S).
    /// </summary>
    public List<SelectedOptionDto> SelectedOptions { get; set; } = [];

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
