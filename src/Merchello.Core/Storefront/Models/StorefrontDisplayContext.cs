namespace Merchello.Core.Storefront.Models;

/// <summary>
/// Complete display context for storefront pricing.
/// Combines currency conversion and tax-inclusive display settings.
/// </summary>
/// <param name="CurrencyCode">Customer's selected currency code (e.g., "USD")</param>
/// <param name="CurrencySymbol">Currency symbol for display (e.g., "$")</param>
/// <param name="DecimalPlaces">Number of decimal places for this currency</param>
/// <param name="ExchangeRate">Exchange rate from store currency to customer currency</param>
/// <param name="StoreCurrencyCode">Store's base currency code (e.g., "GBP")</param>
/// <param name="DisplayPricesIncTax">Whether to display prices including tax</param>
/// <param name="TaxCountryCode">Customer's country code for tax rate lookup</param>
/// <param name="TaxRegionCode">Customer's region code for tax rate lookup (optional)</param>
/// <param name="IsShippingTaxable">Whether shipping is taxable</param>
/// <param name="ShippingTaxRate">Shipping tax rate percentage from provider, or null if rate requires full calculation</param>
/// <param name="ShippingTaxMode">Shipping tax mode resolved by the active tax provider</param>
public record StorefrontDisplayContext(
    string CurrencyCode,
    string CurrencySymbol,
    int DecimalPlaces,
    decimal ExchangeRate,
    string StoreCurrencyCode,
    bool DisplayPricesIncTax,
    string TaxCountryCode,
    string? TaxRegionCode,
    bool IsShippingTaxable = true,
    decimal? ShippingTaxRate = null,
    Tax.Providers.Models.ShippingTaxMode ShippingTaxMode = Tax.Providers.Models.ShippingTaxMode.ProviderCalculated);
