using Asp.Versioning;
using Merchello.Core.Customers.Dtos;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Customers.Services.Parameters;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class CustomersApiController(
    ICustomerService customerService,
    ICustomerSegmentService segmentService) : MerchelloApiControllerBase
{
    /// <summary>
    /// Get paginated list of customers with optional search
    /// </summary>
    [HttpGet("customers")]
    [ProducesResponseType<CustomerPageDto>(StatusCodes.Status200OK)]
    public async Task<CustomerPageDto> GetCustomers(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        return await customerService.GetPagedAsync(search, page, pageSize, ct);
    }

    /// <summary>
    /// Get a single customer by ID
    /// </summary>
    [HttpGet("customers/{id:guid}")]
    [ProducesResponseType<CustomerListItemDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCustomer(Guid id, CancellationToken ct)
    {
        var customer = await customerService.GetDtoByIdAsync(id, ct);
        if (customer == null)
        {
            return NotFound();
        }

        return Ok(customer);
    }

    /// <summary>
    /// Update a customer
    /// </summary>
    [HttpPut("customers/{id:guid}")]
    [ProducesResponseType<CustomerListItemDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCustomer(Guid id, [FromBody] UpdateCustomerDto dto, CancellationToken ct)
    {
        var parameters = new UpdateCustomerParameters
        {
            Id = id,
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            MemberKey = dto.MemberKey,
            ClearMemberKey = dto.ClearMemberKey
        };

        var result = await customerService.UpdateAsync(parameters, ct);
        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to update customer.");
        }

        // Fetch the DTO to get the correct order count
        var customer = await customerService.GetDtoByIdAsync(id, ct);
        return Ok(customer);
    }

    /// <summary>
    /// Get segments that a customer belongs to (by email)
    /// </summary>
    [HttpGet("customers/segments")]
    [ProducesResponseType<List<CustomerSegmentBadgeDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCustomerSegments([FromQuery] string email, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest("Email is required");
        }

        var customer = await customerService.GetByEmailAsync(email, ct);
        if (customer == null)
        {
            return NotFound("Customer not found");
        }

        var segmentIds = await segmentService.GetCustomerSegmentIdsAsync(customer.Id, ct);

        var badges = new List<CustomerSegmentBadgeDto>();
        foreach (var segmentId in segmentIds)
        {
            var segment = await segmentService.GetByIdAsync(segmentId, ct);
            if (segment != null && segment.IsActive)
            {
                badges.Add(new CustomerSegmentBadgeDto
                {
                    Id = segment.Id,
                    Name = segment.Name,
                    SegmentType = segment.SegmentType
                });
            }
        }

        return Ok(badges);
    }
}
