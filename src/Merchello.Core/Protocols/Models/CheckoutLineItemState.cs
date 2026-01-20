namespace Merchello.Core.Protocols.Models;

/// <summary>
/// Protocol-agnostic representation of a checkout line item.
/// </summary>
public class CheckoutLineItemState
{
    public required string LineItemId { get; init; }
    public string? ProductId { get; init; }
    public string? VariantId { get; init; }
    public required string Sku { get; init; }
    public required string Name { get; init; }
    public string? Description { get; init; }
    public required int Quantity { get; init; }

    /// <summary>
    /// Unit price in minor units (cents).
    /// </summary>
    public required long UnitPrice { get; init; }

    /// <summary>
    /// Line total in minor units (quantity * unit price).
    /// </summary>
    public required long LineTotal { get; init; }

    public long DiscountAmount { get; init; }
    public long TaxAmount { get; init; }
    public required long FinalTotal { get; init; }
    public bool RequiresShipping { get; init; } = true;
    public string? ImageUrl { get; init; }
    public string? ProductUrl { get; init; }
    public IReadOnlyList<CheckoutLineItemOption>? SelectedOptions { get; init; }
}
