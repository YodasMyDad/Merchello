namespace Merchello.Core.Notifications.CheckoutNotifications;

/// <summary>
/// Notification for the first recovery email in the abandoned cart sequence.
/// Published shortly after checkout is detected as abandoned.
/// Topic: checkout.abandoned.first
/// </summary>
public class CheckoutAbandonedFirstNotification : CheckoutAbandonedNotificationBase
{
    public CheckoutAbandonedFirstNotification()
    {
        EmailSequenceNumber = 1;
    }
}
