using Merchello.Core.Customers.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CustomerSegmentNotifications;

/// <summary>
/// Notification published before a CustomerSegment is deleted.
/// Handlers can cancel the operation.
/// </summary>
public class CustomerSegmentDeletingNotification(Customers.Models.CustomerSegment segment)
    : MerchelloCancelableNotification<Customers.Models.CustomerSegment>(segment)
{
    /// <summary>
    /// The customer segment being deleted.
    /// </summary>
    public Customers.Models.CustomerSegment Segment => Entity;
}
