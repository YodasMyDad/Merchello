using Merchello.Core.Notifications.Base;
using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Notifications.UpsellNotifications;

/// <summary>
/// Notification published after an UpsellRule's status has changed.
/// </summary>
public class UpsellRuleStatusChangedNotification(
    UpsellRule upsellRule,
    UpsellStatus oldStatus,
    UpsellStatus newStatus) : MerchelloNotification
{
    public UpsellRule UpsellRule { get; } = upsellRule;
    public UpsellStatus OldStatus { get; } = oldStatus;
    public UpsellStatus NewStatus { get; } = newStatus;
}
