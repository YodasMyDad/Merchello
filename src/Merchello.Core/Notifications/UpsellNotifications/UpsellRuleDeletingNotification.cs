using Merchello.Core.Notifications.Base;
using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Notifications.UpsellNotifications;

/// <summary>
/// Notification published before an UpsellRule is deleted.
/// Handlers can cancel the operation.
/// </summary>
public class UpsellRuleDeletingNotification(UpsellRule upsellRule)
    : MerchelloCancelableNotification<UpsellRule>(upsellRule)
{
    public UpsellRule UpsellRule => Entity;
}
