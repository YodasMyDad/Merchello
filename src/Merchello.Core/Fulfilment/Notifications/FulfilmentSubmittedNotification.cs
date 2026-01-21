using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Fulfilment.Notifications;

/// <summary>
/// Published after an order has been successfully submitted to a fulfilment provider.
/// </summary>
public class FulfilmentSubmittedNotification(
    Order order,
    FulfilmentProviderConfiguration providerConfiguration) : MerchelloNotification
{
    /// <summary>
    /// Gets the order that was submitted.
    /// </summary>
    public Order Order { get; } = order;

    /// <summary>
    /// Gets the fulfilment provider configuration.
    /// </summary>
    public FulfilmentProviderConfiguration ProviderConfiguration { get; } = providerConfiguration;

    /// <summary>
    /// Gets the provider reference assigned by the 3PL.
    /// </summary>
    public string? ProviderReference => Order.FulfilmentProviderReference;
}
