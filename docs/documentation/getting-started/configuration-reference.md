# Configuration Reference

This is a complete reference for all `appsettings.json` settings under the `Merchello` key. These settings control everything from store currency to checkout behavior, product rendering, digital downloads, and background job timing.

## Top-Level Settings

These live directly under the `"Merchello"` key:

```json
{
  "Merchello": {
    "EnableCheckout": true,
    "EnableProductRendering": true,
    "InstallSeedData": false,
    "StoreCurrencyCode": "USD",
    "DefaultShippingCountry": "US",
    "DisplayPricesIncTax": false,
    "ShowStockLevels": false,
    "InvoiceNumberPrefix": "INV-",
    "DefaultRounding": "AwayFromZero",
    "OrderGroupingStrategy": null,
    "ShippingAutoSelectStrategy": "cheapest",
    "LowStockThreshold": 10,
    "MaxProductOptions": 5,
    "MaxOptionValuesPerOption": 20,
    "ProductDescriptionDataTypeKey": null,
    "DefaultMemberGroup": "MerchelloCustomer",
    "DefaultMemberTypeAlias": "Member",
    "DownloadTokenSecret": "",
    "DefaultDownloadLinkExpiryDays": 30,
    "DefaultMaxDownloadsPerLink": 0
  }
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `EnableCheckout` | `bool` | `true` | Enables the integrated Shopify-style checkout at `/checkout`. Set `false` for headless installs with custom checkout frontends. |
| `EnableProductRendering` | `bool` | `true` | Enables product route hijacking via `ProductContentFinder`. Products render at root-level URLs (e.g., `/my-product`). Set `false` for headless installs. |
| `InstallSeedData` | `bool` | `false` | Shows the seed data installer in the backoffice. Essential data types are always installed regardless. |
| `StoreCurrencyCode` | `string` | `"USD"` | ISO 4217 currency code for the store's base currency (e.g., `"GBP"`, `"EUR"`). All prices are stored in this currency. |
| `DefaultShippingCountry` | `string?` | `null` | ISO 3166-1 alpha-2 country code. Used as the default shipping country when no customer preference is set. |
| `DisplayPricesIncTax` | `bool` | `false` | When `true`, storefront prices include applicable tax (VAT/GST). Products are always stored as net prices internally. |
| `ShowStockLevels` | `bool` | `false` | When `true`, shows exact stock counts (e.g., "50 available"). When `false`, shows only "In Stock" or "Out of Stock". |
| `InvoiceNumberPrefix` | `string` | `"INV-"` | Prefix for generated invoice numbers. |
| `DefaultRounding` | `MidpointRounding` | `AwayFromZero` | Rounding strategy for monetary calculations. `AwayFromZero` (2.5 rounds to 3) is standard for commerce. `ToEven` is banker's rounding. |
| `OrderGroupingStrategy` | `string?` | `null` | Custom order grouping strategy. Leave `null` for default warehouse-based grouping. Set to `"vendor-grouping"` or a fully qualified type name for custom strategies. |
| `ShippingAutoSelectStrategy` | `string` | `"cheapest"` | How shipping options are auto-selected during checkout. Values: `"cheapest"`, `"fastest"`, `"cheapest-then-fastest"`. |
| `LowStockThreshold` | `int` | `10` | Products with stock at or below this value (but > 0) are considered "low stock". Used in filters and inventory management. |
| `MaxProductOptions` | `int` | `5` | Maximum number of options per product. Higher values cause exponential variant generation. |
| `MaxOptionValuesPerOption` | `int` | `20` | Maximum number of values per option. |
| `ProductDescriptionDataTypeKey` | `Guid?` | `null` | GUID of the Umbraco Data Type for the product description rich text editor. If `null`, a default is created on startup. |
| `DefaultMemberGroup` | `string` | `"MerchelloCustomer"` | Member group for customers who create accounts during checkout. Created automatically if it does not exist. |
| `DefaultMemberTypeAlias` | `string` | `"Member"` | Umbraco member type alias used when creating members during checkout. |
| `DownloadTokenSecret` | `string` | `""` | HMAC secret for signing download tokens (digital products). Must be at least 32 characters for production. Generate with: `Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N")` |
| `DefaultDownloadLinkExpiryDays` | `int` | `30` | Days before download links expire. `0` = never expires. Products can override this individually. |
| `DefaultMaxDownloadsPerLink` | `int` | `0` | Maximum downloads per link. `0` = unlimited. Products can override individually. |

## Option Type and UI Aliases

These arrays define what option types and UI display styles are available when configuring product options:

```json
{
  "Merchello": {
    "OptionTypeAliases": ["colour", "size", "material", "pattern", "misc"],
    "OptionUiAliases": ["dropdown", "colour", "image", "checkbox", "radiobutton"]
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `OptionTypeAliases` | `["colour", "size", "material", "pattern"]` | Defines the kinds of attributes an option represents (what the option *is*). |
| `OptionUiAliases` | `["dropdown", "colour", "image", "checkbox", "radiobutton"]` | Controls how options are displayed to customers. `"colour"` shows swatches, `"image"` shows media thumbnails, etc. |

## Product View Locations

```json
{
  "Merchello": {
    "ProductViewLocations": ["~/Views/Products/"]
  }
}
```

An array of virtual path prefixes where Merchello looks for product Razor views. When a product has `ViewAlias = "Gallery"`, Merchello resolves to `~/Views/Products/Gallery.cshtml`.

## Store Settings

Store identity and contact information used in checkout, emails, and invoices:

```json
{
  "Merchello": {
    "Store": {
      "Name": "My Store",
      "Email": "orders@example.com",
      "Phone": "+1 555 123 4567",
      "LogoUrl": "/media/logo.png",
      "WebsiteUrl": "https://store.example.com",
      "Address": "123 Commerce Street\nNew York, NY 10001",
      "TermsUrl": "/terms",
      "PrivacyUrl": "/privacy"
    }
  }
}
```

| Setting | Description |
|---------|-------------|
| `Name` | Store name shown in checkout header and emails. |
| `Email` | Default from address for store emails. |
| `Phone` | Phone number shown in checkout and email footers. |
| `LogoUrl` | URL to the store logo for checkout and emails. |
| `WebsiteUrl` | Base URL for generating download links and email links. |
| `Address` | Physical address for invoices and email footers. Supports newlines. |
| `TermsUrl` | URL to terms and conditions page. |
| `PrivacyUrl` | URL to privacy policy page. |

> **Note:** Store settings can also be managed through the backoffice UI, where they are persisted to the database. The backoffice values override `appsettings.json` values.

## Cache Settings

```json
{
  "Merchello": {
    "Cache": {
      "DefaultTtlSeconds": 300
    }
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `DefaultTtlSeconds` | `300` | Default cache TTL in seconds (5 minutes). |

## Exchange Rate Settings

```json
{
  "Merchello": {
    "ExchangeRates": {
      "CacheTtlMinutes": 60,
      "RefreshIntervalMinutes": 60
    }
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `CacheTtlMinutes` | `60` | How long exchange rates are cached. |
| `RefreshIntervalMinutes` | `60` | How often the background job fetches fresh rates. |

## Checkout Settings

```json
{
  "Merchello": {
    "Checkout": {
      "SessionSlidingTimeoutMinutes": 30,
      "SessionAbsoluteTimeoutMinutes": 240,
      "LogSessionExpirations": true
    }
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `SessionSlidingTimeoutMinutes` | `30` | Checkout session extends by this much on each activity. |
| `SessionAbsoluteTimeoutMinutes` | `240` | Maximum lifetime for a checkout session (4 hours). |
| `LogSessionExpirations` | `true` | Whether to log when checkout sessions expire. |

## Abandoned Checkout Settings

```json
{
  "Merchello": {
    "AbandonedCheckout": {
      "RecoveryUrlBase": "/checkout/recover",
      "AbandonmentThresholdHours": 1.0,
      "RecoveryExpiryDays": 30,
      "CheckIntervalMinutes": 15,
      "FirstEmailDelayHours": 1,
      "ReminderEmailDelayHours": 24,
      "FinalEmailDelayHours": 48,
      "MaxRecoveryEmails": 3
    }
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `RecoveryUrlBase` | `"/checkout/recover"` | Base URL path for recovery links sent in emails. |
| `AbandonmentThresholdHours` | `1.0` | Hours of inactivity before a checkout is considered abandoned. |
| `RecoveryExpiryDays` | `30` | Days before recovery tokens expire. |
| `CheckIntervalMinutes` | `15` | How often the detection job runs. |
| `FirstEmailDelayHours` | `1` | Wait time after abandonment before the first recovery email. |
| `ReminderEmailDelayHours` | `24` | Wait time after first email before the reminder. |
| `FinalEmailDelayHours` | `48` | Wait time after reminder before the final email. |
| `MaxRecoveryEmails` | `3` | Maximum recovery emails per abandoned checkout. |

## Email Settings

```json
{
  "Merchello": {
    "Email": {
      "TemplateViewLocations": [
        "/Views/Emails/{0}.cshtml",
        "/App_Plugins/Merchello/Views/Emails/{0}.cshtml"
      ],
      "MaxRetries": 3,
      "RetryDelaysSeconds": [60, 300, 900],
      "DeliveryRetentionDays": 30,
      "MaxAttachmentSizeBytes": 10485760,
      "MaxTotalAttachmentSizeBytes": 26214400,
      "AttachmentStoragePath": "App_Data/Email_Attachments",
      "AttachmentRetentionHours": 72
    }
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `TemplateViewLocations` | See above | View paths for email templates. `{0}` is replaced with the template name. |
| `MaxRetries` | `3` | Maximum retry attempts for failed email deliveries. |
| `RetryDelaysSeconds` | `[60, 300, 900]` | Delay between retries (1 min, 5 min, 15 min). |
| `DeliveryRetentionDays` | `30` | Days to keep delivery records before cleanup. |
| `MaxAttachmentSizeBytes` | `10485760` | Max size per attachment (10 MB). |
| `MaxTotalAttachmentSizeBytes` | `26214400` | Max combined size for all attachments (25 MB). |
| `AttachmentStoragePath` | `"App_Data/Email_Attachments"` | Temp storage for attachment files. |
| `AttachmentRetentionHours` | `72` | Hours to keep orphaned attachment files (3 days). |

## Webhook Settings

```json
{
  "Merchello": {
    "Webhooks": {
      "MaxRetries": 5,
      "RetryDelaysSeconds": [60, 300, 900, 3600, 14400],
      "DeliveryIntervalSeconds": 10,
      "DefaultTimeoutSeconds": 30,
      "MaxPayloadSizeBytes": 1000000,
      "DeliveryLogRetentionDays": 30
    }
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `MaxRetries` | `5` | Maximum retry attempts for failed webhook deliveries. |
| `RetryDelaysSeconds` | `[60, 300, 900, 3600, 14400]` | Exponential backoff delays (1 min to 4 hours). |
| `DeliveryIntervalSeconds` | `10` | How often the delivery job polls for pending webhooks. |
| `DefaultTimeoutSeconds` | `30` | HTTP timeout for webhook requests. |
| `MaxPayloadSizeBytes` | `1000000` | Maximum webhook payload size (1 MB). |
| `DeliveryLogRetentionDays` | `30` | Days to keep delivery logs. |

## Fulfilment Settings

```json
{
  "Merchello": {
    "Fulfilment": {
      "PollingIntervalMinutes": 15,
      "MaxRetryAttempts": 5,
      "RetryDelaysMinutes": [5, 15, 30, 60, 120],
      "SyncLogRetentionDays": 30,
      "WebhookLogRetentionDays": 7,
      "SupplierDirect": {
        "Enabled": true
      }
    }
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `PollingIntervalMinutes` | `15` | How often fulfilment status is polled. |
| `MaxRetryAttempts` | `5` | Max retries for failed fulfilment submissions. |
| `RetryDelaysMinutes` | `[5, 15, 30, 60, 120]` | Delay between retries. |
| `SyncLogRetentionDays` | `30` | Days to keep sync logs. |
| `WebhookLogRetentionDays` | `7` | Days to keep fulfilment webhook logs. |
| `SupplierDirect.Enabled` | `true` | Enables the Supplier Direct fulfilment provider. |

## Product Feed Settings

```json
{
  "Merchello": {
    "ProductFeeds": {
      "AutoRefreshEnabled": true,
      "RefreshIntervalHours": 3
    }
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `AutoRefreshEnabled` | `true` | Whether product feeds auto-refresh in the background. |
| `RefreshIntervalHours` | `3` | Hours between feed refreshes. |

## Product Sync Settings

```json
{
  "Merchello": {
    "ProductSync": {
      "WorkerIntervalSeconds": 10,
      "RunRetentionDays": 90,
      "ArtifactRetentionDays": 30,
      "MaxCsvBytes": 15728640,
      "MaxValidationIssuesReturned": 1000,
      "ImageDownloadTimeoutSeconds": 30,
      "MaxImageBytes": 20971520,
      "MediaImportRootFolderName": "Products"
    }
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `WorkerIntervalSeconds` | `10` | How often the sync worker checks for pending jobs. |
| `RunRetentionDays` | `90` | Days to keep sync run records. |
| `ArtifactRetentionDays` | `30` | Days to keep sync artifacts (uploaded CSVs). |
| `MaxCsvBytes` | `15728640` | Max CSV upload size (15 MB). |
| `MaxValidationIssuesReturned` | `1000` | Max validation issues shown during CSV validation. |
| `ImageDownloadTimeoutSeconds` | `30` | Timeout for downloading product images from URLs. |
| `MaxImageBytes` | `20971520` | Max image file size (20 MB). |
| `MediaImportRootFolderName` | `"Products"` | Umbraco Media folder for imported product images. |

## Google Shopping Categories

```json
{
  "Merchello": {
    "GoogleShoppingCategories": {
      "CacheHours": 24,
      "TaxonomyUrls": {
        "US": "https://www.google.com/basepages/producttype/taxonomy.en-US.txt",
        "GB": "https://www.google.com/basepages/producttype/taxonomy.en-GB.txt",
        "AU": "https://www.google.com/basepages/producttype/taxonomy.en-AU.txt"
      }
    }
  }
}
```

## Upsell Settings

```json
{
  "Merchello": {
    "Upsells": {
      "MaxSuggestionsPerLocation": 3,
      "CacheDurationSeconds": 300,
      "EventRetentionDays": 90,
      "EnablePostPurchase": true,
      "PostPurchaseFulfillmentHoldMinutes": 5
    }
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `MaxSuggestionsPerLocation` | `3` | Maximum upsell suggestions shown per location (cart, checkout, post-purchase). |
| `CacheDurationSeconds` | `300` | Cache duration for upsell calculations. |
| `EventRetentionDays` | `90` | Days to keep upsell event tracking data. |
| `EnablePostPurchase` | `true` | Enables post-purchase upsell offers. |
| `PostPurchaseFulfillmentHoldMinutes` | `5` | Minutes to hold fulfilment after payment to allow post-purchase upsell additions. |

## Protocol Settings (UCP)

```json
{
  "Merchello": {
    "Protocols": {
      "PublicBaseUrl": null,
      "ManifestCacheDurationMinutes": 60,
      "RequireHttps": true,
      "MinimumTlsVersion": "1.3"
    }
  }
}
```

These settings configure the Universal Commerce Protocol (UCP) integration for AI agent commerce. See the UCP documentation for details.

## Next Steps

- [Installation](./installation.md) -- getting started with Merchello
- [Store Settings](../store-configuration/store-settings.md) -- backoffice-managed store settings
