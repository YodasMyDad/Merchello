using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Products.Extensions;

public static class ProductExtensions
{
    /// <summary>
    /// Gets the total stock for this product across all warehouses
    /// </summary>
    public static int GetTotalStock(this Product product)
    {
        return product.ProductWarehouses?.Sum(pw => pw.Stock) ?? 0;
    }

    /// <summary>
    /// Gets all warehouses that have stock for this product
    /// </summary>
    public static IEnumerable<Warehouse> GetAvailableWarehouses(this Product product)
    {
        return product.ProductWarehouses?
            .Where(pw => pw.Stock > 0)
            .Select(pw => pw.Warehouse)
            ?? [];
    }

    /// <summary>
    /// Checks if the product has sufficient stock in a specific warehouse
    /// </summary>
    public static bool HasStockInWarehouse(this Product product, Guid warehouseId, int quantity = 1)
    {
        var productWarehouse = product.ProductWarehouses?
            .FirstOrDefault(pw => pw.WarehouseId == warehouseId);

        return productWarehouse?.Stock >= quantity;
    }

    /// <summary>
    /// Gets the stock level for a specific warehouse
    /// </summary>
    public static int GetStockInWarehouse(this Product product, Guid warehouseId)
    {
        return product.ProductWarehouses?
            .FirstOrDefault(pw => pw.WarehouseId == warehouseId)?.Stock ?? 0;
    }

    /// <summary>
    /// Gets the available stock (Stock - ReservedStock) for a specific warehouse.
    /// Returns int.MaxValue if stock is not tracked for this product-warehouse combination.
    /// </summary>
    public static int GetAvailableStockInWarehouse(this Product product, Guid warehouseId)
    {
        var productWarehouse = product.ProductWarehouses?
            .FirstOrDefault(pw => pw.WarehouseId == warehouseId);

        if (productWarehouse == null)
            return 0;

        // If stock is not tracked, return unlimited availability
        if (!productWarehouse.TrackStock)
            return int.MaxValue;

        // Return available stock (current stock minus reserved stock)
        return Math.Max(0, productWarehouse.Stock - productWarehouse.ReservedStock);
    }

    /// <summary>
    /// Checks if the product has sufficient available stock (Stock - ReservedStock) in a specific warehouse.
    /// Always returns true if stock tracking is disabled for this product-warehouse combination.
    /// </summary>
    public static bool HasAvailableStockInWarehouse(this Product product, Guid warehouseId, int quantity = 1)
    {
        var productWarehouse = product.ProductWarehouses?
            .FirstOrDefault(pw => pw.WarehouseId == warehouseId);

        if (productWarehouse == null)
            return false;

        // If stock is not tracked, always return true
        if (!productWarehouse.TrackStock)
            return true;

        var availableStock = productWarehouse.Stock - productWarehouse.ReservedStock;
        return availableStock >= quantity;
    }

    /// <summary>
    /// Checks if stock is being tracked for this product at a specific warehouse
    /// </summary>
    public static bool IsStockTrackedInWarehouse(this Product product, Guid warehouseId)
    {
        var productWarehouse = product.ProductWarehouses?
            .FirstOrDefault(pw => pw.WarehouseId == warehouseId);

        return productWarehouse?.TrackStock ?? true;
    }

    /// <summary>
    /// Gets a shipping option based on a country code for a product.
    /// </summary>
    /// <param name="product"></param>
    /// <param name="countryCode"></param>
    /// <param name="stateOrProvinceCode">Optional state or province code.</param>
    /// <returns></returns>
    public static decimal? GetShippingAmountForCountry(this Product product, string countryCode, string? stateOrProvinceCode, IShippingCostResolver costResolver)
    {
        // Get all allowed shipping options (includes warehouse options as fallback)
        var baseOptions = product.GetAllowedShippingOptions();

        // Filter to eligible options (warehouse can serve region)
        var eligibleOptions = baseOptions
            .Where(so => so.Warehouse == null || so.Warehouse.CanServeRegion(countryCode, stateOrProvinceCode))
            .ToList();

        // Find the first shipping option that has a resolvable cost for this destination
        foreach (var option in eligibleOptions)
        {
            var cost = costResolver.GetTotalShippingCost(option, countryCode, stateOrProvinceCode);
            if (cost.HasValue)
            {
                return cost.Value;
            }
        }

        return null;
    }

    /// <summary>
    /// Gets the valid shipping options for a country.
    /// </summary>
    /// <param name="product"></param>
    /// <param name="countryCode"></param>
    /// <param name="stateOrProvinceCode">Optional state or province code.</param>
    /// <returns></returns>
    public static IEnumerable<ShippingOption> GetValidShippingOptionsForCountry(this Product product, string countryCode, string? stateOrProvinceCode = null)
    {
        // Get all allowed shipping options (includes warehouse options as fallback)
        var baseOptions = product.GetAllowedShippingOptions();

        // Select all shipping options that are valid for the given country and optionally state/province.
        // CountryCode can be "*" for universal/wildcard shipping costs that apply to all countries.
        var validShippingOptions = baseOptions
            .Where(so => so.Warehouse == null || so.Warehouse.CanServeRegion(countryCode, stateOrProvinceCode))
            .Where(so => so.ShippingCosts.Count == 0 || so.ShippingCosts.Any(sc =>
                (sc.CountryCode == countryCode || sc.CountryCode == "*") &&
                (stateOrProvinceCode == null || sc.StateOrProvinceCode == stateOrProvinceCode || sc.StateOrProvinceCode == null)))
            .ToList();

        return validShippingOptions;
    }


    /// <summary>
    /// Creates variant ids from the cartesian product option values
    /// </summary>
    /// <param name="items"></param>
    /// <returns></returns>
    public static Dictionary<string, string> CreateVariantIds(this IEnumerable<IEnumerable<ProductOptionValue>> items)
    {
        Dictionary<string, string> variantIds = [];
        var optionItemLists = items as IEnumerable<ProductOptionValue>[] ?? items.ToArray();
        if (optionItemLists.Any())
        {
            // Loop through main list
            foreach (var optionItemList in optionItemLists)
            {
                var keyName = optionItemList.GenerateVariantKeyName();

                // Select the Id's and concat hyphen seperated
                variantIds.Add(keyName.Key, keyName.Name);
            }
        }

        return variantIds;
    }

    /// <summary>
    /// Creates key and name for a list of product option value
    /// </summary>
    /// <param name="productOptionValues"></param>
    /// <returns></returns>
    public static (string Key, string Name) GenerateVariantKeyName(this List<ProductOptionValue> productOptionValues)
    {
        var orderedItems = productOptionValues.OrderBy(x => x.Id).ToList();

        // Select the Id's and concat comma-separated (GUIDs contain hyphens, so comma is safer)
        return (string.Join(",", orderedItems.Select(x => x.Id)),
            string.Join("-", orderedItems.Select(x => x.FullName)));
    }

    /// <summary>
    /// Creates key and name for a list of product option value
    /// </summary>
    /// <param name="productOptionValues"></param>
    /// <returns></returns>
    public static (string Key, string Name) GenerateVariantKeyName(
        this IEnumerable<ProductOptionValue> productOptionValues)
    {
        return productOptionValues.ToList().GenerateVariantKeyName();
    }
}
