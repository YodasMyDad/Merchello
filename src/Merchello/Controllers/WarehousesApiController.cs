using System.Text.Json;
using Asp.Versioning;
using Merchello.Core.Fulfilment.Providers.SupplierDirect;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Models;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Transport;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Suppliers.Models;
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
    IShippingService shippingService,
    IProductService productService,
    IFtpClientFactory ftpClientFactory,
    AddressFactory addressFactory) : MerchelloApiControllerBase
{
    #region Warehouses

    /// <summary>
    /// Get all warehouses with summary data
    /// </summary>
    [HttpGet("warehouses")]
    [ProducesResponseType<List<WarehouseListDto>>(StatusCodes.Status200OK)]
    public async Task<List<WarehouseListDto>> GetWarehouses([FromQuery] int maxResults = 1000, CancellationToken ct = default)
    {
        var warehouses = await warehouseService.GetWarehouseListAsync(ct);
        return warehouses.Take(maxResults).ToList();
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
            FulfilmentProviderConfigurationId = dto.FulfilmentProviderConfigurationId,
            Address = dto.Address != null ? MapAddressFromDto(dto.Address) : null
        };

        var result = await warehouseService.CreateWarehouse(parameters, ct);
        if (CrudError(result) is { } error) return error;

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
            FulfilmentProviderConfigurationId = dto.FulfilmentProviderConfigurationId,
            ShouldClearFulfilmentProviderId = dto.ShouldClearFulfilmentProviderId,
            Address = dto.Address != null ? MapAddressFromDto(dto.Address) : null
        };

        var result = await warehouseService.UpdateWarehouse(parameters, ct);
        if (CrudError(result) is { } error) return error;

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
        if (CrudError(result) is { } error) return error;

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
        if (CrudError(result) is { } error) return error;

        var region = result.ResultObject!;
        var regionDto = new ServiceRegionDto
        {
            Id = region.Id,
            CountryCode = region.CountryCode,
            RegionCode = region.RegionCode,
            IsExcluded = region.IsExcluded,
            RegionDisplay = BuildRegionDisplay(region.CountryCode, region.RegionCode)
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
        if (CrudError(result) is { } error) return error;

        var region = result.ResultObject!;
        return Ok(new ServiceRegionDto
        {
            Id = region.Id,
            CountryCode = region.CountryCode,
            RegionCode = region.RegionCode,
            IsExcluded = region.IsExcluded,
            RegionDisplay = BuildRegionDisplay(region.CountryCode, region.RegionCode)
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
        if (CrudError(result) is { } error) return error;

        return NoContent();
    }

    #endregion

    #region Warehouse Products

    /// <summary>
    /// Get paginated products assigned to a warehouse
    /// </summary>
    [HttpGet("warehouses/{warehouseId:guid}/products")]
    [ProducesResponseType<ProductPageDto>(StatusCodes.Status200OK)]
    public async Task<ProductPageDto> GetWarehouseProducts(
        Guid warehouseId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        var result = await productService.QueryProductsSummary(
            new ProductQueryParameters
            {
                WarehouseId = warehouseId,
                CurrentPage = page,
                AmountPerPage = pageSize,
                Search = search,
                OrderBy = ProductOrderBy.WarehousePriority
            },
            ct);

        return new ProductPageDto
        {
            Items = result.Items.ToList(),
            Page = result.PageIndex,
            PageSize = pageSize,
            TotalItems = result.TotalItems,
            TotalPages = result.TotalPages
        };
    }

    /// <summary>
    /// Add products to a warehouse
    /// </summary>
    [HttpPost("warehouses/{warehouseId:guid}/products")]
    [ProducesResponseType<int>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddProductsToWarehouse(
        Guid warehouseId,
        [FromBody] AddProductsToWarehouseDto dto,
        CancellationToken ct)
    {
        var result = await warehouseService.AddProductsToWarehouseAsync(warehouseId, dto.ProductRootIds, ct);
        if (CrudError(result) is { } error) return error;
        return Ok(result.ResultObject);
    }

    /// <summary>
    /// Remove products from a warehouse
    /// </summary>
    [HttpPost("warehouses/{warehouseId:guid}/products/remove")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RemoveProductsFromWarehouse(
        Guid warehouseId,
        [FromBody] RemoveProductsFromWarehouseDto dto,
        CancellationToken ct)
    {
        var result = await warehouseService.RemoveProductsFromWarehouseAsync(warehouseId, dto.ProductRootIds, ct);
        if (CrudError(result) is { } error) return error;
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
        var countries = await locationsService.GetAvailableCountriesForWarehouseAsync(
            new GetAvailableCountriesForWarehouseParameters { WarehouseId = warehouseId },
            ct);
        return countries.Select(c => new DestinationDto { Code = c.Code, Name = c.Name }).ToList();
    }

    /// <summary>
    /// Get regions (states/provinces) that a specific warehouse can service for a given country.
    /// </summary>
    [HttpGet("warehouses/{warehouseId:guid}/available-destinations/{countryCode}/regions")]
    [ProducesResponseType<List<RegionDto>>(StatusCodes.Status200OK)]
    public async Task<List<RegionDto>> GetAvailableRegions(Guid warehouseId, string countryCode, CancellationToken ct)
    {
        var regions = await locationsService.GetAvailableRegionsForWarehouseAsync(
            new GetAvailableRegionsForWarehouseParameters
            {
                WarehouseId = warehouseId,
                CountryCode = countryCode
            },
            ct);
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
    public async Task<List<SupplierListDto>> GetSuppliers([FromQuery] int maxResults = 1000, CancellationToken ct = default)
    {
        var suppliers = await supplierService.GetSuppliersAsync(ct);
        return suppliers
            .OrderBy(s => s.Name)
            .Take(maxResults)
            .Select(s => new SupplierListDto
            {
                Id = s.Id,
                Name = s.Name,
                Code = s.Code,
                WarehouseCount = s.Warehouses?.Count ?? 0,
                FulfilmentProviderConfigurationId = s.DefaultFulfilmentProviderConfigurationId,
                FulfilmentProviderName = s.DefaultFulfilmentProviderConfiguration?.DisplayName
            })
            .ToList();
    }

    /// <summary>
    /// Get a single supplier by ID with full detail
    /// </summary>
    [HttpGet("suppliers/{id:guid}")]
    [ProducesResponseType<SupplierDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSupplier(Guid id, CancellationToken ct)
    {
        var supplier = await supplierService.GetSupplierByIdAsync(id, ct);
        if (supplier == null)
        {
            return NotFound();
        }

        return Ok(MapToSupplierDetailDto(supplier));
    }

    /// <summary>
    /// Create a new supplier
    /// </summary>
    [HttpPost("suppliers")]
    [ProducesResponseType<SupplierDetailDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateSupplier([FromBody] CreateSupplierDto dto, CancellationToken ct)
    {
        if (dto.SupplierDirectProfile != null)
        {
            var profileValidationError = ValidateSupplierDirectProfile(dto.SupplierDirectProfile);
            if (profileValidationError != null)
            {
                return BadRequest(profileValidationError);
            }
        }

        var extendedData = new Dictionary<string, object>();

        // Serialize SupplierDirect profile if provided
        if (dto.SupplierDirectProfile != null)
        {
            var profile = MapFromProfileDto(dto.SupplierDirectProfile);
            extendedData[SupplierDirectExtendedDataKeys.Profile] = profile.ToJson();
        }

        var parameters = new CreateSupplierParameters
        {
            Name = dto.Name,
            Code = dto.Code,
            ContactName = dto.ContactName,
            ContactEmail = dto.ContactEmail,
            ContactPhone = dto.ContactPhone,
            DefaultFulfilmentProviderConfigurationId = dto.FulfilmentProviderConfigurationId,
            ExtendedData = extendedData.Count > 0 ? extendedData : null
        };

        var result = await supplierService.CreateSupplierAsync(parameters, ct);
        if (CrudError(result) is { } error) return error;

        var supplier = result.ResultObject!;
        return Created($"/api/v1/suppliers/{supplier.Id}", MapToSupplierDetailDto(supplier));
    }

    /// <summary>
    /// Update an existing supplier
    /// </summary>
    [HttpPut("suppliers/{id:guid}")]
    [ProducesResponseType<SupplierDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateSupplier(Guid id, [FromBody] UpdateSupplierDto dto, CancellationToken ct)
    {
        // Get existing supplier to merge ExtendedData
        var existingSupplier = await supplierService.GetSupplierByIdAsync(id, ct);
        if (existingSupplier == null)
        {
            return NotFound("Supplier not found");
        }

        // Build ExtendedData with profile changes
        var extendedData = new Dictionary<string, object>(existingSupplier.ExtendedData ?? []);
        SupplierDirectProfile? existingProfile = null;
        if (extendedData.TryGetValue(SupplierDirectExtendedDataKeys.Profile, out var existingProfileRaw))
        {
            existingProfile = SupplierDirectProfile.FromJson(existingProfileRaw?.UnwrapJsonElement()?.ToString());
        }

        if (dto.ShouldClearSupplierDirectProfile)
        {
            extendedData.Remove(SupplierDirectExtendedDataKeys.Profile);
        }
        else if (dto.SupplierDirectProfile != null)
        {
            var profileValidationError = ValidateSupplierDirectProfile(dto.SupplierDirectProfile, existingProfile);
            if (profileValidationError != null)
            {
                return BadRequest(profileValidationError);
            }

            var profile = MapFromProfileDto(dto.SupplierDirectProfile, existingProfile);
            extendedData[SupplierDirectExtendedDataKeys.Profile] = profile.ToJson();
        }

        var parameters = new UpdateSupplierParameters
        {
            SupplierId = id,
            Name = dto.Name,
            Code = dto.Code,
            ContactName = dto.ContactName,
            ContactEmail = dto.ContactEmail,
            ContactPhone = dto.ContactPhone,
            DefaultFulfilmentProviderConfigurationId = dto.FulfilmentProviderConfigurationId,
            ShouldClearDefaultFulfilmentProviderId = dto.ShouldClearFulfilmentProviderId,
            ExtendedData = extendedData
        };

        var result = await supplierService.UpdateSupplierAsync(parameters, ct);
        if (CrudError(result) is { } error) return error;

        var supplier = result.ResultObject!;
        return Ok(MapToSupplierDetailDto(supplier));
    }

    /// <summary>
    /// Test FTP/SFTP connection settings for a supplier direct profile.
    /// </summary>
    [HttpPost("suppliers/test-ftp-connection")]
    [ProducesResponseType<TestSupplierFtpConnectionResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TestSupplierFtpConnection(
        [FromBody] TestSupplierFtpConnectionDto dto,
        CancellationToken ct = default)
    {
        if (!Enum.TryParse<SupplierDirectDeliveryMethod>(dto.DeliveryMethod, true, out var deliveryMethod) ||
            deliveryMethod is not (SupplierDirectDeliveryMethod.Ftp or SupplierDirectDeliveryMethod.Sftp))
        {
            return BadRequest("DeliveryMethod must be either 'Ftp' or 'Sftp'.");
        }

        if (dto.FtpSettings == null)
        {
            return BadRequest("FtpSettings is required.");
        }

        var host = dto.FtpSettings.Host?.Trim();
        var username = dto.FtpSettings.Username?.Trim();
        var password = dto.FtpSettings.Password;

        if (string.IsNullOrWhiteSpace(host))
        {
            return BadRequest("FtpSettings.host is required.");
        }

        if (string.IsNullOrWhiteSpace(username))
        {
            return BadRequest("FtpSettings.username is required.");
        }

        if (dto.FtpSettings.Port is { } invalidPort && invalidPort <= 0)
        {
            return BadRequest("FtpSettings.port must be greater than 0.");
        }

        if (string.IsNullOrWhiteSpace(password) && dto.SupplierId.HasValue)
        {
            var supplier = await supplierService.GetSupplierByIdAsync(dto.SupplierId.Value, ct);
            if (supplier == null)
            {
                return NotFound("Supplier not found.");
            }

            if (supplier.ExtendedData?.TryGetValue(SupplierDirectExtendedDataKeys.Profile, out var profileObj) == true)
            {
                var profileJson = profileObj.UnwrapJsonElement()?.ToString();
                var profile = SupplierDirectProfile.FromJson(profileJson);
                password = profile?.FtpSettings?.Password;
            }
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            return BadRequest("FtpSettings.password is required.");
        }

        var useSftp = deliveryMethod == SupplierDirectDeliveryMethod.Sftp;
        var port = dto.FtpSettings.Port ?? (useSftp
            ? SupplierDirectProviderDefaults.DefaultSftpPort
            : SupplierDirectProviderDefaults.DefaultFtpPort);
        var remotePath = string.IsNullOrWhiteSpace(dto.FtpSettings.RemotePath)
            ? SupplierDirectProviderDefaults.DefaultRemotePath
            : dto.FtpSettings.RemotePath.Trim();
        var resolvedHost = host!;
        var resolvedUsername = username!;
        var resolvedPassword = password!;

        var connectionSettings = new FtpConnectionSettings
        {
            Host = resolvedHost,
            Port = port,
            Username = resolvedUsername,
            Password = resolvedPassword,
            RemotePath = remotePath,
            UseSftp = useSftp,
            HostFingerprint = useSftp
                ? dto.FtpSettings.HostFingerprint?.Trim()
                : null,
            TimeoutSeconds = SupplierDirectProviderDefaults.DefaultTimeoutSeconds
        };

        try
        {
            await using var client = await ftpClientFactory.CreateClientAsync(connectionSettings, ct);
            var testResult = await client.TestConnectionAsync(ct);

            return Ok(new TestSupplierFtpConnectionResultDto
            {
                Success = testResult.Success,
                ErrorMessage = testResult.ErrorMessage
            });
        }
        catch (Exception ex)
        {
            var safeError = SupplierDirectSecretRedactor.RedactSecrets(ex.Message);
            return Ok(new TestSupplierFtpConnectionResultDto
            {
                Success = false,
                ErrorMessage = safeError
            });
        }
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
        if (CrudError(result) is { } error) return error;

        return NoContent();
    }

    #endregion

    #region Helpers

    private Address MapAddressFromDto(AddressDto dto)
    {
        var address = addressFactory.CreateAddress(
            dto.Name,
            dto.AddressOne,
            dto.AddressTwo,
            dto.TownCity,
            dto.PostalCode,
            dto.CountryCode,
            dto.CountyState,
            dto.RegionCode,
            dto.Company,
            dto.Phone,
            dto.Email);
        address.Country = dto.Country;
        return address;
    }

    private static string BuildRegionDisplay(string countryCode, string? regionCode)
    {
        // Returns ISO 3166-2 format (e.g., "US-CA", "GB-ENG")
        if (string.IsNullOrWhiteSpace(regionCode))
            return countryCode;
        return $"{countryCode}-{regionCode}";
    }

    private static SupplierDetailDto MapToSupplierDetailDto(Supplier supplier)
    {
        var dto = new SupplierDetailDto
        {
            Id = supplier.Id,
            Name = supplier.Name,
            Code = supplier.Code,
            WarehouseCount = supplier.Warehouses?.Count ?? 0,
            ContactName = supplier.ContactName,
            ContactEmail = supplier.ContactEmail,
            ContactPhone = supplier.ContactPhone,
            FulfilmentProviderConfigurationId = supplier.DefaultFulfilmentProviderConfigurationId,
            FulfilmentProviderName = supplier.DefaultFulfilmentProviderConfiguration?.DisplayName,
            DateCreated = supplier.DateCreated,
            DateUpdated = supplier.DateUpdated
        };

        // Deserialize SupplierDirect profile if present
        if (supplier.ExtendedData?.TryGetValue(SupplierDirectExtendedDataKeys.Profile, out var profileObj) == true)
        {
            var profileJson = profileObj.UnwrapJsonElement()?.ToString();
            if (!string.IsNullOrWhiteSpace(profileJson))
            {
                var profile = SupplierDirectProfile.FromJson(profileJson);
                if (profile != null)
                {
                    dto.SupplierDirectProfile = MapToProfileDto(profile);
                }
            }
        }

        return dto;
    }

    private static SupplierDirectProfileDto MapToProfileDto(SupplierDirectProfile profile)
    {
        return new SupplierDirectProfileDto
        {
            DeliveryMethod = profile.DeliveryMethod.ToString(),
            EmailSettings = profile.EmailSettings != null
                ? new EmailDeliverySettingsDto
                {
                    RecipientEmail = profile.EmailSettings.RecipientEmail,
                    CcAddresses = profile.EmailSettings.CcAddresses?.ToList()
                }
                : null,
            FtpSettings = profile.FtpSettings != null
                ? new FtpDeliverySettingsDto
                {
                    Host = profile.FtpSettings.Host,
                    Port = profile.FtpSettings.Port,
                    Username = profile.FtpSettings.Username,
                    // Note: Password is intentionally not returned for security
                    RemotePath = profile.FtpSettings.RemotePath,
                    UseSftp = profile.FtpSettings.UseSftp,
                    HostFingerprint = profile.FtpSettings.HostFingerprint
                }
                : null,
            CsvSettings = profile.CsvSettings != null
                ? new CsvDeliverySettingsDto
                {
                    Columns = profile.CsvSettings.Columns.Count > 0
                        ? new Dictionary<string, string>(profile.CsvSettings.Columns)
                        : null,
                    StaticColumns = profile.CsvSettings.StaticColumns.Count > 0
                        ? new Dictionary<string, string>(profile.CsvSettings.StaticColumns)
                        : null
                }
                : null
        };
    }

    private static SupplierDirectProfile MapFromProfileDto(
        SupplierDirectProfileDto dto,
        SupplierDirectProfile? existingProfile = null)
    {
        // Parse delivery method
        var deliveryMethod = Enum.TryParse<SupplierDirectDeliveryMethod>(dto.DeliveryMethod, true, out var method)
            ? method
            : SupplierDirectDeliveryMethod.Email;

        return new SupplierDirectProfile
        {
            DeliveryMethod = deliveryMethod,
            EmailSettings = dto.EmailSettings != null
                ? new EmailDeliverySettings
                {
                    RecipientEmail = dto.EmailSettings.RecipientEmail,
                    CcAddresses = dto.EmailSettings.CcAddresses?.ToList()
                }
                : existingProfile?.EmailSettings,
            FtpSettings = dto.FtpSettings != null
                ? new FtpDeliverySettings
                {
                    Host = dto.FtpSettings.Host,
                    Port = dto.FtpSettings.Port,
                    Username = dto.FtpSettings.Username,
                    Password = !string.IsNullOrWhiteSpace(dto.FtpSettings.Password)
                        ? dto.FtpSettings.Password
                        : existingProfile?.FtpSettings?.Password,
                    RemotePath = dto.FtpSettings.RemotePath,
                    UseSftp = dto.FtpSettings.UseSftp,
                    HostFingerprint = dto.FtpSettings.HostFingerprint
                }
                : existingProfile?.FtpSettings,
            CsvSettings = dto.CsvSettings != null
                ? BuildCsvSettings(dto.CsvSettings)
                : existingProfile?.CsvSettings
        };
    }

    private static string? ValidateSupplierDirectProfile(
        SupplierDirectProfileDto dto,
        SupplierDirectProfile? existingProfile = null)
    {
        if (!Enum.TryParse<SupplierDirectDeliveryMethod>(dto.DeliveryMethod, true, out var deliveryMethod))
        {
            return "SupplierDirectProfile.deliveryMethod must be one of: Email, Ftp, Sftp.";
        }

        if (dto.EmailSettings?.RecipientEmail is { } recipientEmail &&
            !string.IsNullOrWhiteSpace(recipientEmail) &&
            !IsValidEmailAddress(recipientEmail))
        {
            return "SupplierDirectProfile.emailSettings.recipientEmail is invalid.";
        }

        var ccAddresses = dto.EmailSettings?.CcAddresses?
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .ToList() ?? [];
        if (ccAddresses.Any(cc => !IsValidEmailAddress(cc)))
        {
            return "SupplierDirectProfile.emailSettings.ccAddresses contains an invalid email address.";
        }

        if (dto.FtpSettings?.Port is { } port && port <= 0)
        {
            return "SupplierDirectProfile.ftpSettings.port must be greater than 0.";
        }

        if (dto.CsvSettings != null)
        {
            var csvValidationError = ValidateCsvSettings(dto.CsvSettings);
            if (csvValidationError != null)
            {
                return csvValidationError;
            }
        }

        if (deliveryMethod is SupplierDirectDeliveryMethod.Ftp or SupplierDirectDeliveryMethod.Sftp)
        {
            if (dto.FtpSettings?.Password != null &&
                string.IsNullOrWhiteSpace(dto.FtpSettings.Password) &&
                string.IsNullOrWhiteSpace(existingProfile?.FtpSettings?.Password))
            {
                return "SupplierDirectProfile.ftpSettings.password cannot be empty when no existing password is stored.";
            }
        }

        return null;
    }

    private static CsvColumnMapping? BuildCsvSettings(CsvDeliverySettingsDto dto)
    {
        var columns = NormalizeDictionary(dto.Columns, allowEmptyValue: false);
        var staticColumns = NormalizeDictionary(dto.StaticColumns, allowEmptyValue: true);

        if (columns.Count == 0 && staticColumns.Count == 0)
        {
            return null;
        }

        return new CsvColumnMapping
        {
            Columns = columns,
            StaticColumns = staticColumns
        };
    }

    private static Dictionary<string, string> NormalizeDictionary(
        Dictionary<string, string>? source,
        bool allowEmptyValue)
    {
        var normalized = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        if (source == null)
        {
            return normalized;
        }

        foreach (var entry in source)
        {
            var key = entry.Key?.Trim();
            if (string.IsNullOrWhiteSpace(key))
            {
                continue;
            }

            var value = entry.Value?.Trim() ?? string.Empty;
            if (!allowEmptyValue && string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            normalized[key] = value;
        }

        return normalized;
    }

    private static string? ValidateCsvSettings(CsvDeliverySettingsDto dto)
    {
        if (dto.Columns != null)
        {
            var seenFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var column in dto.Columns)
            {
                if (string.IsNullOrWhiteSpace(column.Key))
                {
                    return "SupplierDirectProfile.csvSettings.columns has an empty field key.";
                }

                if (!seenFields.Add(column.Key.Trim()))
                {
                    return $"SupplierDirectProfile.csvSettings.columns contains a duplicate field key '{column.Key}'.";
                }

                if (string.IsNullOrWhiteSpace(column.Value))
                {
                    return $"SupplierDirectProfile.csvSettings.columns field '{column.Key}' requires a header value.";
                }
            }
        }

        if (dto.StaticColumns != null)
        {
            var seenHeaders = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var staticColumn in dto.StaticColumns)
            {
                if (string.IsNullOrWhiteSpace(staticColumn.Key))
                {
                    return "SupplierDirectProfile.csvSettings.staticColumns has an empty header key.";
                }

                if (!seenHeaders.Add(staticColumn.Key.Trim()))
                {
                    return $"SupplierDirectProfile.csvSettings.staticColumns contains a duplicate header '{staticColumn.Key}'.";
                }
            }
        }

        return null;
    }

    private static bool IsValidEmailAddress(string email)
    {
        try
        {
            _ = new System.Net.Mail.MailAddress(email);
            return true;
        }
        catch
        {
            return false;
        }
    }

    #endregion
}
