using Merchello.Core.Customers.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CustomerSegmentNotifications;

/// <summary>
/// Notification published before a CustomerSegment is created.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class CustomerSegmentCreatingNotification(Customers.Models.CustomerSegment segment)
    : MerchelloCancelableNotification<Customers.Models.CustomerSegment>(segment)
{
    /// <summary>
    /// The customer segment being created.
    /// </summary>
    public Customers.Models.CustomerSegment Segment => Entity;
}
