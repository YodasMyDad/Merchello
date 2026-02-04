using Merchello.Core.Accounting.Dtos;

namespace Merchello.Core.Accounting.Services;

/// <summary>
/// Helper class for invoice edit preview calculations.
/// </summary>
internal sealed class VirtualLineItem
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public int Quantity { get; set; }
    public bool IsTaxable { get; set; }
    public decimal TaxRate { get; set; }
    public LineItemDiscountDto? Discount { get; set; }

    // For calculating HasInsufficientStock
    public int OriginalQuantity { get; set; }
    public bool IsStockTracked { get; set; }
    public int AvailableStock { get; set; }

    // For calculating CanAddDiscount
    public bool HadOriginalDiscount { get; set; }
}
