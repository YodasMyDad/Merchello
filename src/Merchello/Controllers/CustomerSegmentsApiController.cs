using System.Text.Json;
using Asp.Versioning;
using Merchello.Core.Customers.Dtos;
using Merchello.Core.Customers.Models;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Customers.Services.Parameters;
using Merchello.Core.Shared.Models.Enums;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class CustomerSegmentsApiController(
    ICustomerSegmentService segmentService,
    ISegmentCriteriaEvaluator criteriaEvaluator,
    ICustomerService customerService) : MerchelloApiControllerBase
{
    #region Segment CRUD

    /// <summary>
    /// Get all customer segments
    /// </summary>
    [HttpGet("customer-segments")]
    [ProducesResponseType<List<CustomerSegmentListItemDto>>(StatusCodes.Status200OK)]
    public async Task<List<CustomerSegmentListItemDto>> GetSegments(CancellationToken ct)
    {
        var segments = await segmentService.GetAllAsync(ct);
        if (segments.Count == 0)
            return [];

        // Batch fetch all member counts
        var segmentIds = segments.Select(s => s.Id).ToList();
        var memberCounts = await segmentService.GetMemberCountsAsync(segmentIds, ct);

        return segments
            .Select(segment => MapToListItemDto(segment, memberCounts.GetValueOrDefault(segment.Id, 0)))
            .ToList();
    }

    /// <summary>
    /// Get a customer segment by ID
    /// </summary>
    [HttpGet("customer-segments/{id:guid}")]
    [ProducesResponseType<CustomerSegmentDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSegment(Guid id, CancellationToken ct)
    {
        var segment = await segmentService.GetByIdAsync(id, ct);
        if (segment == null)
        {
            return NotFound();
        }

        var memberCount = await segmentService.GetMemberCountAsync(id, ct);
        return Ok(MapToDetailDto(segment, memberCount));
    }

    /// <summary>
    /// Create a new customer segment
    /// </summary>
    [HttpPost("customer-segments")]
    [ProducesResponseType<CustomerSegmentDetailDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateSegment([FromBody] CreateCustomerSegmentDto dto, CancellationToken ct)
    {
        var parameters = new CreateSegmentParameters
        {
            Name = dto.Name,
            Description = dto.Description,
            SegmentType = dto.SegmentType,
            Criteria = dto.Criteria?.Select(MapToSegmentCriteria).ToList(),
            MatchMode = dto.MatchMode
        };

        var result = await segmentService.CreateAsync(parameters, ct);
        if (!result.Successful)
        {
            var errors = result.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message);
            return BadRequest(new { errors });
        }

        var segment = result.ResultObject!;
        var memberCount = await segmentService.GetMemberCountAsync(segment.Id, ct);
        var detailDto = MapToDetailDto(segment, memberCount);

        return CreatedAtAction(nameof(GetSegment), new { id = segment.Id }, detailDto);
    }

    /// <summary>
    /// Update a customer segment
    /// </summary>
    [HttpPut("customer-segments/{id:guid}")]
    [ProducesResponseType<CustomerSegmentDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateSegment(Guid id, [FromBody] UpdateCustomerSegmentDto dto, CancellationToken ct)
    {
        var parameters = new UpdateSegmentParameters
        {
            Name = dto.Name,
            Description = dto.Description,
            Criteria = dto.Criteria?.Select(MapToSegmentCriteria).ToList(),
            MatchMode = dto.MatchMode,
            IsActive = dto.IsActive
        };

        var result = await segmentService.UpdateAsync(id, parameters, ct);
        if (!result.Successful)
        {
            var errors = result.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message)
                .ToList();

            if (errors.Any(e => e?.Contains("not found") == true))
            {
                return NotFound();
            }
            return BadRequest(new { errors });
        }

        var segment = result.ResultObject!;
        var memberCount = await segmentService.GetMemberCountAsync(id, ct);
        return Ok(MapToDetailDto(segment, memberCount));
    }

    /// <summary>
    /// Delete a customer segment
    /// </summary>
    [HttpDelete("customer-segments/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteSegment(Guid id, CancellationToken ct)
    {
        var result = await segmentService.DeleteAsync(id, ct);
        if (!result.Successful)
        {
            var errors = result.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message)
                .ToList();

            if (errors.Any(e => e?.Contains("not found") == true))
            {
                return NotFound();
            }
            return BadRequest(new { errors });
        }

        return NoContent();
    }

    #endregion

    #region Segment Members

    /// <summary>
    /// Get members of a segment (paginated)
    /// </summary>
    [HttpGet("customer-segments/{id:guid}/members")]
    [ProducesResponseType<SegmentMembersResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMembers(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var segment = await segmentService.GetByIdAsync(id, ct);
        if (segment == null)
        {
            return NotFound();
        }

        var members = await segmentService.GetMembersAsync(new GetSegmentMembersParameters
        {
            SegmentId = id,
            Page = page,
            PageSize = pageSize
        }, ct);

        // Batch fetch all customers for this page
        var customerIds = members.Items.Select(m => m.CustomerId).Distinct().ToList();
        var customers = await customerService.GetByIdsAsync(customerIds, ct);
        var customerLookup = customers.ToDictionary(c => c.Id);

        var memberDtos = members.Items.Select(member =>
        {
            customerLookup.TryGetValue(member.CustomerId, out var customer);
            return new SegmentMemberDto
            {
                Id = member.Id,
                CustomerId = member.CustomerId,
                CustomerName = customer != null ? $"{customer.FirstName} {customer.LastName}".Trim() : "Unknown",
                CustomerEmail = customer?.Email ?? "",
                DateAdded = member.DateAdded,
                Notes = member.Notes
            };
        }).ToList();

        return Ok(new SegmentMembersResponseDto
        {
            Items = memberDtos,
            Page = page,
            PageSize = pageSize,
            TotalItems = members.TotalItems,
            TotalPages = members.TotalPages
        });
    }

    /// <summary>
    /// Add members to a manual segment
    /// </summary>
    [HttpPost("customer-segments/{id:guid}/members")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddMembers(
        Guid id,
        [FromBody] AddSegmentMembersDto dto,
        CancellationToken ct)
    {
        var result = await segmentService.AddMembersAsync(new AddSegmentMembersParameters
        {
            SegmentId = id,
            CustomerIds = dto.CustomerIds,
            Notes = dto.Notes
        }, ct);
        if (!result.Successful)
        {
            var errors = result.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message)
                .ToList();

            if (errors.Any(e => e?.Contains("not found") == true))
            {
                return NotFound();
            }
            return BadRequest(new { errors });
        }

        return Ok(new { message = result.Messages.FirstOrDefault()?.Message });
    }

    /// <summary>
    /// Remove members from a manual segment
    /// </summary>
    [HttpDelete("customer-segments/{id:guid}/members")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveMembers(
        Guid id,
        [FromBody] RemoveSegmentMembersDto dto,
        CancellationToken ct)
    {
        var result = await segmentService.RemoveMembersAsync(id, dto.CustomerIds, ct);
        if (!result.Successful)
        {
            var errors = result.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message)
                .ToList();

            if (errors.Any(e => e?.Contains("not found") == true))
            {
                return NotFound();
            }
            return BadRequest(new { errors });
        }

        return Ok(new { message = result.Messages.FirstOrDefault()?.Message });
    }

    #endregion

    #region Preview & Statistics

    /// <summary>
    /// Preview customers matching an automated segment's criteria
    /// </summary>
    [HttpGet("customer-segments/{id:guid}/preview")]
    [ProducesResponseType<CustomerPreviewResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PreviewMatches(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var segment = await segmentService.GetByIdAsync(id, ct);
        if (segment == null)
        {
            return NotFound();
        }

        var matchingIds = await segmentService.GetMatchingCustomerIdsAsync(id, page, pageSize, ct);

        // Batch fetch customer spend and details
        var customerIdList = matchingIds.Items.ToList();
        var customerSpends = await segmentService.GetCustomerSpendsAsync(customerIdList, ct);
        var customerDtos = await customerService.GetDtosByIdsAsync(customerIdList, ct);
        var customerLookup = customerDtos.ToDictionary(c => c.Id);

        var previewDtos = customerIdList
            .Where(customerId => customerLookup.ContainsKey(customerId))
            .Select(customerId =>
            {
                var customer = customerLookup[customerId];
                return new CustomerPreviewDto
                {
                    Id = customer.Id,
                    Name = $"{customer.FirstName} {customer.LastName}".Trim(),
                    Email = customer.Email,
                    OrderCount = customer.OrderCount,
                    TotalSpend = customerSpends.GetValueOrDefault(customerId, 0)
                };
            })
            .ToList();

        return Ok(new CustomerPreviewResponseDto
        {
            Items = previewDtos,
            Page = page,
            PageSize = pageSize,
            TotalItems = matchingIds.TotalItems,
            TotalPages = matchingIds.TotalPages
        });
    }

    /// <summary>
    /// Get statistics for a segment
    /// </summary>
    [HttpGet("customer-segments/{id:guid}/statistics")]
    [ProducesResponseType<SegmentStatisticsDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStatistics(Guid id, CancellationToken ct)
    {
        var segment = await segmentService.GetByIdAsync(id, ct);
        if (segment == null)
        {
            return NotFound();
        }

        var stats = await segmentService.GetStatisticsAsync(id, ct);
        return Ok(stats);
    }

    #endregion

    #region Criteria

    /// <summary>
    /// Get available criteria fields and their metadata
    /// </summary>
    [HttpGet("customer-segments/criteria/fields")]
    [ProducesResponseType<List<CriteriaFieldMetadataDto>>(StatusCodes.Status200OK)]
    public ActionResult<List<CriteriaFieldMetadataDto>> GetCriteriaFields()
    {
        var fields = criteriaEvaluator.GetAvailableFields();
        return Ok(fields.Select(f => new CriteriaFieldMetadataDto
        {
            Field = f.Field.ToString(),
            Label = f.Label,
            Description = f.Description,
            ValueType = f.ValueType,
            SupportedOperators = f.SupportedOperators.Select(o => o.ToString()).ToList()
        }).ToList());
    }

    /// <summary>
    /// Validate criteria rules
    /// </summary>
    [HttpPost("customer-segments/criteria/validate")]
    [ProducesResponseType<CriteriaValidationResultDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CriteriaValidationResultDto>> ValidateCriteria(
        [FromBody] List<SegmentCriteriaDto> criteria,
        CancellationToken ct)
    {
        var segmentCriteria = criteria.Select(MapToSegmentCriteria).ToList();
        var result = await segmentService.ValidateCriteriaAsync(segmentCriteria, ct);

        return Ok(new CriteriaValidationResultDto
        {
            IsValid = result.IsValid,
            Errors = result.Errors,
            Warnings = result.Warnings
        });
    }

    #endregion

    #region Mapping Helpers

    private static CustomerSegmentListItemDto MapToListItemDto(CustomerSegment segment, int memberCount)
    {
        return new CustomerSegmentListItemDto
        {
            Id = segment.Id,
            Name = segment.Name,
            Description = segment.Description,
            SegmentType = segment.SegmentType,
            IsActive = segment.IsActive,
            IsSystemSegment = segment.IsSystemSegment,
            MemberCount = memberCount,
            DateCreated = segment.DateCreated
        };
    }

    private static CustomerSegmentDetailDto MapToDetailDto(CustomerSegment segment, int memberCount)
    {
        List<SegmentCriteriaDto>? criteria = null;
        if (!string.IsNullOrWhiteSpace(segment.CriteriaJson))
        {
            try
            {
                var segmentCriteria = JsonSerializer.Deserialize<List<SegmentCriteria>>(segment.CriteriaJson);
                criteria = segmentCriteria?.Select(MapToCriteriaDto).ToList();
            }
            catch (JsonException)
            {
                // Invalid JSON in criteria - criteria will be null
            }
        }

        return new CustomerSegmentDetailDto
        {
            Id = segment.Id,
            Name = segment.Name,
            Description = segment.Description,
            SegmentType = segment.SegmentType,
            IsActive = segment.IsActive,
            IsSystemSegment = segment.IsSystemSegment,
            MemberCount = memberCount,
            DateCreated = segment.DateCreated,
            Criteria = criteria,
            MatchMode = segment.MatchMode,
            DateUpdated = segment.DateUpdated
        };
    }

    private static SegmentCriteriaDto MapToCriteriaDto(SegmentCriteria criteria)
    {
        return new SegmentCriteriaDto
        {
            Field = criteria.Field,
            Operator = criteria.Operator.ToString(),
            Value = criteria.Value,
            Value2 = criteria.Value2
        };
    }

    private static SegmentCriteria MapToSegmentCriteria(SegmentCriteriaDto dto)
    {
        Enum.TryParse<SegmentCriteriaOperator>(dto.Operator, ignoreCase: true, out var op);
        return new SegmentCriteria
        {
            Field = dto.Field,
            Operator = op,
            Value = dto.Value,
            Value2 = dto.Value2
        };
    }

    #endregion
}
