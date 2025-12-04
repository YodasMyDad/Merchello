using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Payment;

/// <summary>
/// Published after a payment has been created successfully.
/// </summary>
public class PaymentCreatedNotification(Accounting.Models.Payment payment) : MerchelloNotification
{
    /// <summary>
    /// Gets the payment that was created.
    /// </summary>
    public Accounting.Models.Payment Payment { get; } = payment;
}
