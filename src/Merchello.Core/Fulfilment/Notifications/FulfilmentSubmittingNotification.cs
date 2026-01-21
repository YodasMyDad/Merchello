using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Fulfilment.Notifications;

/// <summary>
/// Published before submitting an order to a fulfilment provider.
/// Handlers can cancel the submission by setting Cancel = true.
/// </summary>
public class FulfilmentSubmittingNotification(
    Order order,
    FulfilmentProviderConfiguration providerConfiguration) : MerchelloCancelableNotification<Order>(order)
{
    /// <summary>
    /// Gets the order being submitted.
    /// </summary>
    public Order Order => Entity;

    /// <summary>
    /// Gets the fulfilment provider configuration.
    /// </summary>
    public FulfilmentProviderConfiguration ProviderConfiguration { get; } = providerConfiguration;
}
