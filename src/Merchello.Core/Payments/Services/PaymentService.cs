using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.Payment;
using Merchello.Core.Payments.Factories;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shared.RateLimiting.Interfaces;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shared.Services.Interfaces;
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
    PaymentFactory paymentFactory,
    ICurrencyService currencyService,
    IMerchelloNotificationPublisher notificationPublisher,
    IRateLimiter rateLimiter,
    IPaymentIdempotencyService idempotencyService,
    IOptions<MerchelloSettings> settings,
    ILogger<PaymentService> logger) : IPaymentService
{
    private readonly MerchelloSettings _settings = settings.Value;
    private readonly ICurrencyService _currencyService = currencyService;

    /// <summary>
    /// Rate limit: max 10 payment session requests per minute per invoice.
    /// </summary>
    private const int MaxPaymentSessionsPerMinute = 10;

    /// <summary>
    /// Rate limit window duration.
    /// </summary>
    private static readonly TimeSpan RateLimitWindow = TimeSpan.FromMinutes(1);

    /// <inheritdoc />
    public async Task<PaymentSessionResult> CreatePaymentSessionAsync(
        CreatePaymentSessionParameters parameters,
        CancellationToken cancellationToken = default)
    {
        // Rate limit payment session creation per invoice using atomic rate limiter
        var rateLimitKey = $"payment_rate_{parameters.InvoiceId}";
        var rateLimitResult = rateLimiter.TryAcquire(rateLimitKey, MaxPaymentSessionsPerMinute, RateLimitWindow);

        if (!rateLimitResult.IsAllowed)
        {
            logger.LogWarning(
                "Rate limit exceeded for payment sessions on invoice {InvoiceId}. Count: {Count}",
                parameters.InvoiceId, rateLimitResult.CurrentCount);
            return PaymentSessionResult.Failed(
                "Too many payment attempts. Please wait a moment before trying again.");
        }

        // Get the provider
        var registeredProvider = await providerManager.GetProviderAsync(parameters.ProviderAlias, requireEnabled: true, cancellationToken);
        if (registeredProvider == null)
        {
            return PaymentSessionResult.Failed(
                $"Payment provider '{parameters.ProviderAlias}' is not available or not enabled.");
        }

        // Check if this is a DirectForm method that doesn't require an invoice
        // DirectForm methods (e.g., Purchase Order) defer invoice creation until form submission
        // to prevent ghost orders when form validation fails
        var methodDefinition = registeredProvider.Provider.GetAvailablePaymentMethods()
            .FirstOrDefault(m => m.Alias == (parameters.MethodAlias ?? parameters.ProviderAlias));

        if (methodDefinition?.IntegrationType == PaymentIntegrationType.DirectForm)
        {
            // DirectForm methods don't need an invoice - they just return form fields
            // The invoice is created later in ProcessDirectPayment after form validation
            var directFormRequest = new PaymentRequest
            {
                InvoiceId = parameters.InvoiceId,
                MethodAlias = parameters.MethodAlias,
                Amount = 0,
                Currency = string.Empty,
                ReturnUrl = parameters.ReturnUrl,
                CancelUrl = parameters.CancelUrl
            };

            try
            {
                var directFormResult = await registeredProvider.Provider.CreatePaymentSessionAsync(directFormRequest, cancellationToken);

                logger.LogInformation(
                    "DirectForm payment session created for provider {Provider}. Success: {Success}, SessionId: {SessionId}",
                    parameters.ProviderAlias, directFormResult.Success, directFormResult.SessionId);

                return directFormResult;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to create DirectForm payment session for provider {Provider}", parameters.ProviderAlias);
                return PaymentSessionResult.Failed($"Payment session creation failed: {ex.Message}");
            }
        }

        // Load the invoice to get amount and details (required for non-DirectForm methods)
        using var scope = efCoreScopeProvider.CreateScope();
        var invoice = await scope.ExecuteWithContextAsync(async db =>
            await db.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == parameters.InvoiceId, cancellationToken));
        scope.Complete();

        if (invoice == null)
        {
            return PaymentSessionResult.Failed("Invoice not found.");
        }

        // Create the payment request
        var request = new PaymentRequest
        {
            InvoiceId = parameters.InvoiceId,
            MethodAlias = parameters.MethodAlias,
            Amount = invoice.Total,
            Currency = invoice.CurrencyCode,
            ReturnUrl = parameters.ReturnUrl,
            CancelUrl = parameters.CancelUrl,
            Description = $"Payment for Invoice {invoice.InvoiceNumber}",
            Metadata = new()
            {
                ["invoiceId"] = parameters.InvoiceId.ToString(),
                ["invoiceNumber"] = invoice.InvoiceNumber
            }
        };

        try
        {
            var result = await registeredProvider.Provider.CreatePaymentSessionAsync(request, cancellationToken);

            logger.LogInformation(
                "Payment session created for invoice {InvoiceId} via {Provider}. Success: {Success}, SessionId: {SessionId}",
                parameters.InvoiceId, parameters.ProviderAlias, result.Success, result.SessionId);

            return result;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create payment session for invoice {InvoiceId} via {Provider}", parameters.InvoiceId, parameters.ProviderAlias);
            return PaymentSessionResult.Failed($"Payment session creation failed: {ex.Message}");
        }
    }

    /// <inheritdoc />
    public async Task<CrudResult<Payment>> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Payment>();

        // Check idempotency if key provided
        if (!string.IsNullOrEmpty(request.IdempotencyKey))
        {
            var cachedResult = await idempotencyService.GetCachedPaymentResultAsync(request.IdempotencyKey, cancellationToken);
            if (cachedResult != null)
            {
                logger.LogInformation(
                    "Returning cached payment result for idempotency key {Key}",
                    request.IdempotencyKey);

                if (cachedResult.Success)
                {
                    result.AddSuccessMessage("Payment already processed (idempotent request).");
                }
                else
                {
                    result.AddErrorMessage(cachedResult.ErrorMessage ?? "Payment previously failed.");
                }
                return result;
            }

            // Mark as processing to prevent concurrent duplicates
            if (!await idempotencyService.TryMarkAsProcessingAsync(request.IdempotencyKey, cancellationToken))
            {
                result.AddErrorMessage("Payment is already being processed. Please wait.");
                return result;
            }
        }

        // Get the provider
        var registeredProvider = await providerManager.GetProviderAsync(request.ProviderAlias, requireEnabled: true, cancellationToken);
        if (registeredProvider == null)
        {
            // Clear processing marker since we're returning early
            if (!string.IsNullOrEmpty(request.IdempotencyKey))
            {
                idempotencyService.ClearProcessingMarker(request.IdempotencyKey);
            }

            result.AddErrorMessage($"Payment provider '{request.ProviderAlias}' is not available or not enabled.");
            return result;
        }

        try
        {
            // Process the payment with the provider
            var paymentResult = await registeredProvider.Provider.ProcessPaymentAsync(request, cancellationToken);

            // Cache the result for idempotency
            if (!string.IsNullOrEmpty(request.IdempotencyKey))
            {
                idempotencyService.CachePaymentResult(request.IdempotencyKey, paymentResult);
            }

            if (!paymentResult.Success)
            {
                result.AddErrorMessage(paymentResult.ErrorMessage ?? "Payment processing failed.");
                return result;
            }

            // Check if provider explicitly wants to skip payment recording (e.g., Purchase Order)
            if (paymentResult.SkipPaymentRecording)
            {
                logger.LogInformation(
                    "Skipping payment recording for invoice {InvoiceId} via {Provider} (SkipPaymentRecording=true)",
                    request.InvoiceId, request.ProviderAlias);

                result.AddSuccessMessage("Payment method accepted. Payment will be recorded when received.");
                return result;
            }

            // Record the payment if completed, authorized, or pending
            // Pending status is used for async payment confirmations (e.g., webhooks)
            if (paymentResult.Status == PaymentResultStatus.Completed ||
                paymentResult.Status == PaymentResultStatus.Authorized ||
                paymentResult.Status == PaymentResultStatus.Pending)
            {
                // Look up the method display name from the provider
                var methodDisplayName = GetMethodDisplayName(registeredProvider.Provider, request.MethodAlias);

                if (paymentResult.Status == PaymentResultStatus.Pending)
                {
                    logger.LogInformation(
                        "Payment pending for invoice {InvoiceId} via {Provider}. Recording payment with pending status. TransactionId: {TransactionId}",
                        request.InvoiceId, request.ProviderAlias, paymentResult.TransactionId);
                }

                return await RecordPaymentAsync(
                    new RecordPaymentParameters
                    {
                        InvoiceId = request.InvoiceId,
                        ProviderAlias = request.ProviderAlias,
                        TransactionId = paymentResult.TransactionId ?? Guid.NewGuid().ToString("N"),
                        Amount = paymentResult.Amount ?? request.Amount ?? 0,
                        SettlementCurrencyCode = paymentResult.SettlementCurrency,
                        SettlementExchangeRate = paymentResult.SettlementExchangeRate,
                        SettlementAmount = paymentResult.SettlementAmount,
                        SettlementExchangeRateSource = request.ProviderAlias,
                        RiskScore = paymentResult.RiskScore,
                        RiskScoreSource = paymentResult.RiskScoreSource,
                        MethodAlias = request.MethodAlias,
                        MethodDisplayName = methodDisplayName
                    },
                    cancellationToken);
            }

            if (paymentResult.Success)
                result.AddSuccessMessage($"Payment processing completed with status: {paymentResult.Status}");
            else
                result.AddErrorMessage($"Payment processing completed with status: {paymentResult.Status}");
            return result;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to process payment for invoice {InvoiceId} via {Provider}", request.InvoiceId, request.ProviderAlias);

            // Clear processing marker on exception (don't cache exception results to allow retry)
            if (!string.IsNullOrEmpty(request.IdempotencyKey))
            {
                idempotencyService.ClearProcessingMarker(request.IdempotencyKey);
            }

            result.AddErrorMessage($"Payment processing failed: {ex.Message}");
            return result;
        }
    }

    /// <inheritdoc />
    public async Task<CrudResult<Payment>> RecordPaymentAsync(
        RecordPaymentParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Payment>();
        Payment? createdPayment = null;

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var invoice = await db.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == parameters.InvoiceId, cancellationToken);
            if (invoice == null)
            {
                result.AddErrorMessage("Invoice not found.");
                return false;
            }

            // Check for duplicate transaction ID (single query to avoid race condition)
            var existingPayment = await db.Payments
                .FirstOrDefaultAsync(p => p.TransactionId == parameters.TransactionId, cancellationToken);
            if (existingPayment != null)
            {
                logger.LogWarning(
                    "Duplicate payment transaction {TransactionId} for invoice {InvoiceId}. Ignoring.",
                    parameters.TransactionId, parameters.InvoiceId);

                // Return existing payment as success (idempotent)
                result.ResultObject = existingPayment;
                result.AddWarningMessage("Payment already recorded for this transaction.");
                return true;
            }

            var payment = paymentFactory.CreatePayment(
                invoiceId: parameters.InvoiceId,
                amount: parameters.Amount,
                currencyCode: invoice.CurrencyCode,
                storeCurrencyCode: invoice.StoreCurrencyCode,
                pricingExchangeRate: invoice.PricingExchangeRate,
                providerAlias: parameters.ProviderAlias,
                transactionId: parameters.TransactionId,
                description: parameters.Description,
                fraudResponse: parameters.FraudResponse,
                settlementCurrencyCode: parameters.SettlementCurrencyCode,
                settlementExchangeRate: parameters.SettlementExchangeRate,
                settlementAmount: parameters.SettlementAmount,
                settlementExchangeRateSource: parameters.SettlementExchangeRateSource,
                riskScore: parameters.RiskScore,
                riskScoreSource: parameters.RiskScoreSource,
                methodDisplayName: parameters.MethodDisplayName);

            // Publish "Before" notification - handlers can cancel or modify
            var creatingNotification = new PaymentCreatingNotification(payment);
            if (await notificationPublisher.PublishCancelableAsync(creatingNotification, cancellationToken))
            {
                result.AddErrorMessage(creatingNotification.CancelReason ?? "Payment creation cancelled");
                return false;
            }

            db.Payments.Add(payment);

            try
            {
                await db.SaveChangesAsync(cancellationToken);

                result.ResultObject = payment;
                createdPayment = payment;
                logger.LogInformation(
                    "Payment recorded: {PaymentId} for invoice {InvoiceId}, amount {Amount}, transaction {TransactionId}",
                    payment.Id, parameters.InvoiceId, parameters.Amount, parameters.TransactionId);
            }
            catch (DbUpdateException) when (!string.IsNullOrEmpty(parameters.TransactionId))
            {
                // Unique constraint violation on TransactionId - concurrent webhook created duplicate
                // Fetch the existing payment and return it (idempotent behavior)
                db.ChangeTracker.Clear();
                var concurrentPayment = await db.Payments
                    .FirstOrDefaultAsync(p => p.TransactionId == parameters.TransactionId, cancellationToken);

                if (concurrentPayment != null)
                {
                    logger.LogWarning(
                        "Concurrent duplicate payment transaction {TransactionId} for invoice {InvoiceId}. Returning existing payment.",
                        parameters.TransactionId, parameters.InvoiceId);

                    result.ResultObject = concurrentPayment;
                    result.AddWarningMessage("Payment already recorded for this transaction.");
                }
                else
                {
                    // DbUpdateException for another reason - rethrow
                    throw;
                }
            }

            return true;
        });
        scope.Complete();

        // Publish notification AFTER scope completion to avoid nested scope issues
        if (createdPayment != null)
        {
            await notificationPublisher.PublishAsync(new PaymentCreatedNotification(createdPayment), cancellationToken);
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Payment>> ProcessRefundAsync(
        ProcessRefundParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var paymentId = parameters.PaymentId;
        var amount = parameters.Amount;
        var reason = parameters.Reason;
        var idempotencyKey = parameters.IdempotencyKey;

        var result = new CrudResult<Payment>();

        // Check idempotency if key provided
        if (!string.IsNullOrEmpty(idempotencyKey))
        {
            var cachedResult = await idempotencyService.GetCachedRefundResultAsync(idempotencyKey, cancellationToken);
            if (cachedResult != null)
            {
                logger.LogInformation(
                    "Returning cached refund result for idempotency key {Key}",
                    idempotencyKey);

                if (cachedResult.Success)
                {
                    result.AddSuccessMessage("Refund already processed (idempotent request).");
                }
                else
                {
                    result.AddErrorMessage(cachedResult.ErrorMessage ?? "Refund previously failed.");
                }
                return result;
            }

            // Mark as processing to prevent concurrent duplicates
            if (!await idempotencyService.TryMarkAsProcessingAsync(idempotencyKey, cancellationToken))
            {
                result.AddErrorMessage("Refund is already being processed. Please wait.");
                return result;
            }
        }

        // Validate refund reason (required business rule)
        if (string.IsNullOrWhiteSpace(reason))
        {
            ClearRefundIdempotencyMarker(idempotencyKey);
            result.AddErrorMessage("Refund reason is required.");
            return result;
        }

        // Load the original payment
        using var scope = efCoreScopeProvider.CreateScope();
        var originalPayment = await scope.ExecuteWithContextAsync(async db =>
            await db.Payments
                .Include(p => p.Refunds)
                .FirstOrDefaultAsync(p => p.Id == paymentId, cancellationToken));

        if (originalPayment == null)
        {
            ClearRefundIdempotencyMarker(idempotencyKey);
            result.AddErrorMessage($"Payment '{paymentId}' not found.");
            scope.Complete();
            return result;
        }

        if (originalPayment.PaymentType != PaymentType.Payment)
        {
            ClearRefundIdempotencyMarker(idempotencyKey);
            result.AddErrorMessage("Cannot refund a refund payment.");
            scope.Complete();
            return result;
        }

        // Calculate refundable amount
        var existingRefunds = originalPayment.Refunds?.Sum(r => Math.Abs(r.Amount)) ?? 0;
        var refundableAmount = originalPayment.Amount - existingRefunds;
        var refundAmount = amount ?? refundableAmount;

        if (refundAmount <= 0)
        {
            ClearRefundIdempotencyMarker(idempotencyKey);
            result.AddErrorMessage("Refund amount must be greater than zero.");
            scope.Complete();
            return result;
        }

        if (refundAmount > refundableAmount)
        {
            ClearRefundIdempotencyMarker(idempotencyKey);
            result.AddErrorMessage($"Refund amount ({refundAmount:C}) exceeds refundable amount ({refundableAmount:C}).");
            scope.Complete();
            return result;
        }

        // Get the provider to process the refund
        if (string.IsNullOrEmpty(originalPayment.PaymentProviderAlias))
        {
            ClearRefundIdempotencyMarker(idempotencyKey);
            result.AddErrorMessage("Payment has no provider alias. Use RecordManualRefundAsync instead.");
            scope.Complete();
            return result;
        }

        // Publish "Before" notification - handlers can cancel
        var refundingNotification = new PaymentRefundingNotification(originalPayment, refundAmount, reason);
        if (await notificationPublisher.PublishCancelableAsync(refundingNotification, cancellationToken))
        {
            ClearRefundIdempotencyMarker(idempotencyKey);
            result.AddErrorMessage(refundingNotification.CancelReason ?? "Refund cancelled");
            scope.Complete();
            return result;
        }

        var registeredProvider = await providerManager.GetProviderAsync(
            originalPayment.PaymentProviderAlias,
            requireEnabled: false, // Allow refunds even if provider is disabled
            cancellationToken);

        if (registeredProvider == null)
        {
            ClearRefundIdempotencyMarker(idempotencyKey);
            result.AddErrorMessage($"Payment provider '{originalPayment.PaymentProviderAlias}' not found.");
            scope.Complete();
            return result;
        }

        if (!registeredProvider.Metadata.SupportsRefunds)
        {
            ClearRefundIdempotencyMarker(idempotencyKey);
            result.AddErrorMessage($"Provider '{originalPayment.PaymentProviderAlias}' does not support refunds.");
            scope.Complete();
            return result;
        }

        if (refundAmount < refundableAmount && !registeredProvider.Metadata.SupportsPartialRefunds)
        {
            ClearRefundIdempotencyMarker(idempotencyKey);
            result.AddErrorMessage($"Provider '{originalPayment.PaymentProviderAlias}' does not support partial refunds.");
            scope.Complete();
            return result;
        }

        // Process refund with provider
        var refundRequest = new RefundRequest
        {
            PaymentId = paymentId,
            TransactionId = originalPayment.TransactionId!,
            Amount = refundAmount,
            Reason = reason,
            IdempotencyKey = idempotencyKey
        };

        RefundResult refundResult;
        try
        {
            refundResult = await registeredProvider.Provider.RefundPaymentAsync(refundRequest, cancellationToken);

            // Cache the result for idempotency
            if (!string.IsNullOrEmpty(idempotencyKey))
            {
                idempotencyService.CacheRefundResult(idempotencyKey, refundResult);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to process refund for payment {PaymentId}", paymentId);
            ClearRefundIdempotencyMarker(idempotencyKey);
            result.AddErrorMessage($"Refund processing failed: {ex.Message}");
            scope.Complete();
            return result;
        }

        if (!refundResult.Success)
        {
            result.AddErrorMessage($"Provider refund failed: {refundResult.ErrorMessage}");
            scope.Complete();
            return result;
        }

        // Record the refund payment
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var isPartialRefund = refundAmount < originalPayment.Amount;
            var invoice = await db.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == originalPayment.InvoiceId, cancellationToken);

            var invoiceCurrency = invoice?.CurrencyCode ?? originalPayment.CurrencyCode;
            var storeCurrency = invoice?.StoreCurrencyCode ?? _settings.StoreCurrencyCode;

            var refundPayment = paymentFactory.CreateRefund(
                originalPayment: originalPayment,
                refundAmount: refundAmount,
                reason: reason,
                transactionId: refundResult.RefundTransactionId!,
                currencyCode: invoiceCurrency,
                storeCurrencyCode: storeCurrency,
                pricingExchangeRate: invoice?.PricingExchangeRate,
                isPartialRefund: isPartialRefund);

            db.Payments.Add(refundPayment);
            await db.SaveChangesAsync(cancellationToken);

            result.ResultObject = refundPayment;
            logger.LogInformation(
                "Refund recorded: {RefundId} for payment {PaymentId}, amount {Amount}, reason: {Reason}",
                refundPayment.Id, paymentId, refundAmount, reason);

            return true;
        });
        scope.Complete();

        // Publish "After" notification
        if (result.ResultObject != null)
        {
            await notificationPublisher.PublishAsync(
                new PaymentRefundedNotification(originalPayment, result.ResultObject),
                cancellationToken);
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Dtos.RefundPreviewDto>> PreviewRefundAsync(
        PreviewRefundParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Dtos.RefundPreviewDto>();

        // Load the original payment
        using var scope = efCoreScopeProvider.CreateScope();
        var originalPayment = await scope.ExecuteWithContextAsync(async db =>
            await db.Payments
                .AsNoTracking()
                .Include(p => p.Refunds)
                .FirstOrDefaultAsync(p => p.Id == parameters.PaymentId, cancellationToken));

        if (originalPayment == null)
        {
            result.AddErrorMessage($"Payment '{parameters.PaymentId}' not found.");
            scope.Complete();
            return result;
        }

        if (originalPayment.PaymentType != PaymentType.Payment)
        {
            result.AddErrorMessage("Cannot refund a refund payment.");
            scope.Complete();
            return result;
        }

        // Calculate refundable amount
        var existingRefunds = originalPayment.Refunds?.Sum(r => Math.Abs(r.Amount)) ?? 0;
        var refundableAmount = originalPayment.Amount - existingRefunds;

        // Calculate requested amount based on percentage or direct amount
        decimal requestedAmount;
        if (parameters.Percentage.HasValue)
        {
            // Percentage takes precedence
            var percentage = Math.Clamp(parameters.Percentage.Value, 0, 100);
            requestedAmount = refundableAmount * (percentage / 100m);
        }
        else if (parameters.Amount.HasValue)
        {
            requestedAmount = parameters.Amount.Value;
        }
        else
        {
            // Default to full refund
            requestedAmount = refundableAmount;
        }

        // Round using currency service
        requestedAmount = _currencyService.Round(requestedAmount, originalPayment.CurrencyCode);
        refundableAmount = _currencyService.Round(refundableAmount, originalPayment.CurrencyCode);

        // Validate requested amount doesn't exceed refundable
        if (requestedAmount > refundableAmount)
        {
            requestedAmount = refundableAmount;
        }

        // Check provider capabilities
        var supportsRefund = false;
        var supportsPartialRefund = false;

        if (!string.IsNullOrEmpty(originalPayment.PaymentProviderAlias))
        {
            var registeredProvider = await providerManager.GetProviderAsync(
                originalPayment.PaymentProviderAlias,
                requireEnabled: false,
                cancellationToken);

            if (registeredProvider != null)
            {
                supportsRefund = registeredProvider.Metadata.SupportsRefunds;
                supportsPartialRefund = registeredProvider.Metadata.SupportsPartialRefunds;
            }
        }

        scope.Complete();

        result.ResultObject = new Dtos.RefundPreviewDto
        {
            PaymentId = originalPayment.Id,
            RefundableAmount = refundableAmount,
            RequestedAmount = requestedAmount,
            CurrencyCode = originalPayment.CurrencyCode,
            SupportsRefund = supportsRefund,
            SupportsPartialRefund = supportsPartialRefund,
            ProviderAlias = originalPayment.PaymentProviderAlias,
            FormattedRefundableAmount = _currencyService.FormatAmount(refundableAmount, originalPayment.CurrencyCode),
            FormattedRequestedAmount = _currencyService.FormatAmount(requestedAmount, originalPayment.CurrencyCode)
        };

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
                return (InvoiceTotal: 0m, CurrencyCode: _settings.StoreCurrencyCode, Payments: (List<Payment>)[]);
            }

            var payments = await db.Payments
                .AsNoTracking()
                .Where(p => p.InvoiceId == invoiceId && p.PaymentSuccess)
                .ToListAsync(cancellationToken);

            return (InvoiceTotal: invoice.Total, CurrencyCode: invoice.CurrencyCode, Payments: payments);
        });
        scope.Complete();

        var details = CalculatePaymentStatus(new CalculatePaymentStatusParameters
        {
            Payments = statusInfo.Payments,
            InvoiceTotal = statusInfo.InvoiceTotal,
            CurrencyCode = statusInfo.CurrencyCode
        });
        return details.Status;
    }

    /// <inheritdoc />
    public PaymentStatusDetails CalculatePaymentStatus(CalculatePaymentStatusParameters parameters)
    {
        var paymentList = parameters.Payments.ToList();
        var invoiceTotal = parameters.InvoiceTotal;
        var currencyCode = parameters.CurrencyCode;
        var invoiceTotalInStoreCurrency = parameters.InvoiceTotalInStoreCurrency;
        var storeCurrencyCode = parameters.StoreCurrencyCode;

        // Calculate totals in invoice currency - only count successful payments
        var totalPaid = paymentList
            .Where(p => p.PaymentSuccess && p.PaymentType == PaymentType.Payment)
            .Sum(p => p.Amount);

        var totalRefunded = paymentList
            .Where(p => p.PaymentSuccess &&
                  (p.PaymentType == PaymentType.Refund || p.PaymentType == PaymentType.PartialRefund))
            .Sum(p => Math.Abs((decimal)p.Amount));

        // Round to avoid floating-point precision issues using currency-aware rounding
        totalPaid = _currencyService.Round(totalPaid, currencyCode);
        totalRefunded = _currencyService.Round(totalRefunded, currencyCode);
        invoiceTotal = _currencyService.Round(invoiceTotal, currencyCode);

        var netPayment = totalPaid - totalRefunded;
        var balanceDue = Math.Max(0m, invoiceTotal - netPayment);

        // Calculate store currency totals if store currency is provided
        decimal? storeTotalPaid = null;
        decimal? storeTotalRefunded = null;
        decimal? storeNetPayment = null;
        decimal? storeBalanceDue = null;

        if (!string.IsNullOrEmpty(storeCurrencyCode))
        {
            storeTotalPaid = paymentList
                .Where(p => p.PaymentSuccess && p.PaymentType == PaymentType.Payment)
                .Sum(p => p.AmountInStoreCurrency ?? p.Amount);

            storeTotalRefunded = paymentList
                .Where(p => p.PaymentSuccess &&
                      (p.PaymentType == PaymentType.Refund || p.PaymentType == PaymentType.PartialRefund))
                .Sum(p => Math.Abs((decimal)(p.AmountInStoreCurrency ?? p.Amount)));

            storeTotalPaid = _currencyService.Round(storeTotalPaid.Value, storeCurrencyCode);
            storeTotalRefunded = _currencyService.Round(storeTotalRefunded.Value, storeCurrencyCode);

            storeNetPayment = storeTotalPaid - storeTotalRefunded;
            var storeInvoiceTotal = invoiceTotalInStoreCurrency ?? invoiceTotal;
            storeInvoiceTotal = _currencyService.Round(storeInvoiceTotal, storeCurrencyCode);
            storeBalanceDue = Math.Max(0, storeInvoiceTotal - storeNetPayment.Value);
        }

        // Determine status (based on invoice currency, not store currency)
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

        // Find max risk score
        var maxRiskPayment = paymentList
            .Where(p => p.RiskScore.HasValue)
            .OrderByDescending(p => p.RiskScore)
            .FirstOrDefault();

        return new PaymentStatusDetails
        {
            Status = status,
            StatusDisplay = PaymentStatusDetails.GetStatusDisplay(status),
            TotalPaid = totalPaid,
            TotalRefunded = totalRefunded,
            NetPayment = netPayment,
            BalanceDue = balanceDue,
            TotalPaidInStoreCurrency = storeTotalPaid,
            TotalRefundedInStoreCurrency = storeTotalRefunded,
            NetPaymentInStoreCurrency = storeNetPayment,
            BalanceDueInStoreCurrency = storeBalanceDue,
            MaxRiskScore = maxRiskPayment?.RiskScore,
            MaxRiskScoreSource = maxRiskPayment?.RiskScoreSource,
            RiskLevel = PaymentStatusDetails.GetRiskLevel(maxRiskPayment?.RiskScore)
        };
    }

    /// <inheritdoc />
    public async Task<CrudResult<Payment>> RecordManualPaymentAsync(
        RecordManualPaymentParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Payment>();
        Payment? createdPayment = null;

        if (parameters.Amount <= 0)
        {
            result.AddErrorMessage("Payment amount must be greater than zero.");
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var invoice = await db.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == parameters.InvoiceId, cancellationToken);
            if (invoice == null)
            {
                result.AddErrorMessage("Invoice not found.");
                return false;
            }

            var payment = paymentFactory.CreateManualPayment(
                invoiceId: parameters.InvoiceId,
                amount: parameters.Amount,
                currencyCode: invoice.CurrencyCode,
                storeCurrencyCode: invoice.StoreCurrencyCode,
                pricingExchangeRate: invoice.PricingExchangeRate,
                paymentMethod: parameters.PaymentMethod,
                description: parameters.Description);

            // Publish "Before" notification - handlers can cancel or modify
            var creatingNotification = new PaymentCreatingNotification(payment);
            if (await notificationPublisher.PublishCancelableAsync(creatingNotification, cancellationToken))
            {
                result.AddErrorMessage(creatingNotification.CancelReason ?? "Payment creation cancelled");
                return false;
            }

            db.Payments.Add(payment);
            await db.SaveChangesAsync(cancellationToken);

            result.ResultObject = payment;
            createdPayment = payment;
            logger.LogInformation(
                "Manual payment recorded: {PaymentId} for invoice {InvoiceId}, amount {Amount}, method: {Method}",
                payment.Id, parameters.InvoiceId, parameters.Amount, parameters.PaymentMethod);

            return true;
        });
        scope.Complete();

        // Publish notification AFTER scope completion to avoid nested scope issues
        if (createdPayment != null)
        {
            await notificationPublisher.PublishAsync(new PaymentCreatedNotification(createdPayment), cancellationToken);
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Payment>> RecordManualRefundAsync(
        RecordManualRefundParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var paymentId = parameters.PaymentId;
        var amount = parameters.Amount;
        var reason = parameters.Reason;

        var result = new CrudResult<Payment>();

        if (amount <= 0)
        {
            result.AddErrorMessage("Refund amount must be greater than zero.");
            return result;
        }

        // Validate refund reason (required business rule)
        if (string.IsNullOrWhiteSpace(reason))
        {
            result.AddErrorMessage("Refund reason is required.");
            return result;
        }

        Payment? originalPayment = null;
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Load original payment
            originalPayment = await db.Payments
                .Include(p => p.Refunds)
                .FirstOrDefaultAsync(p => p.Id == paymentId, cancellationToken);

            if (originalPayment == null)
            {
                result.AddErrorMessage($"Payment '{paymentId}' not found.");
                return false;
            }

            if (originalPayment.PaymentType != PaymentType.Payment)
            {
                result.AddErrorMessage("Cannot refund a refund payment.");
                return false;
            }

            // Calculate refundable amount
            var existingRefunds = originalPayment.Refunds?.Sum(r => Math.Abs(r.Amount)) ?? 0;
            var refundableAmount = originalPayment.Amount - existingRefunds;

            if (amount > refundableAmount)
            {
                result.AddErrorMessage($"Refund amount ({amount:C}) exceeds refundable amount ({refundableAmount:C}).");
                return false;
            }

            var isPartialRefund = amount < originalPayment.Amount;
            var invoice = await db.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == originalPayment.InvoiceId, cancellationToken);

            var invoiceCurrency = invoice?.CurrencyCode ?? originalPayment.CurrencyCode;
            var storeCurrency = invoice?.StoreCurrencyCode ?? _settings.StoreCurrencyCode;

            var refundPayment = paymentFactory.CreateManualRefund(
                originalPayment: originalPayment,
                refundAmount: amount,
                reason: reason,
                currencyCode: invoiceCurrency,
                storeCurrencyCode: storeCurrency,
                pricingExchangeRate: invoice?.PricingExchangeRate,
                isPartialRefund: isPartialRefund);

            db.Payments.Add(refundPayment);
            await db.SaveChangesAsync(cancellationToken);

            result.ResultObject = refundPayment;
            logger.LogInformation(
                "Manual refund recorded: {RefundId} for payment {PaymentId}, amount {Amount}, reason: {Reason}",
                refundPayment.Id, paymentId, amount, reason);

            return true;
        });
        scope.Complete();

        // Publish "After" notification
        if (result.ResultObject != null && originalPayment != null)
        {
            await notificationPublisher.PublishAsync(
                new PaymentRefundedNotification(originalPayment, result.ResultObject),
                cancellationToken);
        }

        return result;
    }

    /// <summary>
    /// Helper method to clear refund idempotency processing marker on early return.
    /// </summary>
    private void ClearRefundIdempotencyMarker(string? idempotencyKey)
    {
        if (!string.IsNullOrEmpty(idempotencyKey))
        {
            idempotencyService.ClearProcessingMarker(idempotencyKey);
        }
    }

    /// <summary>
    /// Gets the display name for a payment method from the provider.
    /// </summary>
    /// <param name="provider">The payment provider.</param>
    /// <param name="methodAlias">The method alias (e.g., "purchaseorder", "cards").</param>
    /// <returns>The method display name, or the provider display name if method not found.</returns>
    private static string? GetMethodDisplayName(IPaymentProvider provider, string? methodAlias)
    {
        if (string.IsNullOrEmpty(methodAlias))
            return provider.Metadata.DisplayName;

        var method = provider.GetAvailablePaymentMethods()
            .FirstOrDefault(m => m.Alias == methodAlias);

        return method?.DisplayName ?? provider.Metadata.DisplayName;
    }

    /// <inheritdoc />
    public async Task<CrudResult<List<Payment>>> BatchMarkAsPaidAsync(
        BatchMarkAsPaidParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<List<Payment>>();
        var createdPayments = new List<Payment>();

        if (parameters.InvoiceIds.Count == 0)
        {
            result.AddErrorMessage("No invoice IDs provided.");
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Load all invoices with their payments
            var invoices = await db.Invoices
                .Include(i => i.Payments)
                .Where(i => parameters.InvoiceIds.Contains(i.Id) && !i.IsDeleted && !i.IsCancelled)
                .ToListAsync(cancellationToken);

            // Track which invoices weren't found
            var foundIds = invoices.Select(i => i.Id).ToHashSet();
            var missingIds = parameters.InvoiceIds.Where(id => !foundIds.Contains(id)).ToList();

            foreach (var missingId in missingIds)
            {
                result.AddWarningMessage($"Invoice {missingId} not found, deleted, or cancelled.");
            }

            var paymentDate = parameters.DateReceived ?? DateTime.UtcNow;

            foreach (var invoice in invoices)
            {
                // Calculate outstanding balance
                var status = CalculatePaymentStatus(new CalculatePaymentStatusParameters
                {
                    Payments = invoice.Payments ?? [],
                    InvoiceTotal = invoice.Total,
                    CurrencyCode = invoice.CurrencyCode
                });

                if (status.BalanceDue <= 0)
                {
                    result.AddWarningMessage($"Invoice {invoice.InvoiceNumber} has no outstanding balance.");
                    continue;
                }

                // Create payment for outstanding balance
                var description = !string.IsNullOrEmpty(parameters.Reference)
                    ? $"{parameters.PaymentMethod} - Ref: {parameters.Reference}"
                    : parameters.PaymentMethod;

                var payment = paymentFactory.CreateManualPayment(
                    invoiceId: invoice.Id,
                    amount: status.BalanceDue,
                    currencyCode: invoice.CurrencyCode,
                    storeCurrencyCode: invoice.StoreCurrencyCode,
                    pricingExchangeRate: invoice.PricingExchangeRate,
                    paymentMethod: parameters.PaymentMethod,
                    description: description);

                // Override the date created if custom date provided
                if (parameters.DateReceived.HasValue)
                {
                    payment.DateCreated = paymentDate;
                }

                // Publish "Before" notification - handlers can cancel or modify
                var creatingNotification = new PaymentCreatingNotification(payment);
                if (await notificationPublisher.PublishCancelableAsync(creatingNotification, cancellationToken))
                {
                    result.AddWarningMessage($"Payment for invoice {invoice.InvoiceNumber} cancelled: {creatingNotification.CancelReason}");
                    continue;
                }

                db.Payments.Add(payment);
                createdPayments.Add(payment);

                logger.LogInformation(
                    "Batch payment created: {PaymentId} for invoice {InvoiceId} ({InvoiceNumber}), amount {Amount}",
                    payment.Id, invoice.Id, invoice.InvoiceNumber, status.BalanceDue);
            }

            if (createdPayments.Count > 0)
            {
                await db.SaveChangesAsync(cancellationToken);
            }

            return true;
        });
        scope.Complete();

        // Publish notifications AFTER scope completion to avoid nested scope issues
        foreach (var payment in createdPayments)
        {
            await notificationPublisher.PublishAsync(new PaymentCreatedNotification(payment), cancellationToken);
        }

        result.ResultObject = createdPayments;

        if (createdPayments.Count > 0)
        {
            result.AddSuccessMessage($"Successfully marked {createdPayments.Count} invoice(s) as paid.");
        }
        else if (result.Messages.All(m => m.ResultMessageType == ResultMessageType.Warning))
        {
            // If we only have warnings and no payments created, it's an error overall
            result.AddErrorMessage("No invoices were marked as paid.");
        }

        return result;
    }
}
