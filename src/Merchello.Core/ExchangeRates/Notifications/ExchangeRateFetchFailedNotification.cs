using Merchello.Core.Notifications.Base;

namespace Merchello.Core.ExchangeRates.Notifications;

/// <summary>
/// Published when an exchange rate refresh fails.
/// </summary>
/// <remarks>
/// Common use cases:
/// - Alert operations teams about provider outages
/// - Implement circuit-breaker patterns using consecutive failure count
/// - Log errors for monitoring dashboards
/// - Trigger fallback to cached rates after threshold failures
/// </remarks>
public class ExchangeRateFetchFailedNotification(
    string providerAlias,
    string baseCurrency,
    string? errorMessage,
    int consecutiveFailureCount) : MerchelloNotification
{
    /// <summary>
    /// The alias of the exchange rate provider that failed.
    /// </summary>
    public string ProviderAlias { get; } = providerAlias;

    /// <summary>
    /// The base currency that was being fetched.
    /// </summary>
    public string BaseCurrency { get; } = baseCurrency;

    /// <summary>
    /// The error message from the failed fetch attempt.
    /// </summary>
    public string? ErrorMessage { get; } = errorMessage;

    /// <summary>
    /// The number of consecutive failures. Use for circuit-breaker logic or escalating alerts.
    /// </summary>
    public int ConsecutiveFailureCount { get; } = consecutiveFailureCount;
}

