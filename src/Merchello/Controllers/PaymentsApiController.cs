using Asp.Versioning;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services;
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
    IInvoiceService invoiceService) : MerchelloApiControllerBase
{
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
            return NotFound($"Invoice '{invoiceId}' not found.");
        }

        var payments = await paymentService.GetPaymentsForInvoiceAsync(invoiceId, cancellationToken);

        // Only return top-level payments (not refunds, which are nested)
        var result = payments
            .Where(p => p.PaymentType == PaymentType.Payment)
            .Select(MapToPaymentDto)
            .ToList();

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

        return Ok(MapToPaymentDto(payment));
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
            return NotFound($"Invoice '{invoiceId}' not found.");
        }

        var payments = await paymentService.GetPaymentsForInvoiceAsync(invoiceId, cancellationToken);

        // Use centralized payment status calculation from PaymentService
        var details = paymentService.CalculatePaymentStatus(payments, invoice.Total);

        return Ok(new PaymentStatusDto
        {
            InvoiceId = invoiceId,
            Status = details.Status,
            StatusDisplay = details.StatusDisplay,
            InvoiceTotal = invoice.Total,
            TotalPaid = details.TotalPaid,
            TotalRefunded = details.TotalRefunded,
            NetPayment = details.NetPayment,
            BalanceDue = details.BalanceDue
        });
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
        if (request.Amount <= 0)
        {
            return BadRequest("Amount must be greater than zero.");
        }

        if (string.IsNullOrWhiteSpace(request.PaymentMethod))
        {
            return BadRequest("PaymentMethod is required.");
        }

        var result = await paymentService.RecordManualPaymentAsync(
            invoiceId,
            request.Amount,
            request.PaymentMethod,
            request.Description,
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

        return Ok(MapToPaymentDto(result.ResultObject!));
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
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest("Reason is required.");
        }

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

            result = await paymentService.RecordManualRefundAsync(
                id,
                amount,
                request.Reason,
                cancellationToken);
        }
        else
        {
            // Process refund via provider
            result = await paymentService.ProcessRefundAsync(
                id,
                request.Amount,
                request.Reason,
                cancellationToken);
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

        return Ok(MapToPaymentDto(result.ResultObject!));
    }

    // ============================================
    // Mapping Helpers
    // ============================================

    private static PaymentDto MapToPaymentDto(Payment payment)
    {
        var existingRefunds = payment.Refunds?.Sum(r => Math.Abs(r.Amount)) ?? 0;
        var refundableAmount = payment.PaymentType == PaymentType.Payment
            ? payment.Amount - existingRefunds
            : 0;

        return new PaymentDto
        {
            Id = payment.Id,
            InvoiceId = payment.InvoiceId,
            Amount = payment.Amount,
            PaymentMethod = payment.PaymentMethod,
            PaymentProviderAlias = payment.PaymentProviderAlias,
            PaymentType = payment.PaymentType,
            TransactionId = payment.TransactionId,
            Description = payment.Description,
            PaymentSuccess = payment.PaymentSuccess,
            RefundReason = payment.RefundReason,
            ParentPaymentId = payment.ParentPaymentId,
            DateCreated = payment.DateCreated,
            RefundableAmount = Math.Max(0, refundableAmount),
            Refunds = payment.Refunds?
                .OrderBy(r => r.DateCreated)
                .Select(MapToPaymentDto)
                .ToList()
        };
    }
}
