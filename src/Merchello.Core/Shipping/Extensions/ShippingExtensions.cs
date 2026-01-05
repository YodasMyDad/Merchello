using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Models;
using Microsoft.EntityFrameworkCore;

namespace Merchello.Core.Shipping.Extensions;

public static class ShippingExtensions
{
    /// <summary>
    /// Gets the shipping amount for a warehouse to a specific location
    /// </summary>
    /// <param name="shippingOptions">The shipping options DbSet</param>
    /// <param name="warehouse">The warehouse to ship from</param>
    /// <param name="countryCode">The destination country code</param>
    /// <param name="stateOrProvinceCode">Optional state or province code</param>
    /// <returns>
    /// The shipping cost, or null if:
    /// - Warehouse is null
    /// - Warehouse cannot serve the specified region
    /// - No shipping option is configured for this warehouse and location
    /// Note: Calling code should display appropriate messaging when null is returned
    /// </returns>
    public static decimal? GetShippingAmount(
        this DbSet<ShippingOption> shippingOptions,
        Warehouse? warehouse,
        string countryCode,
        string? stateOrProvinceCode = null) // Optional state/province
    {
        if (warehouse == null)
        {
            return null;
        }

        if (!warehouse.CanServeRegion(countryCode, stateOrProvinceCode))
        {
            return null;
        }

        // Find the relevant shipping option for the warehouse and country/state
        // CountryCode can be "*" for universal/wildcard shipping costs that apply to all countries.
        var shippingOption = shippingOptions
            .Include(so => so.ShippingCosts)
            .FirstOrDefault(so =>
                so.WarehouseId == warehouse.Id &&
                so.ShippingCosts.Any(sc =>
                    (sc.CountryCode == countryCode || sc.CountryCode == "*") &&
                    (stateOrProvinceCode == null || sc.StateOrProvinceCode == stateOrProvinceCode || sc.StateOrProvinceCode == null)));

        if (shippingOption == null)
        {
            return null;
        }

        // Try to find the most specific shipping cost (prefer exact country match over wildcard)
        var shippingCost = shippingOption.ShippingCosts
            .Where(sc => sc.CountryCode == countryCode || sc.CountryCode == "*")
            .OrderBy(sc => sc.CountryCode == "*" ? 1 : 0) // Prefer specific country over wildcard
            .ThenBy(sc => sc.StateOrProvinceCode == null ? 1 : 0) // Prefer specific state/province costs
            .FirstOrDefault(sc => stateOrProvinceCode == null || sc.StateOrProvinceCode == stateOrProvinceCode || sc.StateOrProvinceCode == null);

        return shippingCost?.Cost;
    }


    /// <summary>
    /// Gets all valid shipping options for a specific country and optional state/province
    /// </summary>
    /// <param name="shippingOptions">The shipping options DbSet</param>
    /// <param name="countryCode">The destination country code</param>
    /// <param name="stateOrProvinceCode">Optional state or province code</param>
    /// <returns>Collection of valid shipping options for the location</returns>
    public static IEnumerable<ShippingOption> GetValidShippingOptionsForCountry(
        this DbSet<ShippingOption> shippingOptions,
        string countryCode,
        string? stateOrProvinceCode = null) // Optional state/province
    {
        // Get all valid shipping options for the country and optionally the state/province
        // CountryCode can be "*" for universal/wildcard shipping costs that apply to all countries.
        var validShippingOptions = shippingOptions
            .Include(so => so.Warehouse)
            .Include(so => so.ShippingCosts)
            .AsSplitQuery()
            .Where(so =>
                so.Warehouse.CanServeRegion(countryCode, stateOrProvinceCode) &&
                so.ShippingCosts.Any(sc =>
                    (sc.CountryCode == countryCode || sc.CountryCode == "*") &&
                    (stateOrProvinceCode == null || sc.StateOrProvinceCode == stateOrProvinceCode || sc.StateOrProvinceCode == null)))
            .ToList();

        return validShippingOptions;
    }



}
