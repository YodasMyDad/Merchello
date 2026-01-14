using Asp.Versioning;
using Merchello.Core;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for managing payments in the backoffice
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class PaymentsApiController(
    IPaymentService paymentService,
    IInvoiceService invoiceService,
    ICurrencyService currencyService,
    IPaymentProviderManager paymentProviderManager) : MerchelloApiControllerBase
{
    private readonly ICurrencyService _currencyService = currencyService;
    private readonly IPaymentProviderManager _paymentProviderManager = paymentProviderManager;
    /// <summary>
    /// Get all payments for an invoice
    /// </summary>
    [HttpGet("invoices/{invoiceId:guid}/payments")]
    [ProducesResponseType<List<PaymentDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetInvoicePayments(Guid invoiceId, CancellationToken cancellationToken = default)
    {
        // Verify invoice exists
        var invoiceExists = await invoiceService.InvoiceExistsAsync(invoiceId, cancellationToken);

        if (!invoiceExists)
        {
            return NotFound("Invoice not found.");
        }

        var payments = await paymentService.GetPaymentsForInvoiceAsync(invoiceId, cancellationToken);

        // Only return top-level payments (not refunds, which are nested)
        var topLevelPayments = payments.Where(p => p.PaymentType == PaymentType.Payment);
        var result = new List<PaymentDto>();
        foreach (var payment in topLevelPayments)
        {
            result.Add(await MapToPaymentDtoAsync(payment, cancellationToken));
        }

        return Ok(result);
    }

    /// <summary>
    /// Get a specific payment by ID
    /// </summary>
    [HttpGet("payments/{id:guid}")]
    [ProducesResponseType<PaymentDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPayment(Guid id, CancellationToken cancellationToken = default)
    {
        var payment = await paymentService.GetPaymentAsync(id, cancellationToken);
        if (payment == null)
        {
            return NotFound();
        }

        return Ok(await MapToPaymentDtoAsync(payment, cancellationToken));
    }

    /// <summary>
    /// Get payment status for an invoice
    /// </summary>
    [HttpGet("invoices/{invoiceId:guid}/payment-status")]
    [ProducesResponseType<PaymentStatusDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPaymentStatus(Guid invoiceId, CancellationToken cancellationToken = default)
    {
        // Get invoice
        var invoice = await invoiceService.GetInvoiceAsync(invoiceId, cancellationToken);

        if (invoice == null)
        {
            return NotFound("Invoice not found.");
        }

        var payments = await paymentService.GetPaymentsForInvoiceAsync(invoiceId, cancellationToken);

        // Use centralized payment status calculation from PaymentService (includes store currency)
        var details = paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
        {
            Payments = payments,
            InvoiceTotal = invoice.Total,
            CurrencyCode = invoice.CurrencyCode,
            InvoiceTotalInStoreCurrency = invoice.TotalInStoreCurrency,
            StoreCurrencyCode = invoice.StoreCurrencyCode
        });

        // Calculate balance status (backend-provided to avoid frontend logic duplication)
        var balanceStatus = details.BalanceDue switch
        {
            > 0 => "Underpaid",
            < 0 => "Overpaid",
            _ => "Balanced"
        };

        var balanceStatusCssClass = details.BalanceDue switch
        {
            > 0 => "underpaid",
            < 0 => "overpaid",
            _ => "balanced"
        };

        var balanceStatusLabel = details.BalanceDue switch
        {
            > 0 => "Balance Due",
            < 0 => "Credit Due",
            _ => ""
        };

        return Ok(new PaymentStatusDto
        {
            InvoiceId = invoiceId,
            CurrencyCode = invoice.CurrencyCode,
            CurrencySymbol = invoice.CurrencySymbol,
            StoreCurrencyCode = invoice.StoreCurrencyCode,
            StoreCurrencySymbol = _currencyService.GetCurrency(invoice.StoreCurrencyCode).Symbol,
            Status = details.Status,
            StatusDisplay = details.StatusDisplay,
            InvoiceTotal = invoice.Total,
            InvoiceTotalInStoreCurrency = invoice.TotalInStoreCurrency,
            TotalPaid = details.TotalPaid,
            TotalPaidInStoreCurrency = details.TotalPaidInStoreCurrency,
            TotalRefunded = details.TotalRefunded,
            TotalRefundedInStoreCurrency = details.TotalRefundedInStoreCurrency,
            NetPayment = details.NetPayment,
            NetPaymentInStoreCurrency = details.NetPaymentInStoreCurrency,
            BalanceDue = details.BalanceDue,
            BalanceDueInStoreCurrency = details.BalanceDueInStoreCurrency,
            BalanceStatus = balanceStatus,
            BalanceStatusCssClass = balanceStatusCssClass,
            BalanceStatusLabel = balanceStatusLabel,
            MaxRiskScore = details.MaxRiskScore,
            MaxRiskScoreSource = details.MaxRiskScoreSource,
            RiskLevel = details.RiskLevel
        });
    }

    /// <summary>
    /// Get the form fields for recording manual payments.
    /// Used by backoffice modals to get payment method options from the provider.
    /// </summary>
    [HttpGet("payments/manual/form-fields")]
    [ProducesResponseType<List<CheckoutFormFieldDto>>(StatusCodes.Status200OK)]
    public IActionResult GetManualPaymentFormFields()
    {
        // Return the manual payment form fields
        // These match what ManualPaymentProvider.GetManualPaymentFormFields() returns
        var result = new List<CheckoutFormFieldDto>
        {
            new()
            {
                Key = Constants.FormFields.PaymentMethod,
                Label = "Payment Method",
                FieldType = "select",
                IsRequired = true,
                Options =
                [
                    new SelectOptionDto { Value = "cash", Label = "Cash" },
                    new SelectOptionDto { Value = "check", Label = "Check" },
                    new SelectOptionDto { Value = "bank_transfer", Label = "Bank Transfer" },
                    new SelectOptionDto { Value = "credit_card_manual", Label = "Credit Card (Manual)" },
                    new SelectOptionDto { Value = "paypal_manual", Label = "PayPal (Manual)" },
                    new SelectOptionDto { Value = "other", Label = "Other" }
                ]
            },
            new()
            {
                Key = Constants.FormFields.Reference,
                Label = "Reference Number",
                Description = "Check number, transaction reference, etc.",
                FieldType = "text",
                IsRequired = false,
                Placeholder = "e.g., CHK-12345"
            },
            new()
            {
                Key = Constants.FormFields.Notes,
                Label = "Notes",
                FieldType = "textarea",
                IsRequired = false
            }
        };

        return Ok(result);
    }

    /// <summary>
    /// Record a manual/offline payment
    /// </summary>
    [HttpPost("invoices/{invoiceId:guid}/payments/manual")]
    [ProducesResponseType<PaymentDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RecordManualPayment(
        Guid invoiceId,
        [FromBody] RecordManualPaymentDto request,
        CancellationToken cancellationToken = default)
    {
        // PaymentMethod is required at controller level (basic input validation)
        // Amount validation is handled by PaymentService (business rule - single source of truth)
        if (string.IsNullOrWhiteSpace(request.PaymentMethod))
        {
            return BadRequest("PaymentMethod is required.");
        }

        var result = await paymentService.RecordManualPaymentAsync(
            new RecordManualPaymentParameters
            {
                InvoiceId = invoiceId,
                Amount = request.Amount,
                PaymentMethod = request.PaymentMethod,
                Description = request.Description
            },
            cancellationToken);

        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to record payment.");
        }

        return Ok(await MapToPaymentDtoAsync(result.ResultObject!, cancellationToken));
    }

    /// <summary>
    /// Process a refund for a payment
    /// </summary>
    [HttpPost("payments/{id:guid}/refund")]
    [ProducesResponseType<PaymentDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ProcessRefund(
        Guid id,
        [FromBody] ProcessRefundDto request,
        CancellationToken cancellationToken = default)
    {
        // Reason validation is handled by PaymentService (business rule - single source of truth)
        Core.Shared.Models.CrudResult<Payment> result;

        if (request.IsManualRefund)
        {
            // Manual refund - just record it without calling provider
            var amount = request.Amount ?? 0;
            if (amount <= 0)
            {
                // Get original payment to determine full refund amount
                var payment = await paymentService.GetPaymentAsync(id, cancellationToken);
                if (payment == null)
                {
                    return NotFound($"Payment '{id}' not found.");
                }

                var existingRefunds = payment.Refunds?.Sum(r => Math.Abs(r.Amount)) ?? 0;
                amount = payment.Amount - existingRefunds;
            }

            result = await paymentService.RecordManualRefundAsync(new RecordManualRefundParameters
            {
                PaymentId = id,
                Amount = amount,
                Reason = request.Reason
            }, cancellationToken);
        }
        else
        {
            // Process refund via provider
            result = await paymentService.ProcessRefundAsync(new ProcessRefundParameters
            {
                PaymentId = id,
                Amount = request.Amount,
                Reason = request.Reason
            }, cancellationToken);
        }

        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to process refund.");
        }

        return Ok(await MapToPaymentDtoAsync(result.ResultObject!, cancellationToken));
    }

    /// <summary>
    /// Preview a refund calculation without processing it.
    /// Returns calculated amounts and provider capabilities for UI preview.
    /// </summary>
    [HttpPost("payments/{id:guid}/preview-refund")]
    [ProducesResponseType<RefundPreviewDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PreviewRefund(
        Guid id,
        [FromBody] PreviewRefundRequestDto? request,
        CancellationToken cancellationToken = default)
    {
        var result = await paymentService.PreviewRefundAsync(new PreviewRefundParameters
        {
            PaymentId = id,
            Amount = request?.Amount,
            Percentage = request?.Percentage
        }, cancellationToken);

        if (!result.Successful)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to preview refund.");
        }

        return Ok(result.ResultObject);
    }

    // ============================================
    // Mapping Helpers
    // ============================================

    private async Task<PaymentDto> MapToPaymentDtoAsync(Payment payment, CancellationToken cancellationToken = default)
    {
        var existingRefunds = payment.Refunds?.Sum(r => Math.Abs(r.Amount)) ?? 0;
        var refundableAmount = payment.PaymentType == PaymentType.Payment
            ? payment.Amount - existingRefunds
            : 0;

        // Determine provider refund capability
        var (canRefundViaProvider, reason, supportsPartialRefunds) =
            await GetProviderRefundCapabilityAsync(payment, cancellationToken);

        // Map child refunds (recursively)
        List<PaymentDto>? refunds = null;
        if (payment.Refunds != null)
        {
            refunds = [];
            foreach (var refund in payment.Refunds.OrderBy(r => r.DateCreated))
            {
                refunds.Add(await MapToPaymentDtoAsync(refund, cancellationToken));
            }
        }

        return new PaymentDto
        {
            Id = payment.Id,
            InvoiceId = payment.InvoiceId,
            Amount = payment.Amount,
            CurrencyCode = payment.CurrencyCode,
            CurrencySymbol = _currencyService.GetCurrency(payment.CurrencyCode).Symbol,
            AmountInStoreCurrency = payment.AmountInStoreCurrency,
            SettlementCurrencyCode = payment.SettlementCurrencyCode,
            SettlementExchangeRate = payment.SettlementExchangeRate,
            SettlementAmount = payment.SettlementAmount,
            SettlementExchangeRateSource = payment.SettlementExchangeRateSource,
            PaymentMethod = payment.PaymentMethod,
            PaymentProviderAlias = payment.PaymentProviderAlias,
            PaymentType = payment.PaymentType,
            TransactionId = payment.TransactionId,
            Description = payment.Description,
            IsPaymentSuccessful = payment.PaymentSuccess,
            RefundReason = payment.RefundReason,
            ParentPaymentId = payment.ParentPaymentId,
            DateCreated = payment.DateCreated,
            RiskScore = payment.RiskScore,
            RiskScoreSource = payment.RiskScoreSource,
            RiskLevel = PaymentStatusDetails.GetRiskLevel(payment.RiskScore),
            RefundableAmount = Math.Max(0, refundableAmount),
            CanRefundViaProvider = canRefundViaProvider,
            CannotRefundViaProviderReason = reason,
            SupportsPartialRefunds = supportsPartialRefunds,
            Refunds = refunds
        };
    }

    /// <summary>
    /// Determines whether a payment can be refunded via its original provider.
    /// </summary>
    private async Task<(bool CanRefund, string? Reason, bool SupportsPartial)> GetProviderRefundCapabilityAsync(
        Payment payment,
        CancellationToken cancellationToken)
    {
        // Not a refundable payment type (refunds can't be refunded)
        if (payment.PaymentType != PaymentType.Payment)
        {
            return (false, null, false);
        }

        // No provider alias = manual payment (use manual refund, no reason needed)
        if (string.IsNullOrEmpty(payment.PaymentProviderAlias) ||
            string.Equals(payment.PaymentProviderAlias, "manual", StringComparison.OrdinalIgnoreCase))
        {
            return (false, null, false);
        }

        // Check if provider exists (don't require enabled - allow refunds even if provider is disabled)
        var provider = await _paymentProviderManager.GetProviderAsync(
            payment.PaymentProviderAlias,
            requireEnabled: false,
            cancellationToken);

        if (provider == null)
        {
            return (false,
                $"The payment provider '{payment.PaymentProviderAlias}' is no longer installed. " +
                "Use manual refund to record a refund processed directly with the provider.",
                false);
        }

        if (!provider.Metadata.SupportsRefunds)
        {
            return (false,
                $"The '{provider.Metadata.DisplayName}' provider does not support refunds. " +
                "Use manual refund to record a refund processed directly with the provider.",
                false);
        }

        // Provider can refund
        return (true, null, provider.Metadata.SupportsPartialRefunds);
    }
}
