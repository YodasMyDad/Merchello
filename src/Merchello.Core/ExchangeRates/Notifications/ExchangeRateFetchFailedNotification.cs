using Merchello.Core.Notifications.Base;

namespace Merchello.Core.ExchangeRates.Notifications;

public class ExchangeRateFetchFailedNotification(
    string providerAlias,
    string baseCurrency,
    string? errorMessage,
    int consecutiveFailureCount) : MerchelloNotification
{
    public string ProviderAlias { get; } = providerAlias;
    public string BaseCurrency { get; } = baseCurrency;
    public string? ErrorMessage { get; } = errorMessage;
    public int ConsecutiveFailureCount { get; } = consecutiveFailureCount;
}

