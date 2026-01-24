using Merchello.Core.Accounting.Models;

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
    public List<ProductOption> ProductOptions { get; set; } = [];

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
    public List<string> RootImages { get; set; } = [];

    /// <summary>
    /// The url for the product
    /// </summary>
    public string? RootUrl { get; set; }

    /// <summary>
    /// A collection of associated product warehouses that relate to the product's storage or availability locations.
    /// </summary>
    public ICollection<ProductRootWarehouse> ProductRootWarehouses { get; set; } = [];


    /// <summary>
    /// The main products (Variants or default product)
    /// </summary>
    public virtual ICollection<Product> Products { get; set; } = [];

    /// <summary>
    /// Default package configurations for shipping.
    /// When populated, these define how the product ships (one or more boxes).
    /// Variants inherit these unless they define their own PackageConfigurations.
    /// </summary>
    public List<ProductPackage> DefaultPackageConfigurations { get; set; } = [];

    /// <summary>
    /// The Collections this product is in
    /// </summary>
    public virtual ICollection<ProductCollection> Collections { get; set; } = [];

    /// <summary>
    /// Indicates whether this is a digital product (no physical shipping required).
    /// Digital products do not require warehouse assignment or shipping options.
    /// </summary>
    public bool IsDigitalProduct { get; set; }

    /// <summary>
    /// Whether this product can be shipped via external carrier providers (FedEx, UPS, etc.).
    /// When false, only flat-rate shipping options are available for this product.
    /// Defaults to true so products are carrier-eligible by default.
    /// </summary>
    public bool AllowExternalCarrierShipping { get; set; } = true;

    /// <summary>
    /// The product description
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// The meta description for SEO
    /// </summary>
    public string? MetaDescription { get; set; }

    /// <summary>
    /// The page title for SEO
    /// </summary>
    public string? PageTitle { get; set; }

    /// <summary>
    /// Whether this product should be hidden from search engines
    /// </summary>
    public bool NoIndex { get; set; }

    /// <summary>
    /// The Open Graph image media ID for social sharing
    /// </summary>
    public string? OpenGraphImage { get; set; }

    /// <summary>
    /// Optional canonical URL for SEO duplicate content handling
    /// </summary>
    public string? CanonicalUrl { get; set; }

    /// <summary>
    /// JSON-serialized property data from the configured Element Type.
    /// Stores values as { "propertyAlias": rawValue, ... }
    /// </summary>
    public string? ElementPropertyData { get; set; }

    /// <summary>
    /// The view alias used to render this product on the front-end.
    /// Example: "Gallery" -> ~/Views/Products/Gallery.cshtml
    /// </summary>
    public string? ViewAlias { get; set; }

    /// <summary>
    /// Extended data dictionary for storing additional product metadata.
    /// Used for digital product settings, custom attributes, plugin data, etc.
    /// Keys should use Constants.ExtendedDataKeys for consistency.
    /// </summary>
    public Dictionary<string, object> ExtendedData { get; set; } = [];
}

