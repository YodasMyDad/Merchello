using Merchello.Core.Notifications.Base;
using Merchello.Core.Payments.Models;

namespace Merchello.Core.Notifications.SavedPaymentMethodNotifications;

/// <summary>
/// Published after a saved payment method has been created successfully.
/// </summary>
public class SavedPaymentMethodCreatedNotification(SavedPaymentMethod method) : MerchelloNotification
{
    /// <summary>
    /// Gets the saved payment method that was created.
    /// </summary>
    public SavedPaymentMethod SavedPaymentMethod { get; } = method;
}
