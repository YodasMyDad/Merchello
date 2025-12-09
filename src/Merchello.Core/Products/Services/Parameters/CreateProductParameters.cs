using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Products.Services.Parameters;

/// <summary>
/// Parameters for creating a product with full details
/// </summary>
public class CreateProductParameters
{
    /// <summary>
    /// Product name
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Tax group for the product
    /// </summary>
    public required TaxGroup TaxGroup { get; init; }

    /// <summary>
    /// Product type
    /// </summary>
    public required ProductType ProductType { get; init; }

    /// <summary>
    /// Primary warehouse for stock
    /// </summary>
    public required Warehouse Warehouse { get; init; }

    /// <summary>
    /// Available shipping options
    /// </summary>
    public required List<ShippingOption> ShippingOptions { get; init; }

    /// <summary>
    /// Product price
    /// </summary>
    public required decimal Price { get; init; }

    /// <summary>
    /// Cost of goods sold
    /// </summary>
    public required decimal CostOfGoods { get; init; }

    /// <summary>
    /// Global Trade Item Number
    /// </summary>
    public required string Gtin { get; init; }

    /// <summary>
    /// Stock Keeping Unit
    /// </summary>
    public required string Sku { get; init; }

    /// <summary>
    /// Product options (variants, add-ons)
    /// </summary>
    public required List<ProductOption> ProductOptions { get; init; }
}
