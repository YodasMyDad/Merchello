namespace Merchello.Core.Shared.Providers;

/// <summary>
/// Discriminator values for provider configuration types.
/// </summary>
public static class ProviderConfigurationTypes
{
    public const string Shipping = "shipping";
    public const string Payment = "payment";
    public const string Fulfilment = "fulfilment";
    public const string Tax = "tax";
    public const string ExchangeRate = "exchange-rate";
}
