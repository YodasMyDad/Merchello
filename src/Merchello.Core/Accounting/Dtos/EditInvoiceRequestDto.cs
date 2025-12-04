namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Request to edit an invoice (order)
/// </summary>
public class EditInvoiceRequestDto
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
    /// Custom items to add
    /// </summary>
    public List<AddCustomItemDto> CustomItems { get; set; } = [];

    /// <summary>
    /// Per-order shipping cost updates
    /// </summary>
    public List<OrderShippingUpdateDto> OrderShippingUpdates { get; set; } = [];

    /// <summary>
    /// Reason for the edit (added to invoice notes/timeline)
    /// </summary>
    public string? EditReason { get; set; }
}

