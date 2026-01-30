using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Warehouses.Models;

public class WarehouseServiceRegion
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    // JSON-stored: no navigation properties

    /// <summary>
    /// ISO 3166-1 alpha-2 country code, e.g. "US" or "GB"
    /// </summary>
    public string CountryCode { get; set; } = null!;

    /// <summary>
    /// Optional state/province code (ISO 3166-2 where available or custom code)
    /// </summary>
    public string? StateOrProvinceCode { get; set; }

    /// <summary>
    /// If set, this region is treated as an explicit exclusion
    /// </summary>
    public bool IsExcluded { get; set; }
}
