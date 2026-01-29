using Merchello.Core.Accounting.Models;
using Merchello.Core.Payments.Models;

namespace Merchello.Core.Accounting.Extensions;

/// <summary>
/// Extension methods for Payment calculations.
/// </summary>
public static class PaymentExtensions
{
    /// <summary>
    /// Gets the refundable amount for a payment.
    /// Only payments (not refunds) have a refundable amount, calculated as the original
    /// amount minus the sum of all existing refund amounts.
    /// </summary>
    public static decimal GetRefundableAmount(this Payment payment)
    {
        if (payment.PaymentType != PaymentType.Payment)
            return 0;

        var existingRefunds = payment.Refunds?.Sum(r => Math.Abs(r.Amount)) ?? 0;
        return payment.Amount - existingRefunds;
    }
}
