using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Payment;

/// <summary>
/// Published after a payment has been refunded (full or partial).
/// </summary>
public class PaymentRefundedNotification(
    Accounting.Models.Payment originalPayment,
    Accounting.Models.Payment refundPayment) : MerchelloNotification
{
    /// <summary>
    /// Gets the original payment that was refunded.
    /// </summary>
    public Accounting.Models.Payment OriginalPayment { get; } = originalPayment;

    /// <summary>
    /// Gets the refund payment record.
    /// </summary>
    public Accounting.Models.Payment RefundPayment { get; } = refundPayment;

    /// <summary>
    /// Gets the refund amount (positive value).
    /// </summary>
    public decimal RefundAmount => Math.Abs(RefundPayment.Amount);

    /// <summary>
    /// Gets the refund reason.
    /// </summary>
    public string? RefundReason => RefundPayment.RefundReason;
}
