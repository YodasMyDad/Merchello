using Merchello.Core.Locality.Models;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Warehouses.Services.Parameters;

public class CreateWarehouseParameters
{
    public required string Name { get; set; }
    public string? Code { get; set; }
    public Guid? SupplierId { get; set; }
    public Address? Address { get; set; }
    public string? AutomationMethod { get; set; }
    public Dictionary<string, object>? ExtendedData { get; set; }

    /// <summary>
    /// Fulfilment provider configuration override for this warehouse
    /// </summary>
    public Guid? FulfilmentProviderConfigurationId { get; set; }

    /// <summary>
    /// Service regions to add to the warehouse. Each tuple contains:
    /// - CountryCode: ISO 2-letter country code
    /// - RegionCode: State/province code (null for country-wide)
    /// - IsExcluded: Whether this region is excluded from service
    /// </summary>
    public List<(string CountryCode, string? RegionCode, bool IsExcluded)>? ServiceRegions { get; set; }

    /// <summary>
    /// Shipping options to add to the warehouse
    /// </summary>
    public List<ShippingOptionConfig>? ShippingOptions { get; set; }
}

