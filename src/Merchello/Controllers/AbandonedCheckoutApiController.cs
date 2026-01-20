using Asp.Versioning;
using Merchello.Controllers.Dtos;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Notifications.CheckoutNotifications;
using Merchello.Core.Notifications.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for managing abandoned checkouts in the backoffice.
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class AbandonedCheckoutApiController(
    IAbandonedCheckoutService abandonedCheckoutService,
    IMerchelloNotificationPublisher notificationPublisher) : MerchelloApiControllerBase
{
    /// <summary>
    /// Gets a paginated list of abandoned checkouts.
    /// </summary>
    [HttpGet("abandoned-checkouts")]
    [ProducesResponseType<AbandonedCheckoutPageDto>(StatusCodes.Status200OK)]
    public async Task<AbandonedCheckoutPageDto> GetAbandonedCheckouts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string orderBy = "DateAbandoned",
        [FromQuery] bool descending = true,
        CancellationToken ct = default)
    {
        var parameters = new AbandonedCheckoutQueryParameters
        {
            Page = page,
            PageSize = pageSize,
            Search = search,
            FromDate = fromDate,
            ToDate = toDate,
            OrderBy = ParseOrderBy(orderBy),
            Descending = descending
        };

        // Parse status filter
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<AbandonedCheckoutStatus>(status, true, out var statusEnum))
        {
            parameters.Status = statusEnum;
        }

        return await abandonedCheckoutService.GetPagedAsync(parameters, ct);
    }

    /// <summary>
    /// Gets an abandoned checkout by ID.
    /// </summary>
    [HttpGet("abandoned-checkouts/{id:guid}")]
    [ProducesResponseType<AbandonedCheckoutDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAbandonedCheckout(Guid id, CancellationToken ct)
    {
        var checkout = await abandonedCheckoutService.GetByIdAsync(id, ct);
        if (checkout == null)
        {
            return NotFound();
        }

        // Map to detail DTO
        var dto = MapToDetailDto(checkout);

        // Generate recovery link if not expired
        if (checkout.Status == AbandonedCheckoutStatus.Abandoned &&
            (checkout.RecoveryTokenExpiresUtc == null || checkout.RecoveryTokenExpiresUtc > DateTime.UtcNow))
        {
            dto.RecoveryLink = await abandonedCheckoutService.GenerateRecoveryLinkAsync(id, ct);
        }

        return Ok(dto);
    }

    /// <summary>
    /// Gets statistics for abandoned checkouts.
    /// </summary>
    [HttpGet("abandoned-checkouts/stats")]
    [ProducesResponseType<AbandonedCheckoutStatsDto>(StatusCodes.Status200OK)]
    public async Task<AbandonedCheckoutStatsDto> GetStats(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken ct = default)
    {
        return await abandonedCheckoutService.GetStatsAsync(fromDate, toDate, ct);
    }

    /// <summary>
    /// Manually triggers a recovery email for an abandoned checkout.
    /// </summary>
    [HttpPost("abandoned-checkouts/{id:guid}/resend-email")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResendRecoveryEmail(Guid id, CancellationToken ct)
    {
        var checkout = await abandonedCheckoutService.GetByIdAsync(id, ct);
        if (checkout == null)
        {
            return NotFound();
        }

        if (checkout.Status != AbandonedCheckoutStatus.Abandoned)
        {
            return BadRequest(new { message = "Can only resend emails for abandoned checkouts." });
        }

        if (string.IsNullOrWhiteSpace(checkout.Email))
        {
            return BadRequest(new { message = "No email address associated with this checkout." });
        }

        // Generate recovery link
        var recoveryLink = await abandonedCheckoutService.GenerateRecoveryLinkAsync(id, ct);

        // Publish notification to trigger email
        var notification = new CheckoutAbandonedFirstNotification
        {
            AbandonedCheckoutId = checkout.Id,
            BasketId = checkout.BasketId,
            CustomerEmail = checkout.Email,
            CustomerName = checkout.CustomerName,
            BasketTotal = checkout.BasketTotal,
            CurrencyCode = checkout.CurrencyCode,
            FormattedTotal = $"{checkout.CurrencySymbol}{checkout.BasketTotal:N2}",
            RecoveryLink = recoveryLink,
            EmailSequenceNumber = checkout.RecoveryEmailsSent + 1
        };

        await notificationPublisher.PublishAsync(notification, ct);

        return Ok(new { success = true, message = "Recovery email sent." });
    }

    /// <summary>
    /// Regenerates the recovery link for an abandoned checkout.
    /// </summary>
    [HttpPost("abandoned-checkouts/{id:guid}/regenerate-link")]
    [ProducesResponseType<RegenerateRecoveryLinkResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RegenerateRecoveryLink(Guid id, CancellationToken ct)
    {
        var checkout = await abandonedCheckoutService.GetByIdAsync(id, ct);
        if (checkout == null)
        {
            return NotFound();
        }

        var recoveryLink = await abandonedCheckoutService.GenerateRecoveryLinkAsync(id, ct);

        return Ok(new RegenerateRecoveryLinkResultDto { RecoveryLink = recoveryLink });
    }

    private static AbandonedCheckoutOrderBy ParseOrderBy(string orderBy)
    {
        return orderBy.ToLower() switch
        {
            "dateabandoned" => AbandonedCheckoutOrderBy.DateAbandoned,
            "lastactivity" => AbandonedCheckoutOrderBy.LastActivity,
            "total" => AbandonedCheckoutOrderBy.Total,
            "email" => AbandonedCheckoutOrderBy.Email,
            _ => AbandonedCheckoutOrderBy.DateAbandoned
        };
    }

    private static AbandonedCheckoutDetailDto MapToDetailDto(AbandonedCheckout checkout)
    {
        return new AbandonedCheckoutDetailDto
        {
            Id = checkout.Id,
            BasketId = checkout.BasketId,
            CustomerId = checkout.CustomerId,
            CustomerEmail = checkout.Email,
            CustomerName = checkout.CustomerName,
            Status = checkout.Status,
            StatusDisplay = GetStatusDisplay(checkout.Status),
            StatusCssClass = GetStatusCssClass(checkout.Status),
            DateCreated = checkout.DateCreated,
            LastActivityUtc = checkout.LastActivityUtc,
            DateAbandoned = checkout.DateAbandoned,
            DateRecovered = checkout.DateRecovered,
            DateConverted = checkout.DateConverted,
            DateExpired = checkout.DateExpired,
            RecoveredInvoiceId = checkout.RecoveredInvoiceId,
            RecoveryTokenExpiresUtc = checkout.RecoveryTokenExpiresUtc,
            RecoveryEmailsSent = checkout.RecoveryEmailsSent,
            LastRecoveryEmailSentUtc = checkout.LastRecoveryEmailSentUtc,
            BasketTotal = checkout.BasketTotal,
            FormattedTotal = $"{checkout.CurrencySymbol}{checkout.BasketTotal:N2}",
            ItemCount = checkout.ItemCount,
            CurrencyCode = checkout.CurrencyCode,
            CurrencySymbol = checkout.CurrencySymbol
        };
    }

    private static string GetStatusDisplay(AbandonedCheckoutStatus status)
    {
        return status switch
        {
            AbandonedCheckoutStatus.Active => "Active",
            AbandonedCheckoutStatus.Abandoned => "Abandoned",
            AbandonedCheckoutStatus.Recovered => "Recovered",
            AbandonedCheckoutStatus.Converted => "Converted",
            AbandonedCheckoutStatus.Expired => "Expired",
            _ => status.ToString()
        };
    }

    private static string GetStatusCssClass(AbandonedCheckoutStatus status)
    {
        return status switch
        {
            AbandonedCheckoutStatus.Active => "badge-default",
            AbandonedCheckoutStatus.Abandoned => "badge-warning",
            AbandonedCheckoutStatus.Recovered => "badge-info",
            AbandonedCheckoutStatus.Converted => "badge-positive",
            AbandonedCheckoutStatus.Expired => "badge-danger",
            _ => "badge-default"
        };
    }
}
