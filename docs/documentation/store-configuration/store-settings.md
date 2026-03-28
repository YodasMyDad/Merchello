# Store Settings

Store settings define your store's identity, currency, tax display preferences, and operational defaults. There are two layers of configuration: `appsettings.json` for application-level defaults and the backoffice UI for persisted store-level settings.

## Configuration Sources

### appsettings.json (Application Level)

These settings are defined in your `appsettings.json` under the `Merchello` key and are bound to the `MerchelloSettings` class. They control application behavior like routing, product options, and default values.

```json
{
  "Merchello": {
    "StoreCurrencyCode": "GBP",
    "DefaultShippingCountry": "GB",
    "DisplayPricesIncTax": true,
    "ShowStockLevels": false,
    "InvoiceNumberPrefix": "INV-",
    "DefaultRounding": "AwayFromZero",
    "DefaultMemberGroup": "MerchelloCustomer",
    "Store": {
      "Name": "My Store",
      "Email": "orders@mystore.com",
      "Phone": "+44 20 1234 5678",
      "LogoUrl": "/media/logo.png",
      "WebsiteUrl": "https://mystore.com",
      "Address": "123 Commerce Street\nLondon, EC1A 1BB\nUnited Kingdom",
      "TermsUrl": "/terms",
      "PrivacyUrl": "/privacy"
    }
  }
}
```

### Backoffice (Persisted Store Level)

The backoffice UI exposes a **Store Settings** panel where staff can manage settings that are persisted to the database. These settings are stored in the `MerchelloStore` entity and include:

| Setting | Description | Default |
|---------|-------------|---------|
| `StoreName` | Store name for checkout and emails | `"Acme Store"` |
| `StoreEmail` | Contact email address | `null` |
| `StorePhone` | Contact phone number | `null` |
| `StoreLogoMediaKey` | Umbraco media key for the logo | `null` |
| `StoreWebsiteUrl` | Base URL for links | `null` |
| `StoreAddress` | Physical address (multi-line) | Default placeholder |
| `InvoiceNumberPrefix` | Prefix for invoice numbers | `"INV-"` |
| `DisplayPricesIncTax` | Show prices including tax | `true` |
| `ShowStockLevels` | Show exact stock counts | `true` |
| `LowStockThreshold` | Threshold for "low stock" status | `5` |

The backoffice also manages additional sub-settings:

- **Checkout** -- theme colors, fonts, logo position, terms and conditions checkbox, confirmation redirect
- **Email** -- default from address, from name, email theme settings
- **Invoice Reminders** -- automated overdue invoice reminder sequences
- **Policies** -- store policy settings
- **Abandoned Checkout** -- recovery settings
- **UCP** -- Universal Commerce Protocol settings

> **Note:** When both `appsettings.json` and backoffice settings exist for the same value, the backoffice (database-persisted) value takes precedence at runtime.

## Currency

The store currency is set via `StoreCurrencyCode` in `appsettings.json`:

```json
{
  "Merchello": {
    "StoreCurrencyCode": "GBP"
  }
}
```

This must be an ISO 4217 currency code. Common values:

| Code | Currency |
|------|----------|
| `USD` | US Dollar |
| `GBP` | British Pound |
| `EUR` | Euro |
| `AUD` | Australian Dollar |
| `CAD` | Canadian Dollar |

The currency symbol is derived automatically from the code (e.g., `GBP` gives you `£`).

> **Warning:** The store currency is the base currency for all pricing and transactions. All product prices, invoice amounts, and payment captures use this currency. Changing it after products have been created requires re-pricing everything.

## Tax Display

```json
{
  "Merchello": {
    "DisplayPricesIncTax": true
  }
}
```

When `DisplayPricesIncTax` is `true`:
- Storefront prices are displayed **including** applicable tax (VAT/GST)
- Tax is calculated based on the customer's shipping country and the product's tax group
- Products are always stored as **net prices** in the database
- The tax is calculated on-the-fly for display using the customer's applicable rate

When `false` (the default), prices are displayed as stored (net/exclusive of tax).

## Stock Display

```json
{
  "Merchello": {
    "ShowStockLevels": false,
    "LowStockThreshold": 10
  }
}
```

- When `ShowStockLevels` is `true`, the storefront shows exact counts like "In Stock (50 available)"
- When `false`, it shows only status: "In Stock" or "Out of Stock"
- Products with stock at or below `LowStockThreshold` (but greater than 0) are flagged as "Low Stock"

## Invoice Numbering

```json
{
  "Merchello": {
    "InvoiceNumberPrefix": "INV-"
  }
}
```

Invoice numbers are auto-generated with this prefix. For example: `INV-00001`, `INV-00002`, etc. You can change the prefix to match your business requirements (e.g., `"ORD-"`, `"MY-STORE-"`).

## Rounding

```json
{
  "Merchello": {
    "DefaultRounding": "AwayFromZero"
  }
}
```

Controls how monetary calculations handle midpoint values:

- **`AwayFromZero`** (default): 2.5 rounds to 3 -- this is the most common rounding for commerce and what customers expect
- **`ToEven`**: Banker's rounding -- 2.5 rounds to 2, 3.5 rounds to 4 -- reduces accumulated rounding bias

## Member Settings

```json
{
  "Merchello": {
    "DefaultMemberGroup": "MerchelloCustomer",
    "DefaultMemberTypeAlias": "Member"
  }
}
```

When customers create accounts during checkout:
- They are added to the `DefaultMemberGroup` (created automatically if it does not exist)
- The member is created using the `DefaultMemberTypeAlias` member type

## Accessing Settings in Code

In controllers and services, inject `IOptions<MerchelloSettings>`:

```csharp
public class MyController(IOptions<MerchelloSettings> options) : Controller
{
    private readonly MerchelloSettings _settings = options.Value;

    public IActionResult Index()
    {
        var currencySymbol = _settings.CurrencySymbol; // e.g., "$"
        var currencyCode = _settings.StoreCurrencyCode; // e.g., "USD"
        var showStock = _settings.ShowStockLevels;
        // ...
    }
}
```

For persisted store settings, inject `IMerchelloStoreSettingsService`:

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

## Next Steps

- [Configuration Reference](../getting-started/configuration-reference.md) -- complete list of all settings
- [Countries and Regions](./countries-and-regions.md) -- locality data for shipping and tax
- [Warehouses](./warehouses.md) -- warehouse and stock management
