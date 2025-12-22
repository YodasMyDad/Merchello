using System.Text.Json;
using Asp.Versioning;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Discounts.Dtos;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Discounts.Services.Parameters;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Suppliers.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class DiscountsApiController(
    IDiscountService discountService,
    IProductService productService,
    ISupplierService supplierService,
    IWarehouseService warehouseService,
    ICustomerService customerService,
    ICustomerSegmentService customerSegmentService) : MerchelloApiControllerBase
{
    #region Discount CRUD

    /// <summary>
    /// Get discounts with filtering and pagination
    /// </summary>
    [HttpGet("discounts")]
    [ProducesResponseType<DiscountPageDto>(StatusCodes.Status200OK)]
    public async Task<DiscountPageDto> GetDiscounts(
        [FromQuery] DiscountStatus? status,
        [FromQuery] DiscountCategory? category,
        [FromQuery] DiscountMethod? method,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] DiscountOrderBy orderBy = DiscountOrderBy.DateCreated,
        [FromQuery] bool descending = true,
        CancellationToken ct = default)
    {
        var parameters = new DiscountQueryParameters
        {
            Status = status,
            Category = category,
            Method = method,
            SearchTerm = search,
            Page = page,
            PageSize = pageSize,
            OrderBy = orderBy,
            Descending = descending
        };

        var result = await discountService.QueryAsync(parameters, ct);

        // Get usage counts for all discounts on this page in a single query
        var discountIds = result.Items.Select(d => d.Id).ToList();
        var usageCounts = await discountService.GetUsageCountsAsync(discountIds, ct);

        return new DiscountPageDto
        {
            Items = result.Items.Select(d => MapToListItemDto(d, usageCounts.GetValueOrDefault(d.Id, 0))).ToList(),
            Page = result.PageIndex,
            PageSize = pageSize,
            TotalItems = result.TotalItems,
            TotalPages = result.TotalPages,
            HasPreviousPage = result.HasPreviousPage,
            HasNextPage = result.HasNextPage
        };
    }

    /// <summary>
    /// Get a discount by ID
    /// </summary>
    [HttpGet("discounts/{id:guid}")]
    [ProducesResponseType<DiscountDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDiscount(Guid id, CancellationToken ct)
    {
        var discount = await discountService.GetByIdAsync(id, ct);
        if (discount == null)
        {
            return NotFound();
        }

        var usageCount = await discountService.GetUsageCountAsync(id, ct);
        var dto = MapToDetailDto(discount, usageCount);

        // Resolve target rule names
        await ResolveTargetRuleNamesAsync(dto.TargetRules, ct);

        // Resolve eligibility rule names
        await ResolveEligibilityRuleNamesAsync(dto.EligibilityRules, ct);

        return Ok(dto);
    }

    /// <summary>
    /// Create a new discount
    /// </summary>
    [HttpPost("discounts")]
    [ProducesResponseType<DiscountDetailDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateDiscount([FromBody] CreateDiscountDto dto, CancellationToken ct)
    {
        var parameters = MapToCreateParameters(dto);

        var result = await discountService.CreateAsync(parameters, ct);
        if (!result.Successful)
        {
            var errors = result.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message);
            return BadRequest(new { errors });
        }

        var discount = await discountService.GetByIdAsync(result.ResultObject!.Id, ct);
        var detailDto = MapToDetailDto(discount!, 0); // New discount has 0 usage

        // Resolve target and eligibility rule names
        await ResolveTargetRuleNamesAsync(detailDto.TargetRules, ct);
        await ResolveEligibilityRuleNamesAsync(detailDto.EligibilityRules, ct);

        return CreatedAtAction(nameof(GetDiscount), new { id = discount!.Id }, detailDto);
    }

    /// <summary>
    /// Update a discount
    /// </summary>
    [HttpPut("discounts/{id:guid}")]
    [ProducesResponseType<DiscountDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateDiscount(Guid id, [FromBody] UpdateDiscountDto dto, CancellationToken ct)
    {
        var parameters = MapToUpdateParameters(dto);

        var result = await discountService.UpdateAsync(id, parameters, ct);
        if (!result.Successful)
        {
            var errors = result.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message);

            if (errors.Any(e => e?.Contains("not found", StringComparison.OrdinalIgnoreCase) == true))
            {
                return NotFound();
            }

            return BadRequest(new { errors });
        }

        var discount = await discountService.GetByIdAsync(id, ct);
        var usageCount = await discountService.GetUsageCountAsync(id, ct);
        var detailDto = MapToDetailDto(discount!, usageCount);

        // Resolve target and eligibility rule names
        await ResolveTargetRuleNamesAsync(detailDto.TargetRules, ct);
        await ResolveEligibilityRuleNamesAsync(detailDto.EligibilityRules, ct);

        return Ok(detailDto);
    }

    /// <summary>
    /// Delete a discount
    /// </summary>
    [HttpDelete("discounts/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteDiscount(Guid id, CancellationToken ct)
    {
        var result = await discountService.DeleteAsync(id, ct);
        if (!result.Successful)
        {
            var errors = result.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message);

            if (errors.Any(e => e?.Contains("not found", StringComparison.OrdinalIgnoreCase) == true))
            {
                return NotFound();
            }

            return BadRequest(new { errors });
        }

        return NoContent();
    }

    #endregion

    #region Status Management

    /// <summary>
    /// Activate a discount
    /// </summary>
    [HttpPost("discounts/{id:guid}/activate")]
    [ProducesResponseType<DiscountDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ActivateDiscount(Guid id, CancellationToken ct)
    {
        var result = await discountService.ActivateAsync(id, ct);
        if (!result.Successful)
        {
            var errors = result.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message);

            if (errors.Any(e => e?.Contains("not found", StringComparison.OrdinalIgnoreCase) == true))
            {
                return NotFound();
            }

            return BadRequest(new { errors });
        }

        var discount = await discountService.GetByIdAsync(id, ct);
        var usageCount = await discountService.GetUsageCountAsync(id, ct);
        var dto = MapToDetailDto(discount!, usageCount);

        // Resolve target and eligibility rule names
        await ResolveTargetRuleNamesAsync(dto.TargetRules, ct);
        await ResolveEligibilityRuleNamesAsync(dto.EligibilityRules, ct);

        return Ok(dto);
    }

    /// <summary>
    /// Deactivate a discount
    /// </summary>
    [HttpPost("discounts/{id:guid}/deactivate")]
    [ProducesResponseType<DiscountDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeactivateDiscount(Guid id, CancellationToken ct)
    {
        var result = await discountService.DeactivateAsync(id, ct);
        if (!result.Successful)
        {
            var errors = result.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message);

            if (errors.Any(e => e?.Contains("not found", StringComparison.OrdinalIgnoreCase) == true))
            {
                return NotFound();
            }

            return BadRequest(new { errors });
        }

        var discount = await discountService.GetByIdAsync(id, ct);
        var usageCount = await discountService.GetUsageCountAsync(id, ct);
        var dto = MapToDetailDto(discount!, usageCount);

        // Resolve target and eligibility rule names
        await ResolveTargetRuleNamesAsync(dto.TargetRules, ct);
        await ResolveEligibilityRuleNamesAsync(dto.EligibilityRules, ct);

        return Ok(dto);
    }

    #endregion

    #region Code Management

    /// <summary>
    /// Generate a unique discount code
    /// </summary>
    [HttpGet("discounts/generate-code")]
    [ProducesResponseType<object>(StatusCodes.Status200OK)]
    public IActionResult GenerateCode([FromQuery] int length = 8)
    {
        var code = discountService.GenerateUniqueCode(length);
        return Ok(new { code });
    }

    /// <summary>
    /// Validate a discount code is available
    /// </summary>
    [HttpGet("discounts/validate-code")]
    [ProducesResponseType<object>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ValidateCode(
        [FromQuery] string code,
        [FromQuery] Guid? excludeId,
        CancellationToken ct)
    {
        var isAvailable = await discountService.IsCodeAvailableAsync(code, excludeId, ct);
        return Ok(new { isAvailable });
    }

    #endregion

    #region Reporting

    /// <summary>
    /// Get performance metrics for a discount
    /// </summary>
    [HttpGet("discounts/{id:guid}/performance")]
    [ProducesResponseType<DiscountPerformanceDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPerformance(
        Guid id,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        CancellationToken ct)
    {
        var result = await discountService.GetPerformanceAsync(id, startDate, endDate, ct);
        if (result == null)
        {
            return NotFound();
        }
        return Ok(result);
    }

    /// <summary>
    /// Get aggregated usage summary for multiple discounts
    /// </summary>
    [HttpGet("discounts/usage-report")]
    [ProducesResponseType<List<DiscountUsageSummaryDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsageReport(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] DiscountStatus? status,
        [FromQuery] DiscountCategory? category,
        [FromQuery] DiscountMethod? method,
        [FromQuery] int? top,
        [FromQuery] DiscountReportOrderBy orderBy = DiscountReportOrderBy.TotalUsage,
        [FromQuery] bool descending = true,
        CancellationToken ct = default)
    {
        var parameters = new DiscountReportParameters
        {
            StartDate = startDate,
            EndDate = endDate,
            Status = status,
            Category = category,
            Method = method,
            Top = top,
            OrderBy = orderBy,
            Descending = descending
        };

        var result = await discountService.GetUsageSummaryAsync(parameters, ct);
        return Ok(result);
    }

    #endregion

    #region Name Resolution Helpers

    /// <summary>
    /// Resolves names for target rule IDs based on target type.
    /// </summary>
    private async Task ResolveTargetRuleNamesAsync(List<DiscountTargetRuleDto> rules, CancellationToken ct)
    {
        foreach (var rule in rules)
        {
            if (rule.TargetIds == null || rule.TargetIds.Count == 0)
            {
                rule.TargetNames = [];
                continue;
            }

            rule.TargetNames = rule.TargetType switch
            {
                DiscountTargetType.SpecificProducts => await GetProductNamesAsync(rule.TargetIds, ct),
                DiscountTargetType.Collections => await GetCollectionNamesAsync(rule.TargetIds, ct),
                DiscountTargetType.ProductTypes => await GetProductTypeNamesAsync(rule.TargetIds, ct),
                DiscountTargetType.ProductFilters => await GetFilterNamesAsync(rule.TargetIds, ct),
                DiscountTargetType.Suppliers => await GetSupplierNamesAsync(rule.TargetIds, ct),
                DiscountTargetType.Warehouses => await GetWarehouseNamesAsync(rule.TargetIds, ct),
                _ => []
            };
        }
    }

    /// <summary>
    /// Resolves names for eligibility rule IDs based on eligibility type.
    /// </summary>
    private async Task ResolveEligibilityRuleNamesAsync(List<DiscountEligibilityRuleDto> rules, CancellationToken ct)
    {
        foreach (var rule in rules)
        {
            if (rule.EligibilityIds == null || rule.EligibilityIds.Count == 0)
            {
                rule.EligibilityNames = [];
                continue;
            }

            rule.EligibilityNames = rule.EligibilityType switch
            {
                DiscountEligibilityType.SpecificCustomers => await GetCustomerNamesAsync(rule.EligibilityIds, ct),
                DiscountEligibilityType.CustomerSegments => await GetCustomerSegmentNamesAsync(rule.EligibilityIds, ct),
                _ => []
            };
        }
    }

    private async Task<List<string>> GetProductNamesAsync(List<Guid> ids, CancellationToken ct)
    {
        // Query products by ID
        var names = new List<string>();
        foreach (var id in ids)
        {
            var product = await productService.GetProduct(new GetProductParameters { ProductId = id }, ct);
            if (product != null)
            {
                names.Add(product.ProductRoot?.RootName ?? product.Sku ?? "Unknown Product");
            }
        }
        return names;
    }

    private async Task<List<string>> GetCollectionNamesAsync(List<Guid> ids, CancellationToken ct)
    {
        var allCollections = await productService.GetProductCollections(ct) ?? [];
        if (allCollections.Count == 0)
        {
            return [];
        }

        var idSet = ids.ToHashSet();
        return allCollections
            .Where(c => idSet.Contains(c.Id))
            .Select(c => c.Name ?? "Unknown Collection")
            .ToList();
    }

    private async Task<List<string>> GetProductTypeNamesAsync(List<Guid> ids, CancellationToken ct)
    {
        var allTypes = await productService.GetProductTypes(ct) ?? [];
        if (allTypes.Count == 0)
        {
            return [];
        }

        var idSet = ids.ToHashSet();
        return allTypes
            .Where(t => idSet.Contains(t.Id))
            .Select(t => t.Name ?? "Unknown Type")
            .ToList();
    }

    private async Task<List<string>> GetFilterNamesAsync(List<Guid> ids, CancellationToken ct)
    {
        var names = new List<string>();
        foreach (var id in ids)
        {
            var filter = await productService.GetFilter(id, ct);
            if (filter != null)
            {
                names.Add(filter.Name ?? "Unknown Filter");
            }
        }
        return names;
    }

    private async Task<List<string>> GetSupplierNamesAsync(List<Guid> ids, CancellationToken ct)
    {
        var allSuppliers = await supplierService.GetSuppliersAsync(ct) ?? [];
        if (allSuppliers.Count == 0)
        {
            return [];
        }

        var idSet = ids.ToHashSet();
        return allSuppliers
            .Where(s => idSet.Contains(s.Id))
            .Select(s => s.Name)
            .ToList();
    }

    private async Task<List<string>> GetWarehouseNamesAsync(List<Guid> ids, CancellationToken ct)
    {
        var allWarehouses = await warehouseService.GetWarehouses(ct) ?? [];
        if (allWarehouses.Count == 0)
        {
            return [];
        }

        var idSet = ids.ToHashSet();
        return allWarehouses
            .Where(w => idSet.Contains(w.Id))
            .Select(w => w.Name ?? "Unknown Warehouse")
            .ToList();
    }

    private async Task<List<string>> GetCustomerNamesAsync(List<Guid> ids, CancellationToken ct)
    {
        var customers = await customerService.GetByIdsAsync(ids, ct);
        if (customers.Count == 0)
        {
            return [];
        }

        var idSet = ids.ToHashSet();
        return customers
            .Where(c => idSet.Contains(c.Id))
            .Select(c => !string.IsNullOrEmpty(c.FirstName) || !string.IsNullOrEmpty(c.LastName)
                ? $"{c.FirstName} {c.LastName}".Trim()
                : c.Email)
            .ToList();
    }

    private async Task<List<string>> GetCustomerSegmentNamesAsync(List<Guid> ids, CancellationToken ct)
    {
        var allSegments = await customerSegmentService.GetAllAsync(ct);
        if (allSegments.Count == 0)
        {
            return [];
        }

        var idSet = ids.ToHashSet();
        return allSegments
            .Where(s => idSet.Contains(s.Id))
            .Select(s => s.Name)
            .ToList();
    }

    #endregion

    #region Mapping Helpers

    private static List<T>? SafeDeserializeList<T>(string? json)
    {
        if (string.IsNullOrEmpty(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<List<T>>(json);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static DiscountListItemDto MapToListItemDto(Discount discount, int usageCount)
    {
        return new DiscountListItemDto
        {
            Id = discount.Id,
            Name = discount.Name,
            Description = discount.Description,
            Code = discount.Code,
            Status = discount.Status,
            Category = discount.Category,
            Method = discount.Method,
            ValueType = discount.ValueType,
            Value = discount.Value,
            StartsAt = discount.StartsAt,
            EndsAt = discount.EndsAt,
            CurrentUsageCount = usageCount,
            TotalUsageLimit = discount.TotalUsageLimit,
            CanCombineWithProductDiscounts = discount.CanCombineWithProductDiscounts,
            CanCombineWithOrderDiscounts = discount.CanCombineWithOrderDiscounts,
            CanCombineWithShippingDiscounts = discount.CanCombineWithShippingDiscounts,
            ApplyAfterTax = discount.ApplyAfterTax,
            DateCreated = discount.DateCreated
        };
    }

    private static DiscountDetailDto MapToDetailDto(Discount discount, int usageCount)
    {
        return new DiscountDetailDto
        {
            Id = discount.Id,
            Name = discount.Name,
            Description = discount.Description,
            Status = discount.Status,
            Category = discount.Category,
            Method = discount.Method,
            Code = discount.Code,
            ValueType = discount.ValueType,
            Value = discount.Value,
            StartsAt = discount.StartsAt,
            EndsAt = discount.EndsAt,
            Timezone = discount.Timezone,
            TotalUsageLimit = discount.TotalUsageLimit,
            PerCustomerUsageLimit = discount.PerCustomerUsageLimit,
            PerOrderUsageLimit = discount.PerOrderUsageLimit,
            CurrentUsageCount = usageCount,
            RequirementType = discount.RequirementType,
            RequirementValue = discount.RequirementValue,
            CanCombineWithProductDiscounts = discount.CanCombineWithProductDiscounts,
            CanCombineWithOrderDiscounts = discount.CanCombineWithOrderDiscounts,
            CanCombineWithShippingDiscounts = discount.CanCombineWithShippingDiscounts,
            ApplyAfterTax = discount.ApplyAfterTax,
            Priority = discount.Priority,
            DateCreated = discount.DateCreated,
            DateUpdated = discount.DateUpdated,
            CreatedBy = discount.CreatedBy,
            TargetRules = discount.TargetRules.Select(r => new DiscountTargetRuleDto
            {
                Id = r.Id,
                TargetType = r.TargetType,
                TargetIds = SafeDeserializeList<Guid>(r.TargetIds),
                IsExclusion = r.IsExclusion
            }).ToList(),
            EligibilityRules = discount.EligibilityRules.Select(r => new DiscountEligibilityRuleDto
            {
                Id = r.Id,
                EligibilityType = r.EligibilityType,
                EligibilityIds = SafeDeserializeList<Guid>(r.EligibilityIds)
            }).ToList(),
            BuyXGetYConfig = discount.BuyXGetYConfig != null ? new DiscountBuyXGetYConfigDto
            {
                BuyTriggerType = discount.BuyXGetYConfig.BuyTriggerType,
                BuyTriggerValue = discount.BuyXGetYConfig.BuyTriggerValue,
                BuyTargetType = discount.BuyXGetYConfig.BuyTargetType,
                BuyTargetIds = SafeDeserializeList<Guid>(discount.BuyXGetYConfig.BuyTargetIds),
                GetQuantity = discount.BuyXGetYConfig.GetQuantity,
                GetTargetType = discount.BuyXGetYConfig.GetTargetType,
                GetTargetIds = SafeDeserializeList<Guid>(discount.BuyXGetYConfig.GetTargetIds),
                GetValueType = discount.BuyXGetYConfig.GetValueType,
                GetValue = discount.BuyXGetYConfig.GetValue,
                SelectionMethod = discount.BuyXGetYConfig.SelectionMethod
            } : null,
            FreeShippingConfig = discount.FreeShippingConfig != null ? new DiscountFreeShippingConfigDto
            {
                CountryScope = discount.FreeShippingConfig.CountryScope,
                CountryCodes = SafeDeserializeList<string>(discount.FreeShippingConfig.CountryCodes),
                ExcludeRatesOverAmount = discount.FreeShippingConfig.ExcludeRatesOverAmount,
                ExcludeRatesOverValue = discount.FreeShippingConfig.ExcludeRatesOverValue,
                AllowedShippingOptionIds = SafeDeserializeList<Guid>(discount.FreeShippingConfig.AllowedShippingOptionIds)
            } : null
        };
    }

    private static CreateDiscountParameters MapToCreateParameters(CreateDiscountDto dto)
    {
        return new CreateDiscountParameters
        {
            Name = dto.Name,
            Description = dto.Description,
            Category = dto.Category,
            Method = dto.Method,
            Code = dto.Code,
            ValueType = dto.ValueType,
            Value = dto.Value,
            StartsAt = dto.StartsAt,
            EndsAt = dto.EndsAt,
            Timezone = dto.Timezone,
            TotalUsageLimit = dto.TotalUsageLimit,
            PerCustomerUsageLimit = dto.PerCustomerUsageLimit,
            PerOrderUsageLimit = dto.PerOrderUsageLimit,
            RequirementType = dto.RequirementType,
            RequirementValue = dto.RequirementValue,
            CanCombineWithProductDiscounts = dto.CanCombineWithProductDiscounts,
            CanCombineWithOrderDiscounts = dto.CanCombineWithOrderDiscounts,
            CanCombineWithShippingDiscounts = dto.CanCombineWithShippingDiscounts,
            ApplyAfterTax = dto.ApplyAfterTax,
            Priority = dto.Priority,
            TargetRules = dto.TargetRules?.Select(r => new CreateDiscountTargetRuleParameters
            {
                TargetType = r.TargetType,
                TargetIds = r.TargetIds,
                IsExclusion = r.IsExclusion
            }).ToList(),
            EligibilityRules = dto.EligibilityRules?.Select(r => new CreateDiscountEligibilityRuleParameters
            {
                EligibilityType = r.EligibilityType,
                EligibilityIds = r.EligibilityIds
            }).ToList(),
            BuyXGetYConfig = dto.BuyXGetYConfig != null ? new CreateBuyXGetYParameters
            {
                BuyTriggerType = dto.BuyXGetYConfig.BuyTriggerType,
                BuyTriggerValue = dto.BuyXGetYConfig.BuyTriggerValue,
                BuyTargetType = dto.BuyXGetYConfig.BuyTargetType,
                BuyTargetIds = dto.BuyXGetYConfig.BuyTargetIds,
                GetQuantity = dto.BuyXGetYConfig.GetQuantity,
                GetTargetType = dto.BuyXGetYConfig.GetTargetType,
                GetTargetIds = dto.BuyXGetYConfig.GetTargetIds,
                GetValueType = dto.BuyXGetYConfig.GetValueType,
                GetValue = dto.BuyXGetYConfig.GetValue,
                SelectionMethod = dto.BuyXGetYConfig.SelectionMethod
            } : null,
            FreeShippingConfig = dto.FreeShippingConfig != null ? new CreateFreeShippingParameters
            {
                CountryScope = dto.FreeShippingConfig.CountryScope,
                CountryCodes = dto.FreeShippingConfig.CountryCodes,
                ExcludeRatesOverAmount = dto.FreeShippingConfig.ExcludeRatesOverAmount,
                ExcludeRatesOverValue = dto.FreeShippingConfig.ExcludeRatesOverValue,
                AllowedShippingOptionIds = dto.FreeShippingConfig.AllowedShippingOptionIds
            } : null
        };
    }

    private static UpdateDiscountParameters MapToUpdateParameters(UpdateDiscountDto dto)
    {
        return new UpdateDiscountParameters
        {
            Name = dto.Name,
            Description = dto.Description,
            Code = dto.Code,
            ValueType = dto.ValueType,
            Value = dto.Value,
            StartsAt = dto.StartsAt,
            EndsAt = dto.EndsAt,
            ClearEndsAt = dto.ClearEndsAt,
            Timezone = dto.Timezone,
            TotalUsageLimit = dto.TotalUsageLimit,
            ClearTotalUsageLimit = dto.ClearTotalUsageLimit,
            PerCustomerUsageLimit = dto.PerCustomerUsageLimit,
            ClearPerCustomerUsageLimit = dto.ClearPerCustomerUsageLimit,
            PerOrderUsageLimit = dto.PerOrderUsageLimit,
            ClearPerOrderUsageLimit = dto.ClearPerOrderUsageLimit,
            RequirementType = dto.RequirementType,
            RequirementValue = dto.RequirementValue,
            CanCombineWithProductDiscounts = dto.CanCombineWithProductDiscounts,
            CanCombineWithOrderDiscounts = dto.CanCombineWithOrderDiscounts,
            CanCombineWithShippingDiscounts = dto.CanCombineWithShippingDiscounts,
            ApplyAfterTax = dto.ApplyAfterTax,
            Priority = dto.Priority,
            TargetRules = dto.TargetRules?.Select(r => new CreateDiscountTargetRuleParameters
            {
                TargetType = r.TargetType,
                TargetIds = r.TargetIds,
                IsExclusion = r.IsExclusion
            }).ToList(),
            EligibilityRules = dto.EligibilityRules?.Select(r => new CreateDiscountEligibilityRuleParameters
            {
                EligibilityType = r.EligibilityType,
                EligibilityIds = r.EligibilityIds
            }).ToList(),
            BuyXGetYConfig = dto.BuyXGetYConfig != null ? new CreateBuyXGetYParameters
            {
                BuyTriggerType = dto.BuyXGetYConfig.BuyTriggerType,
                BuyTriggerValue = dto.BuyXGetYConfig.BuyTriggerValue,
                BuyTargetType = dto.BuyXGetYConfig.BuyTargetType,
                BuyTargetIds = dto.BuyXGetYConfig.BuyTargetIds,
                GetQuantity = dto.BuyXGetYConfig.GetQuantity,
                GetTargetType = dto.BuyXGetYConfig.GetTargetType,
                GetTargetIds = dto.BuyXGetYConfig.GetTargetIds,
                GetValueType = dto.BuyXGetYConfig.GetValueType,
                GetValue = dto.BuyXGetYConfig.GetValue,
                SelectionMethod = dto.BuyXGetYConfig.SelectionMethod
            } : null,
            FreeShippingConfig = dto.FreeShippingConfig != null ? new CreateFreeShippingParameters
            {
                CountryScope = dto.FreeShippingConfig.CountryScope,
                CountryCodes = dto.FreeShippingConfig.CountryCodes,
                ExcludeRatesOverAmount = dto.FreeShippingConfig.ExcludeRatesOverAmount,
                ExcludeRatesOverValue = dto.FreeShippingConfig.ExcludeRatesOverValue,
                AllowedShippingOptionIds = dto.FreeShippingConfig.AllowedShippingOptionIds
            } : null
        };
    }

    #endregion
}
