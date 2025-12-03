using System.Globalization;

namespace Merchello.Core.Shared.Models;

public class MerchelloSettings
{
    public Guid? WebsiteId { get; set; }
    public Guid? RepositoryId { get; set; }
    public string? DatabaseProvider { get; set; }
    public string? ConnectionString { get; set; }

    /// <summary>
    /// Prefix for invoice numbers (e.g., "INV-")
    /// </summary>
    public string InvoiceNumberPrefix { get; set; } = "INV-";

    /// <summary>
    /// Default store currency code (ISO 4217), e.g., "GBP", "USD", "EUR".
    /// Used for displaying prices in the admin UI and as the default for transactions.
    /// </summary>
    public string StoreCurrencyCode { get; set; } = "USD";

    /// <summary>
    /// Gets the currency symbol derived from the StoreCurrencyCode.
    /// </summary>
    public string CurrencySymbol => GetCurrencySymbol(StoreCurrencyCode);

    private static string GetCurrencySymbol(string currencyCode)
    {
        try
        {
            var region = CultureInfo.GetCultures(CultureTypes.SpecificCultures)
                .Select(c => new RegionInfo(c.Name))
                .FirstOrDefault(r => r.ISOCurrencySymbol.Equals(currencyCode, StringComparison.OrdinalIgnoreCase));

            return region?.CurrencySymbol ?? currencyCode;
        }
        catch
        {
            return currencyCode;
        }
    }

    /// <summary>
    /// Default midpoint rounding strategy for monetary calculations.
    /// AwayFromZero is the most common for commerce (e.g., 2.5 rounds to 3).
    /// ToEven is "banker's rounding" (e.g., 2.5 rounds to 2, 3.5 rounds to 4).
    /// </summary>
    public MidpointRounding DefaultRounding { get; set; } = MidpointRounding.AwayFromZero;

    /// <summary>
    /// Tax rounding strategy. Round uses standard Math.Round, Ceiling always rounds up.
    /// Some US jurisdictions require ceiling for sales tax calculations.
    /// </summary>
    public TaxRoundingStrategy TaxRoundingStrategy { get; set; } = TaxRoundingStrategy.Round;
}
