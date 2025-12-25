using Merchello.Core.Customers.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CustomerSegmentNotifications;

/// <summary>
/// Notification published after a CustomerSegment has been created.
/// </summary>
public class CustomerSegmentCreatedNotification(Customers.Models.CustomerSegment segment) : MerchelloNotification
{
    /// <summary>
    /// The customer segment that was created.
    /// </summary>
    public Customers.Models.CustomerSegment Segment { get; } = segment;
}
