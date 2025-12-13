using Merchello.Core.Notifications.Base;

namespace Merchello.Core.ExchangeRates.Notifications;

public class ExchangeRatesRefreshedNotification(
    string providerAlias,
    string baseCurrency,
    DateTime timestampUtc,
    int rateCount) : MerchelloNotification
{
    public string ProviderAlias { get; } = providerAlias;
    public string BaseCurrency { get; } = baseCurrency;
    public DateTime TimestampUtc { get; } = timestampUtc;
    public int RateCount { get; } = rateCount;
}

