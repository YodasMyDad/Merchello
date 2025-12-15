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
    /// Fully qualified type name or key of custom order grouping strategy.
    /// Leave null/empty to use default warehouse-based grouping.
    /// Can be specified as:
    /// - Strategy key: "vendor-grouping"
    /// - Fully qualified type name: "MyCompany.Commerce.VendorGroupingStrategy, MyCompany.Commerce"
    /// </summary>
    public string? OrderGroupingStrategy { get; set; }

    /// <summary>
    /// List of ISO 3166-1 alpha-2 country codes that this store sells/ships to.
    /// When set, this restricts country selection throughout the system:
    /// - Warehouse service regions
    /// - Shipping costs and weight tiers
    /// - Checkout country selection
    /// 
    /// Leave null or empty to allow all countries (no restriction).
    /// Example: ["GB", "US", "DE", "FR", "ES", "IT"]
    /// </summary>
    public string[]? AllowedCountries { get; set; }

    /// <summary>
    /// Returns true if country restrictions are configured.
    /// </summary>
    public bool HasCountryRestrictions => AllowedCountries is { Length: > 0 };

    /// <summary>
    /// Available option type aliases for product options.
    /// These define what kind of attribute the option represents.
    /// Examples: "colour", "size", "material", "pattern"
    /// </summary>
    public string[] OptionTypeAliases { get; set; } = ["colour", "size", "material", "pattern"];

    /// <summary>
    /// Available option UI aliases that control how options are displayed to customers.
    /// - "dropdown": Standard select dropdown
    /// - "colour": Color swatches with hex values
    /// - "image": Image/media selection for each value
    /// - "checkbox": Multiple selection checkboxes
    /// - "radiobutton": Single selection radio buttons
    /// </summary>
    public string[] OptionUiAliases { get; set; } = ["dropdown", "colour", "image", "checkbox", "radiobutton"];

    /// <summary>
    /// Maximum number of options allowed per product (default: 5).
    /// Higher values can result in exponential variant generation.
    /// </summary>
    public int MaxProductOptions { get; set; } = 5;

    /// <summary>
    /// Maximum number of values allowed per option (default: 20).
    /// </summary>
    public int MaxOptionValuesPerOption { get; set; } = 20;

    /// <summary>
    /// Stock quantity threshold for "low stock" status (default: 10).
    /// Products with stock at or below this value (but greater than 0) are considered low stock.
    /// Used in product listing filters and inventory management.
    /// </summary>
    public int LowStockThreshold { get; set; } = 10;

    /// <summary>
    /// The DataType key (GUID) for the Product Description rich text editor.
    /// This DataType can be configured in Settings > Data Types.
    /// If null or not found, a default DataType will be created on startup.
    /// </summary>
    public Guid? ProductDescriptionDataTypeKey { get; set; }

    /// <summary>
    /// Alias of an Element Type to use for custom product properties.
    /// When set, the Element Type's tabs and properties are rendered in the product workspace.
    /// The Element Type must have IsElement = true.
    /// </summary>
    public string? ProductElementTypeAlias { get; set; }

    /// <summary>
    /// Virtual path prefixes to search for product views.
    /// Views are discovered from files and compiled RCLs.
    /// Default: ["~/Views/Products/"]
    /// </summary>
    public string[] ProductViewLocations { get; set; } = ["~/Views/Products/"];

    /// <summary>
    /// Check if a country code is allowed by store settings.
    /// Returns true if no restrictions are configured or if the country is in the allowed list.
    /// </summary>
    public bool IsCountryAllowed(string countryCode)
    {
        if (!HasCountryRestrictions) return true;
        return AllowedCountries!.Any(c => c.Equals(countryCode, StringComparison.OrdinalIgnoreCase));
    }
}
