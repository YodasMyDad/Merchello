using Merchello.Core.Accounting.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Products.Models;

public class ProductRoot
{
    /// <summary>
    /// The Root Product Id
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// The root name, i.e. Name Mesh Office Chair
    /// </summary>
    public string? RootName { get; set; }

    /// <summary>
    /// Product Options which generate the variants
    /// </summary>
    public List<ProductOption> ProductOptions { get; set; } = new();

    /// <summary>
    /// The tax group for this product
    /// </summary>
    public virtual TaxGroup? TaxGroup { get; set; }

    /// <summary>
    /// the tax group id
    /// </summary>
    public Guid TaxGroupId { get; set; }

    /// <summary>
    /// The product type for this product
    /// </summary>
    public virtual ProductType ProductType { get; set; } = default!;

    /// <summary>
    /// the product type id
    /// </summary>
    public Guid ProductTypeId { get; set; }

    /// <summary>
    /// The Google shopping feed category
    /// https://www.google.com/basepages/producttype/taxonomy-with-ids.en-GB.txt
    /// </summary>
    public string? GoogleShoppingFeedCategory { get; set; }

    /// <summary>
    /// The product images, these are appended to the end of the main product
    /// </summary>
    public List<string> RootImages { get; set; } = new();

    /// <summary>
    /// The url for the product
    /// </summary>
    public string? RootUrl { get; set; }



    /// <summary>
    /// The list of selling points
    /// </summary>
    public List<string> SellingPoints { get; set; } = new();

    /// <summary>
    /// YouTube video urls for the product
    /// </summary>
    public List<string> Videos { get; set; } = [];

    /// <summary>
    /// A collection of associated product warehouses that relate to the product's storage or availability locations.
    /// </summary>
    public ICollection<ProductRootWarehouse> ProductRootWarehouses { get; set; } = new HashSet<ProductRootWarehouse>();


    /// <summary>
    /// The main products (Variants or default product)
    /// </summary>
    public virtual ICollection<Product> Products { get; set; } = new HashSet<Product>();

    /// <summary>
    /// Product root weight, can be overridden at product level
    /// </summary>
    public decimal Weight { get; set; }

    /// <summary>
    /// Optional: Harmonized System (HS) code
    /// </summary>
    public string? HsCode { get; set; }

    /// <summary>
    /// The Categories this product is in
    /// </summary>
    public virtual ICollection<ProductCategory> Categories { get; set; } = new HashSet<ProductCategory>();
}

