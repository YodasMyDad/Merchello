using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Products.Models;

public class Product
{
    /// <summary>
    /// Product id
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The root product which holds the shared values
    /// i.e. Categories, Product Type etc...
    /// </summary>
    public virtual ProductRoot ProductRoot { get; set; } = null!;

    /// <summary>
    /// The id of the root product
    /// </summary>
    public Guid ProductRootId { get; set; }

    /// <summary>
    /// Is this the default product
    /// Used when a root product has many variations
    /// </summary>
    public bool Default { get; set; }

    /// <summary>
    /// Product Name
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Cost of the product
    /// </summary>
    public decimal CostOfGoods { get; set; }

    /// <summary>
    /// Price we are selling it for
    /// </summary>
    public decimal Price { get; set; }

    /// <summary>
    ///  Whether this product is on sale
    /// </summary>
    public bool OnSale { get; set; }

    /// <summary>
    /// The previous price to show if this product is on sale
    /// </summary>
    public decimal? PreviousPrice { get; set; }

    /// <summary>
    /// Whether the product is out of stock or not
    /// </summary>
    public bool AvailableForPurchase { get; set; } = true;

    /// <summary>
    /// Whether this product can be purchased
    /// </summary>
    public bool CanPurchase { get; set; } = true;

    /// <summary>
    /// The product images
    /// </summary>
    public List<string> Images { get; set; } = [];

    /// <summary>
    /// Product Description
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// If the user checks this, the root product images are not appended
    /// </summary>
    public bool ExcludeRootProductImages { get; set; }

    /// <summary>
    /// The GTIN of the product if available
    /// </summary>
    public string? Gtin { get; set; }

    /// <summary>
    /// The SKU for the product
    /// </summary>
    public string? Sku { get; set; }

    /// <summary>
    /// Optional Supplier Sku (If different from our own SKU)
    /// </summary>
    public string? SupplierSku { get; set; }

    /// <summary>
    /// Date the product was created
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.Now;

    /// <summary>
    /// Date the product was updated
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.Now;

    /// <summary>
    /// The meta description
    /// </summary>
    public string? MetaDescription { get; set; }

    /// <summary>
    /// The page title
    /// </summary>
    public string? PageTitle { get; set; }

    /// <summary>
    /// Whether this product should be indexed
    /// </summary>
    public bool NoIndex { get; set; }

    /// <summary>
    /// The opengraph media Id
    /// </summary>
    public string? OpenGraphImage { get; set; }

    /// <summary>
    /// The title for the shopping feed
    /// </summary>
    public string? ShoppingFeedTitle { get; set; }

    /// <summary>
    /// The description for the Shopping feed
    /// </summary>
    public string? ShoppingFeedDescription { get; set; }

    /// <summary>
    /// The shopping feed colour
    /// </summary>
    public string? ShoppingFeedColour { get; set; }

    /// <summary>
    /// The shopping feed material
    /// </summary>
    public string? ShoppingFeedMaterial { get; set; }

    /// <summary>
    /// The shopping feed size
    /// </summary>
    public string? ShoppingFeedSize { get; set; }

    /// <summary>
    /// If this is ticked, it will not fill in the custom labels in the feed
    /// </summary>
    public bool ExcludeFromCustomLabels  { get; set; }

    /// <summary>
    /// If this is ticked the product is removed from the product feed
    /// </summary>
    public bool RemoveFromFeed { get; set; }

    /// <summary>
    /// This key is used to identify which options created it
    /// </summary>
    public string? VariantOptionsKey { get; set; }

    /// <summary>
    /// The url for the product
    /// </summary>
    public string? Url { get; set; }

    /// <summary>
    /// Base shipping options available for this product (typically inherited from warehouses).
    /// If empty, warehouse shipping options are used as the base.
    /// These can be overridden using AllowedShippingOptions or ExcludedShippingOptions.
    /// </summary>
    public virtual ICollection<ShippingOption> ShippingOptions { get; set; } = new HashSet<ShippingOption>();

    /// <summary>
    /// The filters selected for this variant
    /// </summary>
    public virtual ICollection<ProductFilter> Filters { get; set; } = new List<ProductFilter>();

    /// <summary>
    /// Collection of price overrides associated with products and this warehouse.
    /// </summary>
    public ICollection<ProductWarehousePriceOverride> ProductWarehousePriceOverrides { get; set; } = new HashSet<ProductWarehousePriceOverride>();

    /// <summary>
    /// Stock levels for this product variant at each warehouse
    /// </summary>
    public virtual ICollection<ProductWarehouse> ProductWarehouses { get; set; } = new HashSet<ProductWarehouse>();

    /// <summary>
    /// Defines how shipping restrictions are applied to this product.
    /// None: Use base ShippingOptions as-is
    /// AllowList: Filter to only AllowedShippingOptions
    /// ExcludeList: Remove ExcludedShippingOptions from base options
    /// </summary>
    public ShippingRestrictionMode ShippingRestrictionMode { get; set; } = ShippingRestrictionMode.None;

    /// <summary>
    /// When ShippingRestrictionMode is AllowList, restricts to ONLY these specific shipping options
    /// (overrides base ShippingOptions collection)
    /// </summary>
    public virtual ICollection<ShippingOption> AllowedShippingOptions { get; set; } = new HashSet<ShippingOption>();

    /// <summary>
    /// When ShippingRestrictionMode is ExcludeList, excludes these specific options from the base ShippingOptions
    /// (removes these from base ShippingOptions collection)
    /// </summary>
    public virtual ICollection<ShippingOption> ExcludedShippingOptions { get; set; } = new HashSet<ShippingOption>();

}
