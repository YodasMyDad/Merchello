using Merchello.Core.Notifications.Base;
using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Notifications.UpsellNotifications;

/// <summary>
/// Notification published before an UpsellRule is saved (updated).
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class UpsellRuleSavingNotification(UpsellRule upsellRule)
    : MerchelloCancelableNotification<UpsellRule>(upsellRule)
{
    public UpsellRule UpsellRule => Entity;
}
