using Merchello.Core.Customers.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CustomerSegmentNotifications;

/// <summary>
/// Notification published after a CustomerSegment has been deleted.
/// </summary>
public class CustomerSegmentDeletedNotification(Customers.Models.CustomerSegment segment) : MerchelloNotification
{
    /// <summary>
    /// The customer segment that was deleted.
    /// </summary>
    public Customers.Models.CustomerSegment Segment { get; } = segment;
}
