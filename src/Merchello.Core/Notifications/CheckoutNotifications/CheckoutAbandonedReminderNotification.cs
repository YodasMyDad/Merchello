namespace Merchello.Core.Notifications.CheckoutNotifications;

/// <summary>
/// Notification for the reminder (second) recovery email in the abandoned cart sequence.
/// Published 24 hours after the first email (configurable).
/// Topic: checkout.abandoned.reminder
/// </summary>
public class CheckoutAbandonedReminderNotification : CheckoutAbandonedNotificationBase
{
    public CheckoutAbandonedReminderNotification()
    {
        EmailSequenceNumber = 2;
    }
}
