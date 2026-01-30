using System.Text.Json;
using Asp.Versioning;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Upsells.Dtos;
using Merchello.Core.Upsells.Extensions;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class UpsellsApiController(
    IUpsellService upsellService,
    IUpsellRuleNameResolver ruleNameResolver,
    IUpsellAnalyticsService analyticsService) : MerchelloApiControllerBase
{
    // =====================================================
    // CRUD
    // =====================================================

    [HttpGet("upsells")]
    [ProducesResponseType<UpsellPageDto>(StatusCodes.Status200OK)]
    public async Task<UpsellPageDto> GetUpsells(
        [FromQuery] UpsellStatus? status = null,
        [FromQuery] string? search = null,
        [FromQuery] UpsellDisplayLocation? displayLocation = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] UpsellOrderBy orderBy = UpsellOrderBy.DateCreated,
        [FromQuery] bool descending = true,
        CancellationToken ct = default)
    {
        var parameters = new UpsellQueryParameters
        {
            Status = status,
            SearchTerm = search,
            DisplayLocation = displayLocation,
            Page = page,
            PageSize = pageSize,
            OrderBy = orderBy,
            Descending = descending
        };

        var result = await upsellService.QueryAsync(parameters, ct);

        // Get analytics for each rule in the list
        var ruleIds = result.Items.Select(r => r.Id).ToList();
        var eventSummaries = await GetEventSummariesForRulesAsync(ruleIds, ct);

        return new UpsellPageDto
        {
            Items = result.Items.Select(r => MapToListItemDto(r, eventSummaries)).ToList(),
            PageIndex = result.PageIndex,
            TotalPages = result.TotalPages,
            TotalItems = result.TotalItems
        };
    }

    [HttpGet("upsells/{id:guid}")]
    [ProducesResponseType<UpsellDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUpsell(Guid id, CancellationToken ct)
    {
        var rule = await upsellService.GetByIdAsync(id, ct);
        if (rule == null)
            return NotFound();

        var detailDto = await MapToDetailDtoAsync(rule, ct);
        return Ok(detailDto);
    }

    [HttpPost("upsells")]
    [ProducesResponseType<UpsellDetailDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateUpsell([FromBody] CreateUpsellDto dto, CancellationToken ct)
    {
        var parameters = MapToCreateParameters(dto);
        var result = await upsellService.CreateAsync(parameters, ct);

        if (!result.Successful)
        {
            var errors = result.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message);
            return BadRequest(new { errors });
        }

        var rule = await upsellService.GetByIdAsync(result.ResultObject!.Id, ct);
        var detailDto = await MapToDetailDtoAsync(rule!, ct);

        return CreatedAtAction(nameof(GetUpsell), new { id = rule!.Id }, detailDto);
    }

    [HttpPut("upsells/{id:guid}")]
    [ProducesResponseType<UpsellDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUpsell(Guid id, [FromBody] UpdateUpsellDto dto, CancellationToken ct)
    {
        var parameters = MapToUpdateParameters(dto);
        var result = await upsellService.UpdateAsync(id, parameters, ct);

        if (!result.Successful)
        {
            var errors = result.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message);
            return BadRequest(new { errors });
        }

        var rule = await upsellService.GetByIdAsync(id, ct);
        var detailDto = await MapToDetailDtoAsync(rule!, ct);
        return Ok(detailDto);
    }

    [HttpDelete("upsells/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteUpsell(Guid id, CancellationToken ct)
    {
        var result = await upsellService.DeleteAsync(id, ct);

        if (!result.Successful)
        {
            var errors = result.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message);
            return BadRequest(new { errors });
        }

        return NoContent();
    }

    // =====================================================
    // Status Management
    // =====================================================

    [HttpPost("upsells/{id:guid}/activate")]
    [ProducesResponseType<UpsellDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ActivateUpsell(Guid id, CancellationToken ct)
    {
        var result = await upsellService.ActivateAsync(id, ct);

        if (!result.Successful)
        {
            var errors = result.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message);
            return BadRequest(new { errors });
        }

        var rule = await upsellService.GetByIdAsync(id, ct);
        var detailDto = await MapToDetailDtoAsync(rule!, ct);
        return Ok(detailDto);
    }

    [HttpPost("upsells/{id:guid}/deactivate")]
    [ProducesResponseType<UpsellDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeactivateUpsell(Guid id, CancellationToken ct)
    {
        var result = await upsellService.DeactivateAsync(id, ct);

        if (!result.Successful)
        {
            var errors = result.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message);
            return BadRequest(new { errors });
        }

        var rule = await upsellService.GetByIdAsync(id, ct);
        var detailDto = await MapToDetailDtoAsync(rule!, ct);
        return Ok(detailDto);
    }

    // =====================================================
    // Analytics
    // =====================================================

    [HttpGet("upsells/{id:guid}/performance")]
    [ProducesResponseType<UpsellPerformanceDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPerformance(
        Guid id,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        CancellationToken ct = default)
    {
        var performance = await analyticsService.GetPerformanceAsync(
            new GetUpsellPerformanceParameters
            {
                UpsellRuleId = id,
                StartDate = startDate,
                EndDate = endDate
            }, ct);

        if (performance == null)
            return NotFound();

        return Ok(performance);
    }

    [HttpGet("upsells/dashboard")]
    [ProducesResponseType<UpsellDashboardDto>(StatusCodes.Status200OK)]
    public async Task<UpsellDashboardDto> GetDashboard(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        CancellationToken ct = default)
    {
        return await analyticsService.GetDashboardAsync(
            new UpsellDashboardParameters
            {
                StartDate = startDate,
                EndDate = endDate
            }, ct);
    }

    [HttpGet("upsells/summary")]
    [ProducesResponseType<List<UpsellSummaryDto>>(StatusCodes.Status200OK)]
    public async Task<List<UpsellSummaryDto>> GetSummary(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? topN = null,
        CancellationToken ct = default)
    {
        return await analyticsService.GetSummaryAsync(
            new UpsellReportParameters
            {
                StartDate = startDate,
                EndDate = endDate,
                TopN = topN
            }, ct);
    }

    // =====================================================
    // Mapping Helpers
    // =====================================================

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

    private async Task<UpsellDetailDto> MapToDetailDtoAsync(UpsellRule rule, CancellationToken ct)
    {
        var triggerRules = rule.TriggerRules.Select(r => new UpsellTriggerRuleDto
        {
            TriggerType = r.TriggerType,
            TriggerIds = SafeDeserializeList<Guid>(r.TriggerIds),
            ExtractFilterIds = SafeDeserializeList<Guid>(r.ExtractFilterIds)
        }).ToList();

        var recommendationRules = rule.RecommendationRules.Select(r => new UpsellRecommendationRuleDto
        {
            RecommendationType = r.RecommendationType,
            RecommendationIds = SafeDeserializeList<Guid>(r.RecommendationIds),
            MatchTriggerFilters = r.MatchTriggerFilters,
            MatchFilterIds = SafeDeserializeList<Guid>(r.MatchFilterIds)
        }).ToList();

        var eligibilityRules = rule.EligibilityRules.Select(r => new UpsellEligibilityRuleDto
        {
            EligibilityType = r.EligibilityType,
            EligibilityIds = SafeDeserializeList<Guid>(r.EligibilityIds)
        }).ToList();

        // Resolve display names
        await ruleNameResolver.ResolveTriggerRuleNamesAsync(triggerRules, ct);
        await ruleNameResolver.ResolveRecommendationRuleNamesAsync(recommendationRules, ct);
        await ruleNameResolver.ResolveEligibilityRuleNamesAsync(eligibilityRules, ct);

        return new UpsellDetailDto
        {
            Id = rule.Id,
            Name = rule.Name,
            Description = rule.Description,
            Status = rule.Status,
            StatusLabel = rule.Status.GetStatusLabel(),
            StatusColor = rule.Status.GetStatusColor(),
            Heading = rule.Heading,
            Message = rule.Message,
            Priority = rule.Priority,
            MaxProducts = rule.MaxProducts,
            SortBy = rule.SortBy,
            SuppressIfInCart = rule.SuppressIfInCart,
            DisplayLocation = rule.DisplayLocation,
            CheckoutMode = rule.CheckoutMode,
            StartsAt = rule.StartsAt,
            EndsAt = rule.EndsAt,
            Timezone = rule.Timezone,
            DateCreated = rule.DateCreated,
            DateUpdated = rule.DateUpdated,
            TriggerRules = triggerRules,
            RecommendationRules = recommendationRules,
            EligibilityRules = eligibilityRules
        };
    }

    private static UpsellListItemDto MapToListItemDto(
        UpsellRule rule,
        Dictionary<Guid, EventSummary> eventSummaries)
    {
        eventSummaries.TryGetValue(rule.Id, out var summary);

        return new UpsellListItemDto
        {
            Id = rule.Id,
            Name = rule.Name,
            Heading = rule.Heading,
            Status = rule.Status,
            StatusLabel = rule.Status.GetStatusLabel(),
            StatusColor = rule.Status.GetStatusColor(),
            Priority = rule.Priority,
            DisplayLocation = rule.DisplayLocation,
            CheckoutMode = rule.CheckoutMode,
            TriggerRuleCount = rule.TriggerRules.Count,
            RecommendationRuleCount = rule.RecommendationRules.Count,
            TotalImpressions = summary?.Impressions ?? 0,
            TotalClicks = summary?.Clicks ?? 0,
            TotalConversions = summary?.Conversions ?? 0,
            TotalRevenue = summary?.Revenue ?? 0,
            ClickThroughRate = summary is { Impressions: > 0 }
                ? Math.Round((decimal)summary.Clicks / summary.Impressions * 100, 2)
                : 0,
            ConversionRate = summary is { Clicks: > 0 }
                ? Math.Round((decimal)summary.Conversions / summary.Clicks * 100, 2)
                : 0,
            DateCreated = rule.DateCreated
        };
    }

    private static CreateUpsellParameters MapToCreateParameters(CreateUpsellDto dto)
    {
        return new CreateUpsellParameters
        {
            Name = dto.Name,
            Description = dto.Description,
            Heading = dto.Heading,
            Message = dto.Message,
            Priority = dto.Priority,
            MaxProducts = dto.MaxProducts,
            SortBy = dto.SortBy,
            SuppressIfInCart = dto.SuppressIfInCart,
            DisplayLocation = dto.DisplayLocation,
            CheckoutMode = dto.CheckoutMode,
            StartsAt = dto.StartsAt,
            EndsAt = dto.EndsAt,
            Timezone = dto.Timezone,
            TriggerRules = dto.TriggerRules?.Select(t => new CreateUpsellTriggerRuleParameters
            {
                TriggerType = t.TriggerType,
                TriggerIds = t.TriggerIds,
                ExtractFilterIds = t.ExtractFilterIds
            }).ToList(),
            RecommendationRules = dto.RecommendationRules?.Select(r => new CreateUpsellRecommendationRuleParameters
            {
                RecommendationType = r.RecommendationType,
                RecommendationIds = r.RecommendationIds,
                MatchTriggerFilters = r.MatchTriggerFilters,
                MatchFilterIds = r.MatchFilterIds
            }).ToList(),
            EligibilityRules = dto.EligibilityRules?.Select(e => new CreateUpsellEligibilityRuleParameters
            {
                EligibilityType = e.EligibilityType,
                EligibilityIds = e.EligibilityIds
            }).ToList()
        };
    }

    private static UpdateUpsellParameters MapToUpdateParameters(UpdateUpsellDto dto)
    {
        return new UpdateUpsellParameters
        {
            Name = dto.Name,
            Description = dto.Description,
            Heading = dto.Heading,
            Message = dto.Message,
            Priority = dto.Priority,
            MaxProducts = dto.MaxProducts,
            SortBy = dto.SortBy,
            SuppressIfInCart = dto.SuppressIfInCart,
            DisplayLocation = dto.DisplayLocation,
            CheckoutMode = dto.CheckoutMode,
            StartsAt = dto.StartsAt,
            EndsAt = dto.EndsAt,
            ClearEndsAt = dto.ClearEndsAt,
            Timezone = dto.Timezone,
            TriggerRules = dto.TriggerRules?.Select(t => new CreateUpsellTriggerRuleParameters
            {
                TriggerType = t.TriggerType,
                TriggerIds = t.TriggerIds,
                ExtractFilterIds = t.ExtractFilterIds
            }).ToList(),
            RecommendationRules = dto.RecommendationRules?.Select(r => new CreateUpsellRecommendationRuleParameters
            {
                RecommendationType = r.RecommendationType,
                RecommendationIds = r.RecommendationIds,
                MatchTriggerFilters = r.MatchTriggerFilters,
                MatchFilterIds = r.MatchFilterIds
            }).ToList(),
            EligibilityRules = dto.EligibilityRules?.Select(e => new CreateUpsellEligibilityRuleParameters
            {
                EligibilityType = e.EligibilityType,
                EligibilityIds = e.EligibilityIds
            }).ToList()
        };
    }

    // =====================================================
    // Event Summary Helper
    // =====================================================

    private record EventSummary(int Impressions, int Clicks, int Conversions, decimal Revenue);

    private async Task<Dictionary<Guid, EventSummary>> GetEventSummariesForRulesAsync(
        List<Guid> ruleIds, CancellationToken ct)
    {
        if (ruleIds.Count == 0)
            return new Dictionary<Guid, EventSummary>();

        var summaries = await analyticsService.GetSummaryAsync(new UpsellReportParameters { TopN = 100 }, ct);

        return summaries
            .Where(s => ruleIds.Contains(s.Id))
            .ToDictionary(
                s => s.Id,
                s => new EventSummary(s.Impressions, s.Clicks, s.Conversions, s.Revenue));
    }
}
