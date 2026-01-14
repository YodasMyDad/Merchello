using System.Globalization;

namespace Merchello.Core.Shared.Models;

public class MerchelloSettings
{
    /// <summary>
    /// When true, seeds sample data (products, warehouses, customers, invoices) on startup.
    /// Essential items like data types are always installed regardless of this setting.
    /// Default: false
    /// </summary>
    public bool InstallSeedData { get; set; }

    /// <summary>
    /// Prefix for invoice numbers (e.g., "INV-")
    /// </summary>
    public string InvoiceNumberPrefix { get; set; } = "INV-";

    /// <summary>
    /// Store name displayed on invoices, statements, and emails.
    /// </summary>
    public string? StoreName { get; set; }

    /// <summary>
    /// Store address displayed on invoices, statements, and emails.
    /// Can include multiple lines separated by newlines.
    /// </summary>
    public string? StoreAddress { get; set; }

    /// <summary>
    /// Default store currency code (ISO 4217), e.g., "GBP", "USD", "EUR".
    /// Used for displaying prices in the admin UI and as the default for transactions.
    /// </summary>
    public string StoreCurrencyCode { get; set; } = "USD";

    /// <summary>
    /// Default shipping country code (ISO 3166-1 alpha-2) for the storefront.
    /// Used when no customer preference is set. Falls back to "US" if not configured.
    /// Example: "GB", "US"
    /// </summary>
    public string? DefaultShippingCountry { get; set; }

    /// <summary>
    /// When true, storefront prices are displayed including applicable tax (VAT/GST).
    /// Tax is calculated based on the customer's shipping country using TaxGroup rates.
    /// Products remain stored as NET prices in the database.
    /// Default: false (prices displayed excluding tax)
    /// </summary>
    public bool DisplayPricesIncTax { get; set; }

    /// <summary>
    /// When true, shows stock counts on product pages (e.g., "In Stock (50 available)").
    /// When false, shows only status (e.g., "In Stock" or "Out of Stock").
    /// Default: false
    /// </summary>
    public bool ShowStockLevels { get; set; }

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
    /// Default member group for customers who create accounts during checkout.
    /// The group will be created automatically if it doesn't exist.
    /// Default: "MerchelloCustomer"
    /// </summary>
    public string DefaultMemberGroup { get; set; } = "MerchelloCustomer";

    /// <summary>
    /// Member type alias used when creating members during checkout.
    /// Default: "Member" (Umbraco's default member type)
    /// </summary>
    public string DefaultMemberTypeAlias { get; set; } = "Member";
}
