namespace Merchello.Core.Upsells.Models;

/// <summary>
/// Enriched line item with product metadata needed for trigger matching and filter extraction.
/// </summary>
public class UpsellContextLineItem
{
    public Guid LineItemId { get; set; }
    public Guid ProductId { get; set; }
    public Guid ProductRootId { get; set; }
    public Guid? ProductTypeId { get; set; }
    public List<Guid> CollectionIds { get; set; } = [];
    public List<Guid> ProductFilterIds { get; set; } = [];
    public Guid? SupplierId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }

    /// <summary>
    /// Filter values grouped by filter group ID.
    /// Key: FilterGroupId, Value: List of FilterIds in that group.
    /// Used for filter matching between trigger and recommendation products.
    /// </summary>
    public Dictionary<Guid, List<Guid>> FiltersByGroup { get; set; } = [];
}
