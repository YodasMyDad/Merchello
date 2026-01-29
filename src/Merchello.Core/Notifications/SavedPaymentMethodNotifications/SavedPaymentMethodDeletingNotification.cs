using Merchello.Core.Notifications.Base;
using Merchello.Core.Payments.Models;

namespace Merchello.Core.Notifications.SavedPaymentMethodNotifications;

/// <summary>
/// Published before a saved payment method is deleted.
/// Handlers can cancel the operation.
/// </summary>
public class SavedPaymentMethodDeletingNotification(SavedPaymentMethod method)
    : MerchelloCancelableNotification<SavedPaymentMethod>(method);
