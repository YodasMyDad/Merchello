using Merchello.Core.Notifications.Base;
using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Notifications.UpsellNotifications;

/// <summary>
/// Notification published after an UpsellRule has been deleted.
/// </summary>
public class UpsellRuleDeletedNotification(UpsellRule upsellRule) : MerchelloNotification
{
    public UpsellRule UpsellRule { get; } = upsellRule;
}
