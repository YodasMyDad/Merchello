using Merchello.Core.Notifications.Base;
using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Notifications.UpsellNotifications;

/// <summary>
/// Notification published before an UpsellRule's status changes.
/// Handlers can cancel the status change.
/// </summary>
public class UpsellRuleStatusChangingNotification : MerchelloCancelableNotification<UpsellRule>
{
    public UpsellRuleStatusChangingNotification(
        UpsellRule upsellRule,
        UpsellStatus oldStatus,
        UpsellStatus newStatus) : base(upsellRule)
    {
        OldStatus = oldStatus;
        NewStatus = newStatus;
    }

    public UpsellRule UpsellRule => Entity;
    public UpsellStatus OldStatus { get; }
    public UpsellStatus NewStatus { get; }
}
