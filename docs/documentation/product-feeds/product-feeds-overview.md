# Product Feeds (Google Shopping)

Merchello can generate XML product feeds for Google Shopping (Google Merchant Center). You configure feeds in the backoffice with language, country, and currency targeting, and Merchello generates compliant XML that Google can consume. Feeds are rebuilt automatically on a schedule and served via public URLs.

## How It Works

A **product feed** is a configuration that defines:

- Which products to include (via filters on product type, collection, or custom criteria)
- How to format the data (country, currency, language)
- Whether to include tax in prices
- Custom labels and custom fields for Google Ads campaign segmentation

Each feed has a **slug** that forms part of its public URL. You create and manage feeds in the Umbraco backoffice under **Settings > Product Feeds**.

## Public Feed URLs

Once a feed is configured and enabled, it is served at a public URL that you submit to Google Merchant Center:

| URL | Description |
| --- | --- |
| `/api/merchello/feeds/{slug}.xml` | Main product feed |
| `/api/merchello/feeds/{slug}/promotions.xml` | Promotions feed |
| `/api/merchello/feeds/auto-discount/active` | Active auto-discount info |

For example, a feed with slug `us-shopping` would be accessible at:

```text
https://your-site.com/api/merchello/feeds/us-shopping.xml
```

Submit this URL to Google Merchant Center as your product data feed.

## Feed Properties

| Property | Default | Description |
| --- | --- | --- |
| `Name` | -- | Display name in the backoffice |
| `Slug` | -- | URL-safe identifier used in the public feed URL |
| `CountryCode` | `US` | Target country for the feed |
| `CurrencyCode` | `USD` | Currency for prices |
| `LanguageCode` | `en` | Language for product titles and descriptions |
| `IncludeTaxInPrice` | null | Whether prices include tax (null = use store default) |
| `IsEnabled` | true | Whether the feed is active |

## Promotions Feed

In addition to the main product feed, Merchello can generate a **promotions feed** for Google Merchant Promotions. This includes:

- **Manual promotions** -- explicitly configured promotional offers
- **Auto-discount integration** -- automatic discounts surfaced as Google promotions

## Auto-Discount Configuration

Merchello can validate and surface Google auto-discount tokens. Configure the public key URL in `appsettings.json`:

```json
{
  "Merchello": {
    "ProductFeeds": {
      "GoogleAutoDiscountPublicKeyUrl": "https://www.gstatic.com/shopping/merchant/auto_discount/signing_key.json"
    }
  }
}
```

## Automatic Refresh

Feeds are cached in the database so serving them is a fast read, not a full product query. A background job (`ProductFeedRefreshJob`) periodically rebuilds all enabled feeds.

Configure the refresh schedule in `appsettings.json`:

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

You can also trigger a manual rebuild from the backoffice at any time.

## Custom Field Resolvers

Product feed field values are resolved through a pluggable resolver system. Built-in resolvers handle standard Google Shopping fields (title, description, price, availability, etc.), but you can register custom resolvers for specialized needs.

Each resolver receives a `ProductFeedResolverContext` with the product data, feed configuration, and store settings, and returns the resolved field value.

## Multiple Feeds

You can create multiple feeds targeting different countries, currencies, or product subsets. For example:

- `us-shopping` -- US products in USD
- `gb-shopping` -- UK products in GBP with tax included
- `de-shopping` -- German products in EUR

Each feed has its own public URL to submit to Google Merchant Center.

## Related Topics

- [Products](../products/)
- [Background Jobs](../background-jobs/background-jobs.md)
