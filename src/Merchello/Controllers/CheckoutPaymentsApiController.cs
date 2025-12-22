using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Merchello.Controllers;

/// <summary>
/// Public API controller for frontend checkout payment operations
/// </summary>
[ApiController]
[Route("api/merchello/checkout")]
[AllowAnonymous]
public class CheckoutPaymentsApiController(
    IPaymentProviderManager providerManager,
    IPaymentService paymentService,
    IInvoiceService invoiceService,
    ILogger<CheckoutPaymentsApiController> logger) : ControllerBase
{
    /// <summary>
    /// Get available payment methods for checkout
    /// </summary>
    [HttpGet("payment-methods")]
    [ProducesResponseType<IReadOnlyCollection<PaymentMethodDto>>(StatusCodes.Status200OK)]
    public async Task<IReadOnlyCollection<PaymentMethodDto>> GetPaymentMethods(CancellationToken cancellationToken = default)
    {
        return await providerManager.GetEnabledPaymentMethodsAsync(cancellationToken);
    }

    /// <summary>
    /// Create a payment session for an invoice
    /// </summary>
    [HttpPost("{invoiceId:guid}/pay")]
    [ProducesResponseType<PaymentSessionResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreatePaymentSession(
        Guid invoiceId,
        [FromBody] InitiatePaymentDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ProviderAlias))
        {
            return BadRequest("ProviderAlias is required.");
        }

        if (string.IsNullOrWhiteSpace(request.ReturnUrl))
        {
            return BadRequest("ReturnUrl is required.");
        }

        if (string.IsNullOrWhiteSpace(request.CancelUrl))
        {
            return BadRequest("CancelUrl is required.");
        }

        // Verify invoice exists
        var invoiceExists = await invoiceService.InvoiceExistsAsync(invoiceId, cancellationToken);

        if (!invoiceExists)
        {
            return NotFound($"Invoice '{invoiceId}' not found.");
        }

        // Verify provider is enabled
        var provider = await providerManager.GetProviderAsync(
            request.ProviderAlias,
            requireEnabled: true,
            cancellationToken);

        if (provider == null)
        {
            return BadRequest($"Payment provider '{request.ProviderAlias}' is not available.");
        }

        // Create payment session
        var result = await paymentService.CreatePaymentSessionAsync(
            new CreatePaymentSessionParameters
            {
                InvoiceId = invoiceId,
                ProviderAlias = request.ProviderAlias,
                ReturnUrl = request.ReturnUrl,
                CancelUrl = request.CancelUrl
            },
            cancellationToken);

        var response = new PaymentSessionResultDto
        {
            Success = result.Success,
            SessionId = result.SessionId,
            IntegrationType = result.IntegrationType,
            RedirectUrl = result.RedirectUrl,
            ClientToken = result.ClientToken,
            ClientSecret = result.ClientSecret,
            JavaScriptSdkUrl = result.JavaScriptSdkUrl,
            SdkConfiguration = result.SdkConfiguration,
            FormFields = result.FormFields?.Select(f => new CheckoutFormFieldDto
            {
                Key = f.Key,
                Label = f.Label,
                Description = f.Description,
                FieldType = f.FieldType.ToString(),
                IsRequired = f.IsRequired,
                DefaultValue = f.DefaultValue,
                Placeholder = f.Placeholder,
                ValidationPattern = f.ValidationPattern,
                ValidationMessage = f.ValidationMessage,
                Options = f.Options?.Select(o => new SelectOptionDto
                {
                    Value = o.Value,
                    Label = o.Label
                }).ToList()
            }).ToList(),
            ErrorMessage = result.ErrorMessage
        };

        if (!result.Success)
        {
            logger.LogWarning(
                "Payment session creation failed for invoice {InvoiceId} with provider {Provider}: {Error}",
                invoiceId,
                request.ProviderAlias,
                result.ErrorMessage);
        }
        else
        {
            logger.LogInformation(
                "Payment session created for invoice {InvoiceId} with provider {Provider}, SessionId: {SessionId}",
                invoiceId,
                request.ProviderAlias,
                result.SessionId);
        }

        return Ok(response);
    }

    /// <summary>
    /// Handle return from payment gateway after successful payment
    /// </summary>
    [HttpGet("return")]
    [ProducesResponseType<PaymentReturnResultDto>(StatusCodes.Status200OK)]
    public async Task<PaymentReturnResultDto> HandleReturn(
        [FromQuery] PaymentReturnQueryDto query,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Payment return received: InvoiceId={InvoiceId}, TransactionId={TransactionId}, Provider={Provider}",
            query.InvoiceId,
            query.TransactionId,
            query.Provider);

        // If we have a transaction ID, check if payment was already recorded (via webhook)
        if (!string.IsNullOrEmpty(query.TransactionId))
        {
            var existingPayment = await paymentService.GetPaymentByTransactionIdAsync(
                query.TransactionId,
                cancellationToken);

            if (existingPayment != null)
            {
                return new PaymentReturnResultDto
                {
                    Success = existingPayment.PaymentSuccess,
                    Message = existingPayment.PaymentSuccess
                        ? "Payment completed successfully."
                        : "Payment was not successful.",
                    InvoiceId = existingPayment.InvoiceId,
                    PaymentId = existingPayment.Id
                };
            }
        }

        // Payment not yet recorded - it may be processed via webhook shortly
        // Return a pending status
        return new PaymentReturnResultDto
        {
            Success = true,
            Message = "Payment is being processed. Please wait for confirmation.",
            InvoiceId = query.InvoiceId
        };
    }

    /// <summary>
    /// Handle cancel from payment gateway
    /// </summary>
    [HttpGet("cancel")]
    [ProducesResponseType<PaymentReturnResultDto>(StatusCodes.Status200OK)]
    public Task<PaymentReturnResultDto> HandleCancel(
        [FromQuery] PaymentReturnQueryDto query,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Payment cancelled: InvoiceId={InvoiceId}, TransactionId={TransactionId}, Provider={Provider}",
            query.InvoiceId,
            query.TransactionId,
            query.Provider);

        return Task.FromResult(new PaymentReturnResultDto
        {
            Success = false,
            Message = "Payment was cancelled.",
            InvoiceId = query.InvoiceId
        });
    }
}
