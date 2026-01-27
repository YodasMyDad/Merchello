using Asp.Versioning;
using Merchello.Controllers.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for creating and managing payment links for invoices.
/// Allows staff to generate shareable payment URLs for customers.
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class PaymentLinksApiController(IPaymentLinkService paymentLinkService) : MerchelloApiControllerBase
{
    /// <summary>
    /// Create a payment link for an invoice using the specified provider.
    /// </summary>
    /// <param name="request">The payment link creation request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The created payment link info.</returns>
    [HttpPost("payment-links")]
    [ProducesResponseType<PaymentLinkInfoDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreatePaymentLink(
        [FromBody] CreatePaymentLinkDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.InvoiceId == Guid.Empty)
        {
            return BadRequest("InvoiceId is required.");
        }

        if (string.IsNullOrWhiteSpace(request.ProviderAlias))
        {
            return BadRequest("ProviderAlias is required.");
        }

        // Get the username of the current user
        var createdBy = User.Identity?.Name;

        var result = await paymentLinkService.CreatePaymentLinkAsync(
            request.InvoiceId,
            request.ProviderAlias,
            createdBy,
            cancellationToken);

        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to create payment link.");
        }

        return Ok(MapToDto(result.ResultObject!));
    }

    /// <summary>
    /// Get the current payment link for an invoice (if any).
    /// </summary>
    /// <param name="invoiceId">The invoice ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The payment link info, or empty response if no link exists.</returns>
    [HttpGet("invoices/{invoiceId:guid}/payment-link")]
    [ProducesResponseType<PaymentLinkInfoDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPaymentLink(
        Guid invoiceId,
        CancellationToken cancellationToken = default)
    {
        var linkInfo = await paymentLinkService.GetPaymentLinkForInvoiceAsync(invoiceId, cancellationToken);

        if (linkInfo is null)
        {
            return Ok(new PaymentLinkInfoDto
            {
                HasActiveLink = false,
                IsPaid = false
            });
        }

        return Ok(MapToDto(linkInfo));
    }

    /// <summary>
    /// Deactivate the payment link for an invoice.
    /// </summary>
    /// <param name="invoiceId">The invoice ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Success status.</returns>
    [HttpPost("invoices/{invoiceId:guid}/payment-link/deactivate")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeactivatePaymentLink(
        Guid invoiceId,
        CancellationToken cancellationToken = default)
    {
        var result = await paymentLinkService.DeactivatePaymentLinkAsync(invoiceId, cancellationToken);

        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to deactivate payment link.");
        }

        return Ok(new { success = true });
    }

    /// <summary>
    /// Get all payment providers that support payment links.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of providers that support payment links.</returns>
    [HttpGet("payment-links/providers")]
    [ProducesResponseType<List<PaymentLinkProviderDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPaymentLinkProviders(CancellationToken cancellationToken = default)
    {
        var providers = await paymentLinkService.GetPaymentLinkProvidersAsync(cancellationToken);

        var result = providers.Select(p => new PaymentLinkProviderDto
        {
            Alias = p.Alias,
            DisplayName = p.DisplayName,
            IconHtml = p.IconHtml
        }).ToList();

        return Ok(result);
    }

    private static PaymentLinkInfoDto MapToDto(PaymentLinkInfo info) => new()
    {
        PaymentUrl = info.PaymentUrl,
        ProviderAlias = info.ProviderAlias,
        ProviderDisplayName = info.ProviderDisplayName,
        CreatedAt = info.CreatedAt,
        CreatedBy = info.CreatedBy,
        IsPaid = info.IsPaid,
        HasActiveLink = info.HasActiveLink
    };
}
