using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Payments.Services;

/// <summary>
/// Service for handling payment operations.
/// </summary>
public class PaymentService(
    IPaymentProviderManager providerManager,
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IOptions<MerchelloSettings> settings,
    ILogger<PaymentService> logger) : IPaymentService
{
    private readonly MerchelloSettings _settings = settings.Value;

    /// <inheritdoc />
    public async Task<PaymentSessionResult> CreatePaymentSessionAsync(
        Guid invoiceId,
        string providerAlias,
        string returnUrl,
        string cancelUrl,
        CancellationToken cancellationToken = default)
    {
        // Get the provider
        var registeredProvider = await providerManager.GetProviderAsync(providerAlias, requireEnabled: true, cancellationToken);
        if (registeredProvider == null)
        {
            return PaymentSessionResult.Failed(
                $"Payment provider '{providerAlias}' is not available or not enabled.");
        }

        // Load the invoice to get amount and details
        using var scope = efCoreScopeProvider.CreateScope();
        var invoice = await scope.ExecuteWithContextAsync(async db =>
            await db.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == invoiceId, cancellationToken));
        scope.Complete();

        if (invoice == null)
        {
            return PaymentSessionResult.Failed($"Invoice '{invoiceId}' not found.");
        }

        // Create the payment request
        var request = new PaymentRequest
        {
            InvoiceId = invoiceId,
            Amount = invoice.Total,
            Currency = _settings.StoreCurrencyCode,
            ReturnUrl = returnUrl,
            CancelUrl = cancelUrl,
            Description = $"Payment for Invoice {invoice.InvoiceNumber}",
            Metadata = new()
            {
                ["invoiceId"] = invoiceId.ToString(),
                ["invoiceNumber"] = invoice.InvoiceNumber
            }
        };

        try
        {
            var result = await registeredProvider.Provider.CreatePaymentSessionAsync(request, cancellationToken);

            logger.LogInformation(
                "Payment session created for invoice {InvoiceId} via {Provider}. Success: {Success}, SessionId: {SessionId}",
                invoiceId, providerAlias, result.Success, result.SessionId);

            return result;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create payment session for invoice {InvoiceId} via {Provider}", invoiceId, providerAlias);
            return PaymentSessionResult.Failed($"Payment session creation failed: {ex.Message}");
        }
    }

    /// <inheritdoc />
    public async Task<CrudResult<Payment>> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Payment>();

        // Get the provider
        var registeredProvider = await providerManager.GetProviderAsync(request.ProviderAlias, requireEnabled: true, cancellationToken);
        if (registeredProvider == null)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Payment provider '{request.ProviderAlias}' is not available or not enabled.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        try
        {
            // Process the payment with the provider
            var paymentResult = await registeredProvider.Provider.ProcessPaymentAsync(request, cancellationToken);

            if (!paymentResult.Success)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = paymentResult.ErrorMessage ?? "Payment processing failed.",
                    ResultMessageType = ResultMessageType.Error
                });
                return result;
            }

            // Record the payment if completed or authorized
            if (paymentResult.Status == PaymentResultStatus.Completed ||
                paymentResult.Status == PaymentResultStatus.Authorized)
            {
                return await RecordPaymentAsync(
                    request.InvoiceId,
                    request.ProviderAlias,
                    paymentResult.TransactionId ?? Guid.NewGuid().ToString("N"),
                    paymentResult.Amount ?? request.Amount ?? 0,
                    cancellationToken: cancellationToken);
            }

            // For pending status, we'll wait for webhook confirmation
            if (paymentResult.Status == PaymentResultStatus.Pending)
            {
                logger.LogInformation(
                    "Payment pending for invoice {InvoiceId} via {Provider}. Awaiting webhook confirmation. TransactionId: {TransactionId}",
                    request.InvoiceId, request.ProviderAlias, paymentResult.TransactionId);

                result.Messages.Add(new ResultMessage
                {
                    Message = "Payment is pending confirmation.",
                    ResultMessageType = ResultMessageType.Success
                });
                return result;
            }

            result.Messages.Add(new ResultMessage
            {
                Message = $"Payment processing completed with status: {paymentResult.Status}",
                ResultMessageType = paymentResult.Success ? ResultMessageType.Success : ResultMessageType.Error
            });
            return result;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to process payment for invoice {InvoiceId} via {Provider}", request.InvoiceId, request.ProviderAlias);
            result.Messages.Add(new ResultMessage
            {
                Message = $"Payment processing failed: {ex.Message}",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }
    }

    /// <inheritdoc />
    public async Task<CrudResult<Payment>> RecordPaymentAsync(
        Guid invoiceId,
        string providerAlias,
        string transactionId,
        decimal amount,
        string? description = null,
        string? fraudResponse = null,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Payment>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            // Check if invoice exists
            var invoiceExists = await db.Invoices.AnyAsync(i => i.Id == invoiceId, cancellationToken);
            if (!invoiceExists)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Invoice '{invoiceId}' not found.",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            // Check for duplicate transaction ID
            var duplicateTransaction = await db.Payments
                .AnyAsync(p => p.TransactionId == transactionId, cancellationToken);
            if (duplicateTransaction)
            {
                logger.LogWarning(
                    "Duplicate payment transaction {TransactionId} for invoice {InvoiceId}. Ignoring.",
                    transactionId, invoiceId);

                // Return existing payment as success (idempotent)
                var existingPayment = await db.Payments
                    .FirstAsync(p => p.TransactionId == transactionId, cancellationToken);
                result.ResultObject = existingPayment;
                result.Messages.Add(new ResultMessage
                {
                    Message = "Payment already recorded for this transaction.",
                    ResultMessageType = ResultMessageType.Warning
                });
                return;
            }

            var payment = new Payment
            {
                InvoiceId = invoiceId,
                Amount = amount,
                PaymentProviderAlias = providerAlias,
                PaymentType = PaymentType.Payment,
                TransactionId = transactionId,
                Description = description,
                FraudResponse = fraudResponse,
                PaymentSuccess = true,
                DateCreated = DateTime.UtcNow
            };

            db.Payments.Add(payment);
            await db.SaveChangesAsync(cancellationToken);

            result.ResultObject = payment;
            logger.LogInformation(
                "Payment recorded: {PaymentId} for invoice {InvoiceId}, amount {Amount}, transaction {TransactionId}",
                payment.Id, invoiceId, amount, transactionId);
        });
        scope.Complete();

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Payment>> ProcessRefundAsync(
        Guid paymentId,
        decimal? amount,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Payment>();

        // Load the original payment
        using var scope = efCoreScopeProvider.CreateScope();
        var originalPayment = await scope.ExecuteWithContextAsync(async db =>
            await db.Payments
                .Include(p => p.Refunds)
                .FirstOrDefaultAsync(p => p.Id == paymentId, cancellationToken));

        if (originalPayment == null)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Payment '{paymentId}' not found.",
                ResultMessageType = ResultMessageType.Error
            });
            scope.Complete();
            return result;
        }

        if (originalPayment.PaymentType != PaymentType.Payment)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Cannot refund a refund payment.",
                ResultMessageType = ResultMessageType.Error
            });
            scope.Complete();
            return result;
        }

        // Calculate refundable amount
        var existingRefunds = originalPayment.Refunds?.Sum(r => Math.Abs(r.Amount)) ?? 0;
        var refundableAmount = originalPayment.Amount - existingRefunds;
        var refundAmount = amount ?? refundableAmount;

        if (refundAmount <= 0)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Refund amount must be greater than zero.",
                ResultMessageType = ResultMessageType.Error
            });
            scope.Complete();
            return result;
        }

        if (refundAmount > refundableAmount)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Refund amount ({refundAmount:C}) exceeds refundable amount ({refundableAmount:C}).",
                ResultMessageType = ResultMessageType.Error
            });
            scope.Complete();
            return result;
        }

        // Get the provider to process the refund
        if (string.IsNullOrEmpty(originalPayment.PaymentProviderAlias))
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Payment has no provider alias. Use RecordManualRefundAsync instead.",
                ResultMessageType = ResultMessageType.Error
            });
            scope.Complete();
            return result;
        }

        var registeredProvider = await providerManager.GetProviderAsync(
            originalPayment.PaymentProviderAlias,
            requireEnabled: false, // Allow refunds even if provider is disabled
            cancellationToken);

        if (registeredProvider == null)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Payment provider '{originalPayment.PaymentProviderAlias}' not found.",
                ResultMessageType = ResultMessageType.Error
            });
            scope.Complete();
            return result;
        }

        if (!registeredProvider.Metadata.SupportsRefunds)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Provider '{originalPayment.PaymentProviderAlias}' does not support refunds.",
                ResultMessageType = ResultMessageType.Error
            });
            scope.Complete();
            return result;
        }

        if (refundAmount < refundableAmount && !registeredProvider.Metadata.SupportsPartialRefunds)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Provider '{originalPayment.PaymentProviderAlias}' does not support partial refunds.",
                ResultMessageType = ResultMessageType.Error
            });
            scope.Complete();
            return result;
        }

        // Process refund with provider
        var refundRequest = new RefundRequest
        {
            PaymentId = paymentId,
            TransactionId = originalPayment.TransactionId!,
            Amount = refundAmount,
            Reason = reason
        };

        RefundResult refundResult;
        try
        {
            refundResult = await registeredProvider.Provider.RefundPaymentAsync(refundRequest, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to process refund for payment {PaymentId}", paymentId);
            result.Messages.Add(new ResultMessage
            {
                Message = $"Refund processing failed: {ex.Message}",
                ResultMessageType = ResultMessageType.Error
            });
            scope.Complete();
            return result;
        }

        if (!refundResult.Success)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Provider refund failed: {refundResult.ErrorMessage}",
                ResultMessageType = ResultMessageType.Error
            });
            scope.Complete();
            return result;
        }

        // Record the refund payment
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var isPartialRefund = refundAmount < originalPayment.Amount;
            var refundPayment = new Payment
            {
                InvoiceId = originalPayment.InvoiceId,
                Amount = -refundAmount, // Negative amount for refund
                PaymentProviderAlias = originalPayment.PaymentProviderAlias,
                PaymentType = isPartialRefund ? PaymentType.PartialRefund : PaymentType.Refund,
                TransactionId = refundResult.RefundTransactionId,
                RefundReason = reason,
                ParentPaymentId = paymentId,
                PaymentSuccess = true,
                Description = $"Refund for payment {originalPayment.TransactionId}",
                DateCreated = DateTime.UtcNow
            };

            db.Payments.Add(refundPayment);
            await db.SaveChangesAsync(cancellationToken);

            result.ResultObject = refundPayment;
            logger.LogInformation(
                "Refund recorded: {RefundId} for payment {PaymentId}, amount {Amount}, reason: {Reason}",
                refundPayment.Id, paymentId, refundAmount, reason);
        });
        scope.Complete();

        return result;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<Payment>> GetPaymentsForInvoiceAsync(
        Guid invoiceId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var payments = await scope.ExecuteWithContextAsync(async db =>
            await db.Payments
                .AsNoTracking()
                .Where(p => p.InvoiceId == invoiceId)
                .Include(p => p.Refunds)
                .OrderBy(p => p.DateCreated)
                .ToListAsync(cancellationToken));
        scope.Complete();
        return payments;
    }

    /// <inheritdoc />
    public async Task<Payment?> GetPaymentAsync(
        Guid paymentId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var payment = await scope.ExecuteWithContextAsync(async db =>
            await db.Payments
                .AsNoTracking()
                .Include(p => p.Refunds)
                .FirstOrDefaultAsync(p => p.Id == paymentId, cancellationToken));
        scope.Complete();
        return payment;
    }

    /// <inheritdoc />
    public async Task<Payment?> GetPaymentByTransactionIdAsync(
        string transactionId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(transactionId))
        {
            return null;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var payment = await scope.ExecuteWithContextAsync(async db =>
            await db.Payments
                .AsNoTracking()
                .Include(p => p.Refunds)
                .FirstOrDefaultAsync(p => p.TransactionId == transactionId, cancellationToken));
        scope.Complete();
        return payment;
    }

    /// <inheritdoc />
    public async Task<InvoicePaymentStatus> GetInvoicePaymentStatusAsync(
        Guid invoiceId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var statusInfo = await scope.ExecuteWithContextAsync(async db =>
        {
            var invoice = await db.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == invoiceId, cancellationToken);

            if (invoice == null)
            {
                return (InvoiceTotal: 0m, Payments: (List<Payment>)[]);
            }

            var payments = await db.Payments
                .AsNoTracking()
                .Where(p => p.InvoiceId == invoiceId && p.PaymentSuccess)
                .ToListAsync(cancellationToken);

            return (InvoiceTotal: invoice.Total, Payments: payments);
        });
        scope.Complete();

        var details = CalculatePaymentStatus(statusInfo.Payments, statusInfo.InvoiceTotal);
        return details.Status;
    }

    /// <inheritdoc />
    public PaymentStatusDetails CalculatePaymentStatus(IEnumerable<Payment> payments, decimal invoiceTotal)
    {
        var paymentList = payments.ToList();

        // Calculate totals - only count successful payments
        var totalPaid = paymentList
            .Where(p => p.PaymentSuccess && p.PaymentType == PaymentType.Payment)
            .Sum(p => p.Amount);

        var totalRefunded = paymentList
            .Where(p => p.PaymentSuccess &&
                  (p.PaymentType == PaymentType.Refund || p.PaymentType == PaymentType.PartialRefund))
            .Sum(p => Math.Abs(p.Amount));

        // Round to avoid floating-point precision issues using configured rounding strategy
        totalPaid = Math.Round(totalPaid, 2, _settings.DefaultRounding);
        totalRefunded = Math.Round(totalRefunded, 2, _settings.DefaultRounding);
        invoiceTotal = Math.Round(invoiceTotal, 2, _settings.DefaultRounding);

        var netPayment = totalPaid - totalRefunded;
        var balanceDue = Math.Max(0, invoiceTotal - netPayment);

        // Determine status
        InvoicePaymentStatus status;
        if (totalRefunded > 0 && netPayment <= 0)
        {
            status = InvoicePaymentStatus.Refunded;
        }
        else if (totalRefunded > 0 && netPayment < totalPaid)
        {
            status = InvoicePaymentStatus.PartiallyRefunded;
        }
        else if (netPayment >= invoiceTotal)
        {
            status = InvoicePaymentStatus.Paid;
        }
        else if (netPayment > 0)
        {
            status = InvoicePaymentStatus.PartiallyPaid;
        }
        else
        {
            status = InvoicePaymentStatus.Unpaid;
        }

        return new PaymentStatusDetails
        {
            Status = status,
            StatusDisplay = PaymentStatusDetails.GetStatusDisplay(status),
            TotalPaid = totalPaid,
            TotalRefunded = totalRefunded,
            NetPayment = netPayment,
            BalanceDue = balanceDue
        };
    }

    /// <inheritdoc />
    public async Task<CrudResult<Payment>> RecordManualPaymentAsync(
        Guid invoiceId,
        decimal amount,
        string paymentMethod,
        string? description = null,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Payment>();

        if (amount <= 0)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Payment amount must be greater than zero.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            // Verify invoice exists
            var invoiceExists = await db.Invoices.AnyAsync(i => i.Id == invoiceId, cancellationToken);
            if (!invoiceExists)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Invoice '{invoiceId}' not found.",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            var payment = new Payment
            {
                InvoiceId = invoiceId,
                Amount = amount,
                PaymentMethod = paymentMethod,
                PaymentProviderAlias = "manual",
                PaymentType = PaymentType.Payment,
                TransactionId = $"MANUAL-{Guid.NewGuid():N}".ToUpperInvariant(),
                Description = description ?? $"Manual payment: {paymentMethod}",
                PaymentSuccess = true,
                DateCreated = DateTime.UtcNow
            };

            db.Payments.Add(payment);
            await db.SaveChangesAsync(cancellationToken);

            result.ResultObject = payment;
            logger.LogInformation(
                "Manual payment recorded: {PaymentId} for invoice {InvoiceId}, amount {Amount}, method: {Method}",
                payment.Id, invoiceId, amount, paymentMethod);
        });
        scope.Complete();

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Payment>> RecordManualRefundAsync(
        Guid paymentId,
        decimal amount,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Payment>();

        if (amount <= 0)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Refund amount must be greater than zero.",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            // Load original payment
            var originalPayment = await db.Payments
                .Include(p => p.Refunds)
                .FirstOrDefaultAsync(p => p.Id == paymentId, cancellationToken);

            if (originalPayment == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Payment '{paymentId}' not found.",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            if (originalPayment.PaymentType != PaymentType.Payment)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Cannot refund a refund payment.",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            // Calculate refundable amount
            var existingRefunds = originalPayment.Refunds?.Sum(r => Math.Abs(r.Amount)) ?? 0;
            var refundableAmount = originalPayment.Amount - existingRefunds;

            if (amount > refundableAmount)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Refund amount ({amount:C}) exceeds refundable amount ({refundableAmount:C}).",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            var isPartialRefund = amount < originalPayment.Amount;
            var refundPayment = new Payment
            {
                InvoiceId = originalPayment.InvoiceId,
                Amount = -amount, // Negative for refund
                PaymentMethod = originalPayment.PaymentMethod,
                PaymentProviderAlias = originalPayment.PaymentProviderAlias,
                PaymentType = isPartialRefund ? PaymentType.PartialRefund : PaymentType.Refund,
                TransactionId = $"REFUND-{Guid.NewGuid():N}".ToUpperInvariant(),
                RefundReason = reason,
                ParentPaymentId = paymentId,
                PaymentSuccess = true,
                Description = $"Manual refund for payment {originalPayment.TransactionId}",
                DateCreated = DateTime.UtcNow
            };

            db.Payments.Add(refundPayment);
            await db.SaveChangesAsync(cancellationToken);

            result.ResultObject = refundPayment;
            logger.LogInformation(
                "Manual refund recorded: {RefundId} for payment {PaymentId}, amount {Amount}, reason: {Reason}",
                refundPayment.Id, paymentId, amount, reason);
        });
        scope.Complete();

        return result;
    }
}

