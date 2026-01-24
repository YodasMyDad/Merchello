using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CheckoutNotifications;

/// <summary>
/// Notification published when stock validation fails at the payment stage of checkout.
/// Useful for monitoring/alerting on out-of-stock events that block purchases.
/// </summary>
public class StockValidationFailedAtCheckoutNotification(
    Guid basketId,
    List<string> unavailableItems) : MerchelloNotification
{
    /// <summary>
    /// Gets the basket ID that failed stock validation.
    /// </summary>
    public Guid BasketId { get; } = basketId;

    /// <summary>
    /// Gets the list of unavailable item descriptions.
    /// </summary>
    public List<string> UnavailableItems { get; } = unavailableItems;
}
