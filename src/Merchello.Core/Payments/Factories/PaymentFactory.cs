using Merchello.Core.Accounting.Models;
using Merchello.Core.Payments.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Services.Interfaces;

namespace Merchello.Core.Payments.Factories;

/// <summary>
/// Factory for creating Payment instances.
/// </summary>
public class PaymentFactory(ICurrencyService currencyService)
{
    /// <summary>
    /// Creates a payment record from a successful payment transaction.
    /// </summary>
    public Payment CreatePayment(
        Guid invoiceId,
        decimal amount,
        string currencyCode,
        string storeCurrencyCode,
        decimal? pricingExchangeRate,
        string providerAlias,
        string transactionId,
        string? description = null,
        string? fraudResponse = null,
        string? settlementCurrencyCode = null,
        decimal? settlementExchangeRate = null,
        decimal? settlementAmount = null,
        string? settlementExchangeRateSource = null,
        decimal? riskScore = null,
        string? riskScoreSource = null)
    {
        var amountInStoreCurrency = CalculateAmountInStoreCurrency(
            amount, currencyCode, storeCurrencyCode, pricingExchangeRate);

        return new Payment
        {
            Id = GuidExtensions.NewSequentialGuid,
            InvoiceId = invoiceId,
            Amount = amount,
            CurrencyCode = currencyCode,
            AmountInStoreCurrency = amountInStoreCurrency,
            SettlementCurrencyCode = settlementCurrencyCode,
            SettlementExchangeRate = settlementExchangeRate,
            SettlementAmount = settlementAmount,
            SettlementExchangeRateSource = settlementExchangeRateSource ?? providerAlias,
            PaymentProviderAlias = providerAlias,
            PaymentType = PaymentType.Payment,
            TransactionId = transactionId,
            Description = description,
            FraudResponse = fraudResponse,
            RiskScore = riskScore,
            RiskScoreSource = riskScoreSource,
            PaymentSuccess = true,
            DateCreated = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Creates a manual payment record.
    /// </summary>
    public Payment CreateManualPayment(
        Guid invoiceId,
        decimal amount,
        string currencyCode,
        string storeCurrencyCode,
        decimal? pricingExchangeRate,
        string paymentMethod,
        string? description = null)
    {
        var amountInStoreCurrency = CalculateAmountInStoreCurrency(
            amount, currencyCode, storeCurrencyCode, pricingExchangeRate);

        return new Payment
        {
            Id = GuidExtensions.NewSequentialGuid,
            InvoiceId = invoiceId,
            Amount = amount,
            CurrencyCode = currencyCode,
            AmountInStoreCurrency = amountInStoreCurrency,
            PaymentMethod = paymentMethod,
            PaymentProviderAlias = "manual",
            PaymentType = PaymentType.Payment,
            TransactionId = $"MANUAL-{Guid.NewGuid():N}".ToUpperInvariant(),
            Description = description ?? $"Manual payment: {paymentMethod}",
            PaymentSuccess = true,
            DateCreated = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Creates a refund payment record.
    /// </summary>
    public Payment CreateRefund(
        Payment originalPayment,
        decimal refundAmount,
        string reason,
        string transactionId,
        string currencyCode,
        string storeCurrencyCode,
        decimal? pricingExchangeRate,
        bool isPartialRefund)
    {
        var refundAmountInStoreCurrency = CalculateAmountInStoreCurrency(
            refundAmount, currencyCode, storeCurrencyCode, pricingExchangeRate);

        return new Payment
        {
            Id = GuidExtensions.NewSequentialGuid,
            InvoiceId = originalPayment.InvoiceId,
            Amount = -refundAmount, // Negative for refund
            CurrencyCode = currencyCode,
            AmountInStoreCurrency = refundAmountInStoreCurrency.HasValue ? -refundAmountInStoreCurrency : null,
            PaymentProviderAlias = originalPayment.PaymentProviderAlias,
            PaymentType = isPartialRefund ? PaymentType.PartialRefund : PaymentType.Refund,
            TransactionId = transactionId,
            RefundReason = reason,
            ParentPaymentId = originalPayment.Id,
            PaymentSuccess = true,
            Description = $"Refund for payment {originalPayment.TransactionId}",
            DateCreated = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Creates a manual refund payment record.
    /// </summary>
    public Payment CreateManualRefund(
        Payment originalPayment,
        decimal refundAmount,
        string reason,
        string currencyCode,
        string storeCurrencyCode,
        decimal? pricingExchangeRate,
        bool isPartialRefund)
    {
        var refundAmountInStoreCurrency = CalculateAmountInStoreCurrency(
            refundAmount, currencyCode, storeCurrencyCode, pricingExchangeRate);

        return new Payment
        {
            Id = GuidExtensions.NewSequentialGuid,
            InvoiceId = originalPayment.InvoiceId,
            Amount = -refundAmount, // Negative for refund
            CurrencyCode = currencyCode,
            AmountInStoreCurrency = refundAmountInStoreCurrency.HasValue ? -refundAmountInStoreCurrency : null,
            PaymentMethod = originalPayment.PaymentMethod,
            PaymentProviderAlias = originalPayment.PaymentProviderAlias,
            PaymentType = isPartialRefund ? PaymentType.PartialRefund : PaymentType.Refund,
            TransactionId = $"REFUND-{Guid.NewGuid():N}".ToUpperInvariant(),
            RefundReason = reason,
            ParentPaymentId = originalPayment.Id,
            PaymentSuccess = true,
            Description = $"Manual refund for payment {originalPayment.TransactionId}",
            DateCreated = DateTime.UtcNow
        };
    }

    private decimal? CalculateAmountInStoreCurrency(
        decimal amount,
        string currencyCode,
        string storeCurrencyCode,
        decimal? pricingExchangeRate)
    {
        if (string.Equals(currencyCode, storeCurrencyCode, StringComparison.OrdinalIgnoreCase))
        {
            return amount;
        }

        if (pricingExchangeRate.HasValue && pricingExchangeRate.Value > 0)
        {
            return currencyService.Round(amount * pricingExchangeRate.Value, storeCurrencyCode);
        }

        return null;
    }
}
