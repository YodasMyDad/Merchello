using System.Text.Json;
using Asp.Versioning;
using Merchello.Core.Discounts.Dtos;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Discounts.Services.Parameters;
using Merchello.Core.Shared.Models.Enums;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class DiscountsApiController(IDiscountService discountService) : MerchelloApiControllerBase
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

        return new DiscountPageDto
        {
            Items = result.Items.Select(MapToListItemDto).ToList(),
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

        return Ok(MapToDetailDto(discount));
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
        var detailDto = MapToDetailDto(discount!);

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
        return Ok(MapToDetailDto(discount!));
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
        return Ok(MapToDetailDto(discount!));
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
        return Ok(MapToDetailDto(discount!));
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

    private static DiscountListItemDto MapToListItemDto(Discount discount)
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
            CurrentUsageCount = discount.CurrentUsageCount,
            TotalUsageLimit = discount.TotalUsageLimit,
            CanCombineWithProductDiscounts = discount.CanCombineWithProductDiscounts,
            CanCombineWithOrderDiscounts = discount.CanCombineWithOrderDiscounts,
            CanCombineWithShippingDiscounts = discount.CanCombineWithShippingDiscounts,
            DateCreated = discount.DateCreated
        };
    }

    private static DiscountDetailDto MapToDetailDto(Discount discount)
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
            CurrentUsageCount = discount.CurrentUsageCount,
            RequirementType = discount.RequirementType,
            RequirementValue = discount.RequirementValue,
            CanCombineWithProductDiscounts = discount.CanCombineWithProductDiscounts,
            CanCombineWithOrderDiscounts = discount.CanCombineWithOrderDiscounts,
            CanCombineWithShippingDiscounts = discount.CanCombineWithShippingDiscounts,
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
