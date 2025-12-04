using System;
using System.Collections.Generic;
using System.Linq;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Warehouses.Models;

public class Warehouse
{
    /// <summary>
    /// Supplier Id
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// Supplier name
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Supplier name
    /// </summary>
    public string? Code { get; set; }

    /// <summary>
    /// The suppliers address
    /// </summary>
    public Address Address { get; set; } = new();

    /// <summary>
    /// Shipping options available from this warehouse
    /// </summary>
    public virtual ICollection<ShippingOption> ShippingOptions { get; set; } = new HashSet<ShippingOption>();

    /// <summary>
    /// Regions that this warehouse is able (or unable) to service
    /// </summary>
    public virtual ICollection<WarehouseServiceRegion> ServiceRegions { get; set; } = new HashSet<WarehouseServiceRegion>();

    /// <summary>
    /// A collection of ProductRootWarehouse objects representing the association
    /// between products and the warehouse for storage, including priority information.
    /// </summary>
    public ICollection<ProductRootWarehouse> ProductRootWarehouses { get; set; } = new HashSet<ProductRootWarehouse>();

    /// <summary>
    /// Stock levels for product variants stored at this warehouse
    /// </summary>
    public virtual ICollection<ProductWarehouse> ProductWarehouses { get; set; } = new HashSet<ProductWarehouse>();

    /// <summary>
    /// Collection of price overrides associated with products in this warehouse.
    /// </summary>
    public ICollection<ProductWarehousePriceOverride> ProductWarehousePriceOverrides { get; set; } = new HashSet<ProductWarehousePriceOverride>();

    /// <summary>
    /// Update date
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Create date
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// The fully qualified namespace to the calculation class to handle automation
    /// </summary>
    public string? AutomationMethod { get; set; }

    /// <summary>
    ///     General use extended data, for storing data related to this basket
    /// </summary>
    public Dictionary<string, object> ExtendedData { get; set; } = [];

    public bool CanServeRegion(string countryCode, string? stateOrProvinceCode = null)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
        {
            return false;
        }

        if (ServiceRegions == null || ServiceRegions.Count == 0)
        {
            return true;
        }

        var normalizedCountry = countryCode.ToUpperInvariant();
        var normalizedState = stateOrProvinceCode?.ToUpperInvariant();

        bool RegionMatches(WarehouseServiceRegion region)
        {
            if (region.CountryCode == "*")
            {
                if (string.IsNullOrWhiteSpace(region.StateOrProvinceCode))
                {
                    return true;
                }

                return normalizedState != null &&
                       string.Equals(region.StateOrProvinceCode, normalizedState, StringComparison.OrdinalIgnoreCase);
            }

            if (!string.Equals(region.CountryCode, normalizedCountry, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (string.IsNullOrWhiteSpace(region.StateOrProvinceCode))
            {
                return true;
            }

            return normalizedState != null &&
                   string.Equals(region.StateOrProvinceCode, normalizedState, StringComparison.OrdinalIgnoreCase);
        }

        var relevantRegions = ServiceRegions
            .Where(RegionMatches)
            .ToList();

        if (relevantRegions.Count == 0)
        {
            return false;
        }

        // Check for specific state/province exclusions first (most specific wins)
        if (!string.IsNullOrWhiteSpace(normalizedState))
        {
            var stateSpecificRegions = relevantRegions
                .Where(r => !string.IsNullOrWhiteSpace(r.StateOrProvinceCode) &&
                           string.Equals(r.StateOrProvinceCode, normalizedState, StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (stateSpecificRegions.Any())
            {
                // If there's a specific state rule, it takes precedence
                return stateSpecificRegions.Any(x => !x.IsExcluded);
            }
        }

        // Check country-level rules (only those without specific state/province)
        var countryLevelRegions = relevantRegions
            .Where(r => string.IsNullOrWhiteSpace(r.StateOrProvinceCode))
            .ToList();

        if (countryLevelRegions.Any())
        {
            return countryLevelRegions.Any(x => !x.IsExcluded);
        }

        // If we only found state-specific rules but not for this state, deny
        return false;
    }
}
