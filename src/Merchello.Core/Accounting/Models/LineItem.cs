using System.Text.Json.Serialization;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Accounting.Models;

public class LineItem
{
    /// <summary>
    /// Id for this line item
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// If the line item is on an invoice then the invoice Id will be set here
    /// </summary>
    public Guid? InvoiceId { get; set; }

    /// <summary>
    /// The invoice if mapped
    /// </summary>
    [JsonIgnore]
    public Invoice? Invoice { get; set; }

    /// <summary>
    /// If the line item is on an order then the order id will be set here
    /// </summary>
    public Guid? OrderId { get; set; }

    /// <summary>
    /// The order if mapped
    /// </summary>
    [JsonIgnore]
    public Order? Order { get; set; }

    /// <summary>
    /// Item SKU
    /// </summary>
    public string? Sku { get; set; }

    /// <summary>
    /// Name of the item (If product will be the product name)
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// If this line item is a product the id will be stored here
    /// </summary>
    public Guid? ProductId { get; set; }

    /// <summary>
    /// If this line item is dependant to another item
    /// Example would be a service add on or some other specific add on to a line item
    /// if that line item is removed, this would need to be removed
    /// </summary>
    public string? DependantLineItemSku { get; set; }

    /// <summary>
    /// The type of this line item
    /// </summary>
    public LineItemType LineItemType { get; set; } = LineItemType.Product;

    /// <summary>
    /// The amount of this specific item
    /// </summary>
    public int Quantity { get; set; }

    /// <summary>
    /// The price of this item
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Unit price in store currency (for reporting).
    /// </summary>
    public decimal? AmountInStoreCurrency { get; set; }

    /// <summary>
    /// The cost of goods for this line item (unit cost).
    /// For products, this is Product.CostOfGoods at order time.
    /// For add-ons, this is ProductOptionValue.CostAdjustment.
    /// </summary>
    public decimal Cost { get; set; }

    /// <summary>
    /// Unit cost in store currency (for multi-currency reporting).
    /// </summary>
    public decimal? CostInStoreCurrency { get; set; }

    /// <summary>
    /// Optional value, only added when the line item price has been manually changed from the original
    /// </summary>
    public decimal? OriginalAmount { get; set; }

    /// <summary>
    /// Original amount in store currency (for multi-currency reporting).
    /// </summary>
    public decimal? OriginalAmountInStoreCurrency { get; set; }

    /// <summary>
    /// Defines whether this line item is taxable. Might be zero rated tax product
    /// </summary>
    public bool IsTaxable { get; set; }

    /// <summary>
    /// Defines the tax rate (%) for this line item. Different products can have different tax rates (i.e. Books, clothes etc...)
    /// </summary>
    public decimal TaxRate { get; set; }

    /// <summary>
    /// Tax group ID for this line item. Used by API tax providers to lookup provider-specific tax codes.
    /// Captured from ProductRoot.TaxGroupId at basket creation time.
    /// </summary>
    public Guid? TaxGroupId { get; set; }

    /// <summary>
    /// Date the line item was created
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date the line item was updated
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// General use extended data, for storing data related to this line item
    /// </summary>
    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
