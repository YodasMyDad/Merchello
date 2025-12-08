namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// Summary DTO for warehouse list views.
/// </summary>
public class WarehouseListDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public string? Code { get; set; }
    public string? SupplierName { get; set; }
    public Guid? SupplierId { get; set; }
    public int ServiceRegionCount { get; set; }
    public int ShippingOptionCount { get; set; }

    /// <summary>
    /// Display-friendly address summary (e.g., "London, UK").
    /// </summary>
    public string? AddressSummary { get; set; }

    public DateTime DateUpdated { get; set; }
}

/// <summary>
/// Full detail DTO for warehouse editing including nested service regions.
/// </summary>
public class WarehouseDetailDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public string? Code { get; set; }
    public Guid? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public WarehouseAddressDto Address { get; set; } = new();
    public List<ServiceRegionDto> ServiceRegions { get; set; } = [];
    public int ShippingOptionCount { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime DateUpdated { get; set; }
}

/// <summary>
/// Address DTO for warehouse shipping origin.
/// </summary>
public class WarehouseAddressDto
{
    public string? Name { get; set; }
    public string? Company { get; set; }
    public string? AddressOne { get; set; }
    public string? AddressTwo { get; set; }
    public string? TownCity { get; set; }
    public string? CountyState { get; set; }
    public string? CountyStateCode { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? CountryCode { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
}

/// <summary>
/// DTO for service region entries.
/// </summary>
public class ServiceRegionDto
{
    public Guid Id { get; set; }
    public string CountryCode { get; set; } = null!;
    public string? StateOrProvinceCode { get; set; }
    public bool IsExcluded { get; set; }

    /// <summary>
    /// Display-friendly region name (e.g., "United States" or "California, US").
    /// </summary>
    public string? RegionDisplay { get; set; }
}

/// <summary>
/// DTO for creating a new warehouse.
/// </summary>
public class CreateWarehouseDto
{
    public required string Name { get; set; }
    public string? Code { get; set; }
    public Guid? SupplierId { get; set; }
    public WarehouseAddressDto? Address { get; set; }
}

/// <summary>
/// DTO for updating an existing warehouse.
/// </summary>
public class UpdateWarehouseDto
{
    public string? Name { get; set; }
    public string? Code { get; set; }
    public Guid? SupplierId { get; set; }

    /// <summary>
    /// If true, clears the SupplierId (sets it to null).
    /// </summary>
    public bool ClearSupplierId { get; set; }

    public WarehouseAddressDto? Address { get; set; }
}

/// <summary>
/// DTO for creating/updating a service region.
/// </summary>
public class CreateServiceRegionDto
{
    public required string CountryCode { get; set; }
    public string? StateOrProvinceCode { get; set; }
    public bool IsExcluded { get; set; }
}

/// <summary>
/// Lightweight DTO for supplier dropdown selection.
/// </summary>
public class SupplierListDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Code { get; set; }
}

/// <summary>
/// DTO for creating a supplier (quick create from warehouse form).
/// </summary>
public class CreateSupplierDto
{
    public required string Name { get; set; }
    public string? Code { get; set; }
}
