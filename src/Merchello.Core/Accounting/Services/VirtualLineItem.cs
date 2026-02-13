using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Accounting.Services;

/// <summary>
/// Helper class for invoice edit preview calculations.
/// </summary>
internal sealed class VirtualLineItem
{
    public Guid Id { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? WarehouseId { get; set; }
    public string? Sku { get; set; }
    public Guid? ParentLineItemId { get; set; }
    public string? ParentLineItemSku { get; set; }
    public LineItemType LineItemType { get; set; } = LineItemType.Product;
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
