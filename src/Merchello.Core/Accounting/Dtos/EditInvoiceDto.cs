namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Request to edit an invoice (order)
/// </summary>
public class EditInvoiceDto
{
    /// <summary>
    /// Line item changes (quantities, discounts)
    /// </summary>
    public List<EditLineItemDto> LineItems { get; set; } = [];

    /// <summary>
    /// Line items to remove
    /// </summary>
    public List<RemoveLineItemDto> RemovedLineItems { get; set; } = [];

    /// <summary>
    /// IDs of order-level discounts to remove (coupons, etc.)
    /// </summary>
    public List<Guid> RemovedOrderDiscounts { get; set; } = [];

    /// <summary>
    /// Custom items to add
    /// </summary>
    public List<AddCustomItemDto> CustomItems { get; set; } = [];

    /// <summary>
    /// Products to add (with optional add-ons)
    /// </summary>
    public List<AddProductToOrderDto> ProductsToAdd { get; set; } = [];

    /// <summary>
    /// Order-level discounts to add (not tied to specific line items)
    /// </summary>
    public List<LineItemDiscountDto> OrderDiscounts { get; set; } = [];

    /// <summary>
    /// Promotional discount codes to apply using checkout discount validation/calculation rules.
    /// </summary>
    public List<string> OrderDiscountCodes { get; set; } = [];

    /// <summary>
    /// Per-order shipping cost updates
    /// </summary>
    public List<OrderShippingUpdateDto> OrderShippingUpdates { get; set; } = [];

    /// <summary>
    /// Reason for the edit (added to invoice notes/timeline)
    /// </summary>
    public string? EditReason { get; set; }

    /// <summary>
    /// If true, removes tax from all line items (VAT exemption)
    /// </summary>
    public bool ShouldRemoveTax { get; set; }
}
