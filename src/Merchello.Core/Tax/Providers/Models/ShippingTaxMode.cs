namespace Merchello.Core.Tax.Providers.Models;

public enum ShippingTaxMode
{
    NotTaxed = 0,
    FixedRate = 1,
    Proportional = 2,
    ProviderCalculated = 3
}
