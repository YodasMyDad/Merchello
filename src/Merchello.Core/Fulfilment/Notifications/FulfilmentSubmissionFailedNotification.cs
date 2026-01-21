using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Fulfilment.Notifications;

/// <summary>
/// Published after fulfilment submission has failed and max retries have been exceeded.
/// </summary>
public class FulfilmentSubmissionFailedNotification(
    Order order,
    FulfilmentProviderConfiguration providerConfiguration,
    string errorMessage) : MerchelloNotification
{
    /// <summary>
    /// Gets the order that failed submission.
    /// </summary>
    public Order Order { get; } = order;

    /// <summary>
    /// Gets the fulfilment provider configuration.
    /// </summary>
    public FulfilmentProviderConfiguration ProviderConfiguration { get; } = providerConfiguration;

    /// <summary>
    /// Gets the error message from the last submission attempt.
    /// </summary>
    public string ErrorMessage { get; } = errorMessage;

    /// <summary>
    /// Gets the number of retry attempts made.
    /// </summary>
    public int RetryCount => Order.FulfilmentRetryCount;
}
