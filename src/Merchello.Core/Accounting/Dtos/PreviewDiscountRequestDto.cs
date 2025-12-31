using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Request DTO for previewing discount calculation on a line item
/// </summary>
public class PreviewDiscountRequestDto
{
    /// <summary>
    /// Unit price of the line item
    /// </summary>
    public decimal LineItemPrice { get; set; }

    /// <summary>
    /// Quantity of items
    /// </summary>
    public int Quantity { get; set; }

    /// <summary>
    /// Type of discount (FixedAmount or Percentage)
    /// </summary>
    public DiscountValueType DiscountType { get; set; }

    /// <summary>
    /// Discount value (amount for fixed, percentage for percentage type)
    /// </summary>
    public decimal DiscountValue { get; set; }

    /// <summary>
    /// Currency code for proper rounding (e.g., "GBP", "USD", "JPY").
    /// If not provided, defaults to store currency.
    /// </summary>
    public string? CurrencyCode { get; set; }
}
