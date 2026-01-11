namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// DTO for line items within an abandoned checkout.
/// </summary>
public class AbandonedCheckoutLineItemDto
{
    public Guid Id { get; set; }
    public Guid? ProductId { get; set; }
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
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string FormattedUnitPrice { get; set; } = string.Empty;
    public string FormattedLineTotal { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}
