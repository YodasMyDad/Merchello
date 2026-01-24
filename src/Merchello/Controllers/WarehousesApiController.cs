using Asp.Versioning;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Suppliers.Services.Interfaces;
using Merchello.Core.Suppliers.Services.Parameters;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Warehouses.Dtos;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Parameters;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class WarehousesApiController(
    IWarehouseService warehouseService,
    ISupplierService supplierService,
    ILocationsService locationsService,
    IShippingService shippingService) : MerchelloApiControllerBase
{
    #region Warehouses

    /// <summary>
    /// Get all warehouses with summary data
    /// </summary>
    [HttpGet("warehouses")]
    [ProducesResponseType<List<WarehouseListDto>>(StatusCodes.Status200OK)]
    public async Task<List<WarehouseListDto>> GetWarehouses(CancellationToken ct)
    {
        return await warehouseService.GetWarehouseListAsync(ct);
    }

    /// <summary>
    /// Get warehouse by ID with full detail including service regions
    /// </summary>
    [HttpGet("warehouses/{id:guid}")]
    [ProducesResponseType<WarehouseDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetWarehouse(Guid id, CancellationToken ct)
    {
        var warehouse = await warehouseService.GetWarehouseDetailAsync(id, ct);
        return warehouse == null ? NotFound() : Ok(warehouse);
    }

    /// <summary>
    /// Create a new warehouse
    /// </summary>
    [HttpPost("warehouses")]
    [ProducesResponseType<WarehouseDetailDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateWarehouse([FromBody] CreateWarehouseDto dto, CancellationToken ct)
    {
        var parameters = new CreateWarehouseParameters
        {
            Name = dto.Name,
            Code = dto.Code,
            SupplierId = dto.SupplierId,
            Address = dto.Address != null ? MapAddressFromDto(dto.Address) : null
        };

        var result = await warehouseService.CreateWarehouse(parameters, ct);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to create warehouse.");
        }

        var detail = await warehouseService.GetWarehouseDetailAsync(result.ResultObject!.Id, ct);
        return CreatedAtAction(nameof(GetWarehouse), new { id = result.ResultObject.Id }, detail);
    }

    /// <summary>
    /// Update a warehouse
    /// </summary>
    [HttpPut("warehouses/{id:guid}")]
    [ProducesResponseType<WarehouseDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateWarehouse(Guid id, [FromBody] UpdateWarehouseDto dto, CancellationToken ct)
    {
        var parameters = new UpdateWarehouseParameters
        {
            WarehouseId = id,
            Name = dto.Name,
            Code = dto.Code,
            SupplierId = dto.SupplierId,
            ShouldClearSupplierId = dto.ShouldClearSupplierId,
            Address = dto.Address != null ? MapAddressFromDto(dto.Address) : null
        };

        var result = await warehouseService.UpdateWarehouse(parameters, ct);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to update warehouse.");
        }

        var detail = await warehouseService.GetWarehouseDetailAsync(id, ct);
        return Ok(detail);
    }

    /// <summary>
    /// Delete a warehouse
    /// </summary>
    [HttpDelete("warehouses/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteWarehouse(Guid id, [FromQuery] bool force = false, CancellationToken ct = default)
    {
        var result = await warehouseService.DeleteWarehouse(id, force, ct);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to delete warehouse.");
        }

        return NoContent();
    }

    #endregion

    #region Service Regions

    /// <summary>
    /// Add a service region to a warehouse
    /// </summary>
    [HttpPost("warehouses/{warehouseId:guid}/service-regions")]
    [ProducesResponseType<ServiceRegionDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddServiceRegion(Guid warehouseId, [FromBody] CreateServiceRegionDto dto, CancellationToken ct)
    {
        var result = await warehouseService.AddServiceRegionAsync(warehouseId, dto, ct);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to add service region.");
        }

        var region = result.ResultObject!;
        var regionDto = new ServiceRegionDto
        {
            Id = region.Id,
            CountryCode = region.CountryCode,
            StateOrProvinceCode = region.StateOrProvinceCode,
            IsExcluded = region.IsExcluded,
            RegionDisplay = BuildRegionDisplay(region.CountryCode, region.StateOrProvinceCode)
        };

        return Created($"/api/v1/warehouses/{warehouseId}/service-regions/{region.Id}", regionDto);
    }

    /// <summary>
    /// Update a service region
    /// </summary>
    [HttpPut("warehouses/{warehouseId:guid}/service-regions/{regionId:guid}")]
    [ProducesResponseType<ServiceRegionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateServiceRegion(Guid warehouseId, Guid regionId, [FromBody] CreateServiceRegionDto dto, CancellationToken ct)
    {
        var result = await warehouseService.UpdateServiceRegionAsync(warehouseId, regionId, dto, ct);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to update service region.");
        }

        var region = result.ResultObject!;
        return Ok(new ServiceRegionDto
        {
            Id = region.Id,
            CountryCode = region.CountryCode,
            StateOrProvinceCode = region.StateOrProvinceCode,
            IsExcluded = region.IsExcluded,
            RegionDisplay = BuildRegionDisplay(region.CountryCode, region.StateOrProvinceCode)
        });
    }

    /// <summary>
    /// Delete a service region
    /// </summary>
    [HttpDelete("warehouses/{warehouseId:guid}/service-regions/{regionId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteServiceRegion(Guid warehouseId, Guid regionId, CancellationToken ct)
    {
        var result = await warehouseService.DeleteServiceRegionAsync(warehouseId, regionId, ct);
        if (!result.Successful)
        {
            return NotFound();
        }

        return NoContent();
    }

    #endregion

    #region Available Destinations

    /// <summary>
    /// Get countries that a specific warehouse can service based on its service regions.
    /// If the warehouse has no service regions, returns all countries (unrestricted).
    /// </summary>
    [HttpGet("warehouses/{warehouseId:guid}/available-destinations")]
    [ProducesResponseType<List<DestinationDto>>(StatusCodes.Status200OK)]
    public async Task<List<DestinationDto>> GetAvailableDestinations(Guid warehouseId, CancellationToken ct)
    {
        var countries = await locationsService.GetAvailableCountriesForWarehouseAsync(warehouseId, ct);
        return countries.Select(c => new DestinationDto { Code = c.Code, Name = c.Name }).ToList();
    }

    /// <summary>
    /// Get regions (states/provinces) that a specific warehouse can service for a given country.
    /// </summary>
    [HttpGet("warehouses/{warehouseId:guid}/available-destinations/{countryCode}/regions")]
    [ProducesResponseType<List<RegionDto>>(StatusCodes.Status200OK)]
    public async Task<List<RegionDto>> GetAvailableRegions(Guid warehouseId, string countryCode, CancellationToken ct)
    {
        var regions = await locationsService.GetAvailableRegionsForWarehouseAsync(warehouseId, countryCode, ct);
        return regions.Select(r => new RegionDto { RegionCode = r.RegionCode, Name = r.Name }).ToList();
    }

    /// <summary>
    /// Get available shipping options for a warehouse and destination.
    /// Used by order create/edit modals after warehouse selection.
    /// </summary>
    [HttpGet("warehouses/{warehouseId:guid}/shipping-options")]
    [ProducesResponseType<WarehouseShippingOptionsResultDto>(StatusCodes.Status200OK)]
    public async Task<WarehouseShippingOptionsResultDto> GetShippingOptionsForWarehouse(
        Guid warehouseId,
        [FromQuery] string destinationCountryCode,
        [FromQuery] string? destinationStateCode = null,
        CancellationToken ct = default)
    {
        return await shippingService.GetShippingOptionsForWarehouseAsync(
            warehouseId,
            destinationCountryCode,
            destinationStateCode,
            ct);
    }

    #endregion

    #region Suppliers

    /// <summary>
    /// Get all suppliers with warehouse count
    /// </summary>
    [HttpGet("suppliers")]
    [ProducesResponseType<List<SupplierListDto>>(StatusCodes.Status200OK)]
    public async Task<List<SupplierListDto>> GetSuppliers(CancellationToken ct)
    {
        var suppliers = await supplierService.GetSuppliersAsync(ct);
        return suppliers
            .OrderBy(s => s.Name)
            .Select(s => new SupplierListDto
            {
                Id = s.Id,
                Name = s.Name,
                Code = s.Code,
                WarehouseCount = s.Warehouses?.Count ?? 0
            })
            .ToList();
    }

    /// <summary>
    /// Get a single supplier by ID
    /// </summary>
    [HttpGet("suppliers/{id:guid}")]
    [ProducesResponseType<SupplierListDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSupplier(Guid id, CancellationToken ct)
    {
        var supplier = await supplierService.GetSupplierByIdAsync(id, ct);
        if (supplier == null)
        {
            return NotFound();
        }

        return Ok(new SupplierListDto
        {
            Id = supplier.Id,
            Name = supplier.Name,
            Code = supplier.Code,
            WarehouseCount = supplier.Warehouses?.Count ?? 0
        });
    }

    /// <summary>
    /// Create a new supplier
    /// </summary>
    [HttpPost("suppliers")]
    [ProducesResponseType<SupplierListDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateSupplier([FromBody] CreateSupplierDto dto, CancellationToken ct)
    {
        var parameters = new CreateSupplierParameters
        {
            Name = dto.Name,
            Code = dto.Code
        };

        var result = await supplierService.CreateSupplierAsync(parameters, ct);
        if (!result.Successful)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to create supplier.");
        }

        var supplier = result.ResultObject!;
        var supplierDto = new SupplierListDto
        {
            Id = supplier.Id,
            Name = supplier.Name,
            Code = supplier.Code,
            WarehouseCount = 0
        };

        return Created($"/api/v1/suppliers/{supplier.Id}", supplierDto);
    }

    /// <summary>
    /// Update an existing supplier
    /// </summary>
    [HttpPut("suppliers/{id:guid}")]
    [ProducesResponseType<SupplierListDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateSupplier(Guid id, [FromBody] UpdateSupplierDto dto, CancellationToken ct)
    {
        var parameters = new UpdateSupplierParameters
        {
            SupplierId = id,
            Name = dto.Name,
            Code = dto.Code
        };

        var result = await supplierService.UpdateSupplierAsync(parameters, ct);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to update supplier.");
        }

        var supplier = result.ResultObject!;
        return Ok(new SupplierListDto
        {
            Id = supplier.Id,
            Name = supplier.Name,
            Code = supplier.Code,
            WarehouseCount = supplier.Warehouses?.Count ?? 0
        });
    }

    /// <summary>
    /// Delete a supplier
    /// </summary>
    [HttpDelete("suppliers/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteSupplier(Guid id, [FromQuery] bool force = false, CancellationToken ct = default)
    {
        var result = await supplierService.DeleteSupplierAsync(id, force, ct);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to delete supplier.");
        }

        return NoContent();
    }

    #endregion

    #region Helpers

    private static Address MapAddressFromDto(WarehouseAddressDto dto)
    {
        return new Address
        {
            Name = dto.Name,
            Company = dto.Company,
            AddressOne = dto.AddressOne,
            AddressTwo = dto.AddressTwo,
            TownCity = dto.TownCity,
            CountyState = new CountyState
            {
                Name = dto.CountyState,
                RegionCode = dto.CountyStateCode
            },
            PostalCode = dto.PostalCode,
            Country = dto.Country,
            CountryCode = dto.CountryCode,
            Email = dto.Email,
            Phone = dto.Phone
        };
    }

    private static string BuildRegionDisplay(string countryCode, string? stateOrProvinceCode)
    {
        // Returns ISO 3166-2 format (e.g., "US-CA", "GB-ENG")
        if (string.IsNullOrWhiteSpace(stateOrProvinceCode))
            return countryCode;
        return $"{countryCode}-{stateOrProvinceCode}";
    }

    #endregion
}
