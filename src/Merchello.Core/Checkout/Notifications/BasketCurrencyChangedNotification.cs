using Merchello.Core.Checkout.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Checkout.Notifications;

/// <summary>
/// Notification fired after basket currency has been converted.
/// </summary>
public class BasketCurrencyChangedNotification : MerchelloNotification
{
    public BasketCurrencyChangedNotification(
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
    /// Gets the basket after conversion.
    /// </summary>
    public Basket Basket { get; }

    /// <summary>
    /// Gets the previous currency code before conversion.
    /// </summary>
    public string OldCurrencyCode { get; }

    /// <summary>
    /// Gets the new currency code after conversion.
    /// </summary>
    public string NewCurrencyCode { get; }

    /// <summary>
    /// Gets the exchange rate that was applied (OldCurrency -> NewCurrency).
    /// </summary>
    public decimal ExchangeRate { get; }
}
