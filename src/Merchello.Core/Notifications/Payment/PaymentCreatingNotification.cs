using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Payment;

/// <summary>
/// Published before a payment is created. Handlers can modify the payment or cancel creation.
/// </summary>
/// <remarks>
/// Common use cases:
/// - Log payment attempts for audit trails
/// - Validate payment against custom business rules
/// - Apply additional fraud checks before recording
/// - Block suspicious payment patterns
/// </remarks>
public class PaymentCreatingNotification(Accounting.Models.Payment payment)
    : MerchelloCancelableNotification<Accounting.Models.Payment>(payment)
{
    /// <summary>
    /// Gets the payment being created.
    /// </summary>
    public Accounting.Models.Payment Payment => Entity;
}
