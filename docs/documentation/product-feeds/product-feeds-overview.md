# Product Feeds (Google Shopping)

Merchello can generate XML product feeds for Google Shopping (Google Merchant Center). You configure feeds in the backoffice with language, country, and currency targeting, and Merchello generates compliant XML that Google can consume. Feeds are rebuilt automatically on a schedule and served via public URLs.

## How It Works

A **product feed** is a configuration that defines:

- Which products to include (via filters on product type, collection, or custom criteria)
- How to format the data (country, currency, language)
- Whether to include tax in prices
- Custom labels and custom fields for Google Ads campaign segmentation

Each feed has a **slug** that forms part of its public URL. You create and manage feeds in the Umbraco backoffice under **Settings > Product Feeds**.

The feed generators live in [Merchello.Core/ProductFeeds/Services](../../../src/Merchello.Core/ProductFeeds/Services) ([`GoogleProductFeedGenerator`](../../../src/Merchello.Core/ProductFeeds/Services/GoogleProductFeedGenerator.cs), [`GooglePromotionFeedGenerator`](../../../src/Merchello.Core/ProductFeeds/Services/GooglePromotionFeedGenerator.cs)) and the public controller is [`ProductFeedsPublicController`](../../../src/Merchello/Controllers/ProductFeedsPublicController.cs).

## Public Feed URLs

Once a feed is configured and enabled, it is served at a public URL that you submit to Google Merchant Center. These routes are served via the Storefront API (not the backoffice management API):

| URL | Description |
| --- | --- |
| `/api/merchello/feeds/{slug}.xml` | Main product feed (`application/xml`) |
| `/api/merchello/feeds/{slug}/promotions.xml` | Promotions feed (`application/xml`) |
| `/api/merchello/feeds/auto-discount/active` | Active Google auto-discount payload (returns `204 No Content` when none active) |

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

Feeds are cached in the database so serving them is a fast read, not a full product query. A background job ([`ProductFeedRefreshJob`](../../../src/Merchello.Core/ProductFeeds/Services/ProductFeedRefreshJob.cs)) periodically rebuilds all enabled feeds.

Configure the refresh schedule in `appsettings.json` (binds to [`ProductFeedSettings`](../../../src/Merchello.Core/ProductFeeds/ProductFeedSettings.cs)):

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

You can also trigger a manual rebuild from the backoffice or via `POST /api/v1/product-feeds/{id}/rebuild` (see [ProductFeedsApiController](../../../src/Merchello/Controllers/ProductFeedsApiController.cs)).

## Custom Field Resolvers

Product feed field values are resolved through a pluggable resolver system. Built-in resolvers handle standard Google Shopping fields (title, description, price, availability, etc.), but you can register custom resolvers for specialized needs.

Each resolver receives a [`ProductFeedResolverContext`](../../../src/Merchello.Core/ProductFeeds/Models/ProductFeedResolverContext.cs) with the product data, feed configuration, and store settings, and returns the resolved field value. Resolvers are discovered via `ExtensionManager`.

For the full developer guide (registering resolvers, field aliases, testing) see [docs/Product-Feed-Resolvers.md](../../Product-Feed-Resolvers.md).

## Multiple Feeds

You can create multiple feeds targeting different countries, currencies, or product subsets. For example:

- `us-shopping` -- US products in USD
- `gb-shopping` -- UK products in GBP with tax included
- `de-shopping` -- German products in EUR

Each feed has its own public URL to submit to Google Merchant Center.

## Backoffice API

Source: [ProductFeedsApiController.cs](../../../src/Merchello/Controllers/ProductFeedsApiController.cs).

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/product-feeds` | GET | List feeds |
| `/api/v1/product-feeds/{id}` | GET | Feed detail |
| `/api/v1/product-feeds` | POST | Create feed |
| `/api/v1/product-feeds/{id}` | PUT | Update feed |
| `/api/v1/product-feeds/{id}` | DELETE | Delete feed |
| `/api/v1/product-feeds/{id}/rebuild` | POST | Force immediate rebuild |
| `/api/v1/product-feeds/{id}/preview` | GET | Preview generated items |
| `/api/v1/product-feeds/{id}/validate` | POST | Validate feed output against Google rules |
| `/api/v1/product-feeds/resolvers` | GET | List registered resolvers (for custom fields) |

## Related Topics

- [Products](../products/)
- [Google Auto Discount](../advanced/google-auto-discount.md)
- [Product Feed Resolvers (dev guide)](../../Product-Feed-Resolvers.md)
- [Background Jobs](../background-jobs/background-jobs.md)
