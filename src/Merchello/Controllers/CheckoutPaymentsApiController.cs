using Merchello.Controllers.Dtos;
using Merchello.Core.Data;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Controllers;

/// <summary>
/// Public API controller for frontend checkout payment operations
/// </summary>
[ApiController]
[Route("api/merchello/checkout")]
[AllowAnonymous]
public class CheckoutPaymentsApiController : ControllerBase
{
    private readonly IPaymentProviderManager _providerManager;
    private readonly IPaymentService _paymentService;
    private readonly IEFCoreScopeProvider<MerchelloDbContext> _scopeProvider;
    private readonly ILogger<CheckoutPaymentsApiController> _logger;

    public CheckoutPaymentsApiController(
        IPaymentProviderManager providerManager,
        IPaymentService paymentService,
        IEFCoreScopeProvider<MerchelloDbContext> scopeProvider,
        ILogger<CheckoutPaymentsApiController> logger)
    {
        _providerManager = providerManager;
        _paymentService = paymentService;
        _scopeProvider = scopeProvider;
        _logger = logger;
    }

    /// <summary>
    /// Get available payment methods for checkout
    /// </summary>
    [HttpGet("payment-methods")]
    [ProducesResponseType<List<PaymentMethodDto>>(StatusCodes.Status200OK)]
    public async Task<List<PaymentMethodDto>> GetPaymentMethods(CancellationToken cancellationToken = default)
    {
        var providers = await _providerManager.GetEnabledProvidersAsync(cancellationToken);

        return providers
            .OrderBy(p => p.SortOrder)
            .Select(p => new PaymentMethodDto
            {
                Alias = p.Metadata.Alias,
                DisplayName = p.DisplayName,
                Icon = p.Metadata.Icon,
                Description = p.Metadata.Description,
                IntegrationType = p.Metadata.IntegrationType,
                SortOrder = p.SortOrder
            })
            .ToList();
    }

    /// <summary>
    /// Create a payment session for an invoice
    /// </summary>
    [HttpPost("{invoiceId:guid}/pay")]
    [ProducesResponseType<PaymentSessionResponseDto>(StatusCodes.Status200OK)]
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
        using var scope = _scopeProvider.CreateScope();
        var invoiceExists = await scope.ExecuteWithContextAsync(async db =>
            await db.Invoices.AnyAsync(i => i.Id == invoiceId, cancellationToken));
        scope.Complete();

        if (!invoiceExists)
        {
            return NotFound($"Invoice '{invoiceId}' not found.");
        }

        // Verify provider is enabled
        var provider = await _providerManager.GetProviderAsync(
            request.ProviderAlias,
            requireEnabled: true,
            cancellationToken);

        if (provider == null)
        {
            return BadRequest($"Payment provider '{request.ProviderAlias}' is not available.");
        }

        // Create payment session
        var result = await _paymentService.CreatePaymentSessionAsync(
            invoiceId,
            request.ProviderAlias,
            request.ReturnUrl,
            request.CancelUrl,
            cancellationToken);

        var response = new PaymentSessionResponseDto
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
            _logger.LogWarning(
                "Payment session creation failed for invoice {InvoiceId} with provider {Provider}: {Error}",
                invoiceId,
                request.ProviderAlias,
                result.ErrorMessage);
        }
        else
        {
            _logger.LogInformation(
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
    [ProducesResponseType<PaymentReturnResponseDto>(StatusCodes.Status200OK)]
    public async Task<PaymentReturnResponseDto> HandleReturn(
        [FromQuery] PaymentReturnQuery query,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Payment return received: InvoiceId={InvoiceId}, TransactionId={TransactionId}, Provider={Provider}",
            query.InvoiceId,
            query.TransactionId,
            query.Provider);

        // If we have a transaction ID, check if payment was already recorded (via webhook)
        if (!string.IsNullOrEmpty(query.TransactionId))
        {
            var existingPayment = await _paymentService.GetPaymentByTransactionIdAsync(
                query.TransactionId,
                cancellationToken);

            if (existingPayment != null)
            {
                return new PaymentReturnResponseDto
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
        return new PaymentReturnResponseDto
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
    [ProducesResponseType<PaymentReturnResponseDto>(StatusCodes.Status200OK)]
    public Task<PaymentReturnResponseDto> HandleCancel(
        [FromQuery] PaymentReturnQuery query,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Payment cancelled: InvoiceId={InvoiceId}, TransactionId={TransactionId}, Provider={Provider}",
            query.InvoiceId,
            query.TransactionId,
            query.Provider);

        return Task.FromResult(new PaymentReturnResponseDto
        {
            Success = false,
            Message = "Payment was cancelled.",
            InvoiceId = query.InvoiceId
        });
    }
}

