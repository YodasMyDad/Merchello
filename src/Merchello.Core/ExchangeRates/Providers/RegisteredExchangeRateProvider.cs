using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.ExchangeRates.Providers.Interfaces;

namespace Merchello.Core.ExchangeRates.Providers;

public sealed class RegisteredExchangeRateProvider
{
    public RegisteredExchangeRateProvider(IExchangeRateProvider provider, ExchangeRateProviderSetting? setting)
    {
        Provider = provider ?? throw new ArgumentNullException(nameof(provider));
        Setting = setting;
    }

    public IExchangeRateProvider Provider { get; }
    public ExchangeRateProviderSetting? Setting { get; }

    public ExchangeRateProviderMetadata Metadata => Provider.Metadata;
    public bool IsActive => Setting?.IsActive ?? false;
}

