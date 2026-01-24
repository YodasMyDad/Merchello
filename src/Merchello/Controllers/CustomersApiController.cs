using Asp.Versioning;
using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Customers.Dtos;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Customers.Services.Parameters;
using Merchello.Core.Shared.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class CustomersApiController(
    ICustomerService customerService,
    ICustomerSegmentService segmentService,
    IStatementService statementService,
    IOptions<MerchelloSettings> settings) : MerchelloApiControllerBase
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
        return await customerService.GetPagedAsync(new CustomerQueryParameters
        {
            Search = search,
            Page = page,
            PageSize = pageSize
        }, ct);
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
            ClearMemberKey = dto.ClearMemberKey,
            Tags = dto.Tags,
            IsFlagged = dto.IsFlagged,
            AcceptsMarketing = dto.AcceptsMarketing,
            HasAccountTerms = dto.HasAccountTerms,
            PaymentTermsDays = dto.PaymentTermsDays,
            ClearPaymentTermsDays = dto.ClearPaymentTermsDays,
            CreditLimit = dto.CreditLimit,
            ClearCreditLimit = dto.ClearCreditLimit
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
    /// Search customers for segment member picker (supports excluding IDs)
    /// </summary>
    [HttpGet("customers/search")]
    [ProducesResponseType<CustomerPageDto>(StatusCodes.Status200OK)]
    public async Task<CustomerPageDto> SearchCustomers(
        [FromQuery] string search,
        [FromQuery] string? excludeIds,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        HashSet<Guid>? excludeIdSet = null;
        if (!string.IsNullOrWhiteSpace(excludeIds))
        {
            excludeIdSet = excludeIds.Split(',')
                .Select(id => Guid.TryParse(id.Trim(), out var guid) ? guid : (Guid?)null)
                .Where(g => g.HasValue)
                .Select(g => g!.Value)
                .ToHashSet();
        }

        return await customerService.GetPagedAsync(new CustomerQueryParameters
        {
            Search = search,
            Page = 1,
            PageSize = pageSize,
            ExcludeIds = excludeIdSet
        }, ct);
    }

    /// <summary>
    /// Get all unique tags across all customers (for autocomplete)
    /// </summary>
    [HttpGet("customers/tags")]
    [ProducesResponseType<List<string>>(StatusCodes.Status200OK)]
    public async Task<List<string>> GetAllTags(CancellationToken ct)
    {
        return await customerService.GetAllUniqueTagsAsync(ct);
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
        var segments = await segmentService.GetByIdsAsync(segmentIds, ct);

        var badges = segments
            .Where(s => s.IsActive)
            .Select(s => new CustomerSegmentBadgeDto
            {
                Id = s.Id,
                Name = s.Name,
                SegmentType = s.SegmentType
            })
            .ToList();

        return Ok(badges);
    }

    /// <summary>
    /// Get outstanding balance summary for a customer
    /// </summary>
    [HttpGet("customers/{id:guid}/outstanding")]
    [ProducesResponseType<OutstandingBalanceDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOutstandingBalance(Guid id, CancellationToken ct)
    {
        var customer = await customerService.GetByIdAsync(id, ct);
        if (customer == null)
        {
            return NotFound("Customer not found");
        }

        var balance = await statementService.GetOutstandingBalanceAsync(id, ct);
        return Ok(balance);
    }

    /// <summary>
    /// Get outstanding (unpaid) invoices for a customer
    /// </summary>
    [HttpGet("customers/{id:guid}/outstanding/invoices")]
    [ProducesResponseType<List<OrderListItemDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOutstandingInvoices(Guid id, CancellationToken ct)
    {
        var customer = await customerService.GetByIdAsync(id, ct);
        if (customer == null)
        {
            return NotFound("Customer not found");
        }

        var invoices = await statementService.GetOutstandingInvoicesForCustomerAsync(id, ct);
        return Ok(invoices);
    }

    /// <summary>
    /// Generate a PDF statement for a customer
    /// </summary>
    [HttpGet("customers/{id:guid}/statement")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GenerateStatement(
        Guid id,
        [FromQuery] DateTime? periodStart,
        [FromQuery] DateTime? periodEnd,
        CancellationToken ct)
    {
        var customer = await customerService.GetByIdAsync(id, ct);
        if (customer == null)
        {
            return NotFound("Customer not found");
        }

        var merchelloSettings = settings.Value;
        var parameters = new GenerateStatementParameters
        {
            CustomerId = id,
            PeriodStart = periodStart,
            PeriodEnd = periodEnd,
            CompanyName = merchelloSettings.StoreName,
            CompanyAddress = merchelloSettings.StoreAddress
        };

        var pdf = await statementService.GenerateStatementPdfAsync(parameters, ct);

        var customerName = string.IsNullOrEmpty(customer.FirstName)
            ? customer.Email
            : $"{customer.FirstName}-{customer.LastName}";
        var fileName = $"Statement-{customerName}-{DateTime.UtcNow:yyyy-MM-dd}.pdf";

        return File(pdf, "application/pdf", fileName);
    }
}
