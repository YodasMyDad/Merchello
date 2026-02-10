using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Fulfilment.Notifications;

/// <summary>
/// Published after a non-terminal fulfilment submission failure.
/// This captures per-attempt retry failures before max retries are exceeded.
/// </summary>
public class FulfilmentSubmissionAttemptFailedNotification(
    Order order,
    FulfilmentProviderConfiguration providerConfiguration,
    string errorMessage,
    int attemptNumber,
    int maxAttempts) : MerchelloNotification
{
    /// <summary>
    /// Gets the order that failed this submission attempt.
    /// </summary>
    public Order Order { get; } = order;

    /// <summary>
    /// Gets the fulfilment provider configuration.
    /// </summary>
    public FulfilmentProviderConfiguration ProviderConfiguration { get; } = providerConfiguration;

    /// <summary>
    /// Gets the error message from this attempt.
    /// </summary>
    public string ErrorMessage { get; } = errorMessage;

    /// <summary>
    /// Gets the current attempt number.
    /// </summary>
    public int AttemptNumber { get; } = attemptNumber;

    /// <summary>
    /// Gets the maximum allowed attempts.
    /// </summary>
    public int MaxAttempts { get; } = maxAttempts;
}
