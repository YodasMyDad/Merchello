using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Products.Extensions;

public static class ProductShippingExtensions
{
    /// <summary>
    /// Gets the allowed shipping options for a product based on its restriction mode.
    /// Falls back to warehouse shipping options if product has no specific options configured.
    /// Checks both ProductWarehouses (variant-level) and ProductRootWarehouses (root-level).
    /// </summary>
    public static IEnumerable<ShippingOption> GetAllowedShippingOptions(this Product product)
    {
        // Get base shipping options - use product options or fall back to warehouse options
        IEnumerable<ShippingOption> baseOptions;

        if (product.ShippingOptions.Count > 0)
        {
            // Product has its own shipping options configured
            baseOptions = product.ShippingOptions;
        }
        else
        {
            // Fall back to warehouse shipping options
            // Check ProductWarehouses first (variant-level), then ProductRootWarehouses (root-level)
            var variantWarehouseOptions = product.ProductWarehouses
                .Where(pw => pw.Warehouse.ShippingOptions.Count > 0)
                .SelectMany(pw => pw.Warehouse.ShippingOptions)
                .Distinct()
                .ToList();

            if (variantWarehouseOptions.Count > 0)
            {
                baseOptions = variantWarehouseOptions;
            }
            else
            {
                baseOptions = product.ProductRoot?.ProductRootWarehouses
                    .Where(prw => prw.Warehouse?.ShippingOptions != null)
                    .SelectMany(prw => prw.Warehouse!.ShippingOptions)
                    .Distinct()
                    .ToList() ?? [];
            }
        }

        // Apply restriction mode
        return product.ShippingRestrictionMode switch
        {
            ShippingRestrictionMode.AllowList => product.AllowedShippingOptions,
            ShippingRestrictionMode.ExcludeList => baseOptions
                .Where(so => !product.ExcludedShippingOptions.Any(eso => eso.Id == so.Id)),
            _ => baseOptions
        };
    }

    /// <summary>
    /// Gets the allowed shipping options for a product based on its restriction mode,
    /// using the provided warehouse options as the base instead of loading from product.
    /// </summary>
    public static IEnumerable<ShippingOption> GetAllowedShippingOptions(
        this Product product,
        IEnumerable<ShippingOption> warehouseShippingOptions)
    {
        return product.ShippingRestrictionMode switch
        {
            ShippingRestrictionMode.AllowList => warehouseShippingOptions
                .Where(wso => product.AllowedShippingOptions.Any(aso => aso.Id == wso.Id)),
            ShippingRestrictionMode.ExcludeList => warehouseShippingOptions
                .Where(wso => !product.ExcludedShippingOptions.Any(eso => eso.Id == wso.Id)),
            _ => warehouseShippingOptions
        };
    }

    /// <summary>
    /// Gets the common shipping options available for all products in a collection
    /// Returns empty if no common options exist
    /// </summary>
    public static IEnumerable<ShippingOption> GetCommonShippingOptions(this IEnumerable<Product> products)
    {
        var productList = products.ToList();

        if (!productList.Any())
        {
            return Enumerable.Empty<ShippingOption>();
        }

        // Start with the first product's allowed options
        var commonOptions = productList[0].GetAllowedShippingOptions().ToList();

        // Intersect with each subsequent product's allowed options
        for (var i = 1; i < productList.Count; i++)
        {
            var productOptions = productList[i].GetAllowedShippingOptions().ToList();
            commonOptions = commonOptions
                .Where(co => productOptions.Any(po => po.Id == co.Id))
                .ToList();

            // Early exit if no common options
            if (!commonOptions.Any())
            {
                break;
            }
        }

        return commonOptions;
    }

    /// <summary>
    /// Checks if a product can be shipped using the specified shipping option
    /// </summary>
    public static bool CanUseShippingOption(this Product product, ShippingOption shippingOption)
    {
        return product.GetAllowedShippingOptions().Any(so => so.Id == shippingOption.Id);
    }
}
