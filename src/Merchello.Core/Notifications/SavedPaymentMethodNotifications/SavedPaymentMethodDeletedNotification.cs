using Merchello.Core.Notifications.Base;
using Merchello.Core.Payments.Models;

namespace Merchello.Core.Notifications.SavedPaymentMethodNotifications;

/// <summary>
/// Published after a saved payment method has been deleted successfully.
/// </summary>
public class SavedPaymentMethodDeletedNotification(SavedPaymentMethod method) : MerchelloNotification
{
    /// <summary>
    /// Gets the saved payment method that was deleted.
    /// </summary>
    public SavedPaymentMethod SavedPaymentMethod { get; } = method;
}
