namespace Merchello.Core.Notifications.CheckoutNotifications;

/// <summary>
/// Notification for the final (third) recovery email in the abandoned cart sequence.
/// Published 48 hours after the reminder email (configurable).
/// Topic: checkout.abandoned.final
/// </summary>
public class CheckoutAbandonedFinalNotification : CheckoutAbandonedNotificationBase
{
    public CheckoutAbandonedFinalNotification()
    {
        EmailSequenceNumber = 3;
    }
}
