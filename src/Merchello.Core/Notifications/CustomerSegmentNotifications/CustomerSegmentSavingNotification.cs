using Merchello.Core.Customers.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CustomerSegmentNotifications;

/// <summary>
/// Notification published before a CustomerSegment is saved/updated.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class CustomerSegmentSavingNotification(Customers.Models.CustomerSegment segment)
    : MerchelloCancelableNotification<Customers.Models.CustomerSegment>(segment)
{
    /// <summary>
    /// The customer segment being saved.
    /// </summary>
    public Customers.Models.CustomerSegment Segment => Entity;
}
