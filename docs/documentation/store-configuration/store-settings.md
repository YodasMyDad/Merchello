# Store Settings

Store settings control how your storefront displays prices, stock levels, and currency. These are the settings you will interact with most when building storefront views.

## Settings That Affect Your Storefront

These settings are configured in `appsettings.json` under the `Merchello` key and bind to [MerchelloSettings.cs](../../../src/Merchello.Core/Shared/Models/MerchelloSettings.cs):

```json
{
  "Merchello": {
    "StoreCurrencyCode": "GBP",
    "DisplayPricesIncTax": true,
    "ShowStockLevels": false,
    "LowStockThreshold": 10
  }
}
```

| Setting | What it controls |
|---------|-----------------|
| `StoreCurrencyCode` | Base currency for all pricing and transactions (ISO 4217). All product prices are stored in this currency. |
| `DisplayPricesIncTax` | When `true`, storefront prices include applicable tax (VAT/GST). Products are always stored as net prices -- tax is calculated on-the-fly for display. |
| `ShowStockLevels` | When `true`, show exact stock counts ("In Stock (50 available)"). When `false`, show only status ("In Stock" / "Out of Stock"). |
| `LowStockThreshold` | Stock at or below this number (but greater than 0) is flagged as "Low Stock". Default: `5`. |

> **Warning:** `StoreCurrencyCode` is the base currency for all transactions. Changing it after products have been created requires re-pricing everything.

## Reading Settings in Code

For `appsettings.json` values, inject `IOptions<MerchelloSettings>`:

```csharp
public class ProductController(IOptions<MerchelloSettings> options) : Controller
{
    private readonly MerchelloSettings _settings = options.Value;

    public IActionResult Index()
    {
        var currencyCode = _settings.StoreCurrencyCode;   // e.g., "GBP"
        var currencySymbol = _settings.CurrencySymbol;    // e.g., "£"
        var showStock = _settings.ShowStockLevels;
    }
}
```

For persisted store settings (configured in the backoffice), inject `IMerchelloStoreSettingsService`:

```csharp
public class MyService(IMerchelloStoreSettingsService storeSettings)
{
    public async Task DoSomethingAsync(CancellationToken ct)
    {
        var store = await storeSettings.GetStoreAsync(ct);
        var storeName = store.StoreName;
        var invoicePrefix = store.InvoiceNumberPrefix;
    }
}
```

In most storefront views, you will not need to inject settings directly. The [Storefront Context](../storefront/storefront-context.md) bundles these into `StorefrontDisplayContext`, which includes `DisplayPricesIncTax`, currency details, and tax rates in a single call:

```csharp
var displayContext = await storefrontContext.GetDisplayContextAsync(ct);
```

## Other Settings

Additional settings -- store identity (name, logo, address), checkout theme, email configuration, invoice reminders, abandoned cart recovery, and policies -- are managed in the Merchello backoffice. When both `appsettings.json` and backoffice settings exist for the same value, the backoffice (database-persisted) value takes precedence at runtime.

## Next Steps

- [Storefront Context](../storefront/storefront-context.md) -- the recommended way to access display settings in views
- [Configuration Reference](../getting-started/configuration-reference.md) -- complete list of all settings
- [Countries and Regions](./countries-and-regions.md) -- locality data for shipping and tax
