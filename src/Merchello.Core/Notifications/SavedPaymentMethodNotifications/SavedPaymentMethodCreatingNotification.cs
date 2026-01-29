using Merchello.Core.Notifications.Base;
using Merchello.Core.Payments.Models;

namespace Merchello.Core.Notifications.SavedPaymentMethodNotifications;

/// <summary>
/// Published before a saved payment method is created.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class SavedPaymentMethodCreatingNotification(SavedPaymentMethod method)
    : MerchelloCancelableNotification<SavedPaymentMethod>(method);
