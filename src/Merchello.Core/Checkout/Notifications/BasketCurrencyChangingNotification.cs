using Merchello.Core.Checkout.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Checkout.Notifications;

/// <summary>
/// Notification fired before basket currency is converted.
/// Handlers can cancel the operation by calling <see cref="MerchelloSimpleCancelableNotification.CancelOperation"/>.
/// </summary>
public class BasketCurrencyChangingNotification : MerchelloSimpleCancelableNotification
{
    public BasketCurrencyChangingNotification(
        Basket basket,
        string oldCurrencyCode,
        string newCurrencyCode,
        decimal exchangeRate)
    {
        Basket = basket;
        OldCurrencyCode = oldCurrencyCode;
        NewCurrencyCode = newCurrencyCode;
        ExchangeRate = exchangeRate;
    }

    /// <summary>
    /// Gets the basket being converted.
    /// </summary>
    public Basket Basket { get; }

    /// <summary>
    /// Gets the current currency code before conversion.
    /// </summary>
    public string OldCurrencyCode { get; }

    /// <summary>
    /// Gets the target currency code.
    /// </summary>
    public string NewCurrencyCode { get; }

    /// <summary>
    /// Gets the exchange rate being applied (OldCurrency -> NewCurrency).
    /// </summary>
    public decimal ExchangeRate { get; }
}
