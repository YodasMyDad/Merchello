using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Payment;

/// <summary>
/// Published before a payment is refunded (full or partial).
/// Handlers can cancel the refund operation.
/// </summary>
public class PaymentRefundingNotification(
    Accounting.Models.Payment originalPayment,
    decimal refundAmount,
    string? refundReason = null) : MerchelloSimpleCancelableNotification
{
    /// <summary>
    /// Gets the original payment being refunded.
    /// </summary>
    public Accounting.Models.Payment OriginalPayment { get; } = originalPayment;

    /// <summary>
    /// Gets the refund amount (positive value).
    /// </summary>
    public decimal RefundAmount { get; } = refundAmount;

    /// <summary>
    /// Gets the refund reason.
    /// </summary>
    public string? RefundReason { get; } = refundReason;
}
