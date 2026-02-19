# Build Your Own Merchello Storefront (`.Site`)

This guide explains how to build your own storefront using the sample in `src/Merchello.Site`, with the **Storefront API** as the main integration surface.

Scope for this guide:
- Core buying flow first: **category -> product options/add-ons -> basket**
- Checkout integration is intentionally out of scope here (kept in Merchello package)
- `.Site` remains on project reference for now; NuGet switch is prepared and documented

## 1. Prerequisites

- .NET SDK matching solution target framework
- Umbraco v17+
- SQL Server or SQLite
- Node is not required for `.Site` storefront runtime (Bootstrap + Alpine + browser modules are used directly)

## 2. Solution Setup

1. Clone and open the solution at `src/Merchello.sln`.
2. Keep these projects in the solution:
- `src/Merchello.Core`
- `src/Merchello`
- `src/Merchello.Site`
- `src/Merchello.Tests`
3. Build:

```bash
dotnet build src/Merchello.sln
```

4. Run the site project:

```bash
dotnet run --project src/Merchello.Site/Merchello.Site.csproj
```

## 3. Required App Settings

Primary config file: `src/Merchello.Site/appsettings.json`.

Minimum settings to validate for your site:

```json
{
  "ConnectionStrings": {
    "umbracoDbDSN": "<your connection string>"
  },
  "Merchello": {
    "StoreCurrencyCode": "GBP",
    "DefaultShippingCountry": "GB",
    "ProductViewLocations": [
      "~/Views/Products/"
    ]
  }
}
```

Recommended for production readiness:
- `Merchello:DownloadTokenSecret`
- `Merchello:ExchangeRates:*`
- `Merchello:Webhooks:*`
- `Merchello:Protocols:*` (if used)

### 3.1 DB-backed Store Configuration

Store/checkout/email/policy configuration is now DB-backed and managed in the backoffice root workspace tabs:
- `Store`
- `Policies`
- `Checkout`
- `Email`
- `UCP`

These values are no longer expected in `appsettings.json` for normal runtime use:
- `Merchello:InvoiceNumberPrefix`
- `Merchello:Store:*` identity/policy URL fields
- `Merchello:DisplayPricesIncTax`
- `Merchello:ShowStockLevels`
- `Merchello:LowStockThreshold`
- `Merchello:Checkout` branding/order-terms fields
- `Merchello:Email` default from/theme fields
- `Merchello:Invoices:Reminders:*`
- `Merchello:AbandonedCheckout` cadence/limits (except `RecoveryUrlBase`)

## 4. Storefront Architecture in This Sample

### 4.1 Controller Thinness + DTO Mapping

`src/Merchello/Controllers/StorefrontApiController.cs` now delegates DTO shaping to:
- `src/Merchello/Services/IStorefrontDtoMapper.cs`
- `src/Merchello/Services/StorefrontDtoMapper.cs`

This keeps controller actions focused on HTTP orchestration and makes DTO contracts easier to audit and reuse.

### 4.2 Single Basket DTO Shape for API + Site

`src/Merchello.Site/Basket/Controllers/BasketController.cs` now uses `IStorefrontDtoMapper` to map basket data, so `.Site` and API consumers follow one contract source.

## 5. Layout and Header Pattern

Main template: `src/Merchello.Site/Views/Website.cshtml`.

Implemented header behavior:
- First 4 categories shown inline
- Remaining categories shown under `More`
- Mobile offcanvas menu
- Country selector + basket indicator in utility area

Supporting styles are in `src/Merchello.Site/wwwroot/css/styles.css`.

## 6. Page Implementation Guide

### 6.1 Category Page

- View: `src/Merchello.Site/Views/Category.cshtml`
- Alpine component is now module-based: `src/Merchello.Site/wwwroot/scripts/storefront/category-page.js`

Behavior:
- Filter toggles
- Price range filtering
- Sorting
- Pagination
- Query-string based navigation

### 6.2 Product Page (Core Buying Flow)

Primary orchestration view:
- `src/Merchello.Site/Views/Products/Default.cshtml`

Extracted partials:
- `src/Merchello.Site/Views/Products/Partials/_ProductGallery.cshtml`
- `src/Merchello.Site/Views/Products/Partials/_ProductPurchasePanel.cshtml`
- `src/Merchello.Site/Views/Products/Partials/_ProductUpsells.cshtml`

Key simplifications:
- Removed non-product content dependencies (`heroImage`, `productGallery`, `subtitle`, `tagline`, `usPs`)
- Kept variant selection and add-on UX intact
- Kept SSR availability + tax/currency display behavior

### 6.3 Basket Page

- View: `src/Merchello.Site/Views/Basket.cshtml`
- Alpine component: `src/Merchello.Site/wwwroot/scripts/storefront/basket-page.js`

Important binding fix:
- Region dropdown now uses `region.name` (not `region.regionName`)

## 7. Frontend Script Modules

Entry point:
- `src/Merchello.Site/wwwroot/scripts/storefront/index.js`

Modules:
- `src/Merchello.Site/wwwroot/scripts/storefront/stores.js`
- `src/Merchello.Site/wwwroot/scripts/storefront/product-page.js`
- `src/Merchello.Site/wwwroot/scripts/storefront/basket-page.js`
- `src/Merchello.Site/wwwroot/scripts/storefront/category-page.js`
- `src/Merchello.Site/wwwroot/scripts/storefront/toast-container.js`

Public Alpine names kept stable:
- Stores: `basket`, `country`, `toast`, `currency`
- Components: `productPage`, `basketPage`, `categoryPage`, `toastContainer`

Deprecated monolith removed:
- `src/Merchello.Site/wwwroot/scripts/site.js`

## 8. Storefront API Usage Patterns

API base:
- `/api/merchello/storefront/*`

Client wrapper:
- `src/Merchello.Site/wwwroot/scripts/merchello-api.js`

Core endpoints used by `.Site`:
- `GET /context`
- `GET /basket`
- `GET /basket/count`
- `POST /basket/add`
- `POST /basket/update`
- `DELETE /basket/{lineItemId}`
- `POST /basket/clear`
- `GET /basket/availability`
- `GET /basket/estimated-shipping`
- `GET /shipping/countries`
- `GET /shipping/country`
- `POST /shipping/country`
- `GET /shipping/countries/{countryCode}/regions`
- `GET /currency`
- `POST /currency`
- `GET /products/{productId}/availability`

### 8.1 Contract Notes (Current)

Canonical storefront field names now include:
- `dependentLineItemSku` (in basket line items)
- `canShipToLocation` (product availability and basket availability)
- `name` (region field in `RegionDto`)

### 8.2 Headless-First Call Matrix

For headless clients (React/Vue/Next/mobile), use this flow:

1. App bootstrap:
- `GET /api/merchello/storefront/context`
- Returns country/region, currency, and basket summary in one call.

2. Product detail page:
- `GET /api/merchello/storefront/products/{productId}/availability?countryCode=..&regionCode=..&quantity=..`

3. Basket page (single call mode):
- `GET /api/merchello/storefront/basket?includeAvailability=true&countryCode=..&regionCode=..`
- Then optionally:
- `GET /api/merchello/storefront/basket/estimated-shipping?countryCode=..&regionCode=..`

4. Basket mutations:
- `POST /api/merchello/storefront/basket/add`
- `POST /api/merchello/storefront/basket/update`
- `DELETE /api/merchello/storefront/basket/{lineItemId}`
- `POST /api/merchello/storefront/basket/clear`

5. Location/currency changes:
- `POST /api/merchello/storefront/shipping/country`
- `GET /api/merchello/storefront/currency` (optional confirm/readback)

6. Location metadata:
- `GET /api/merchello/storefront/shipping/countries`
- `GET /api/merchello/storefront/shipping/countries/{countryCode}/regions`

### 8.3 Complete Storefront Endpoint Matrix (Headless)

All routes are under `/api/merchello/storefront`.

Basket:
- `GET /basket`
- `GET /basket?includeAvailability=true&countryCode={code}&regionCode={code}`
- `GET /basket/count`
- `POST /basket/add`
- `POST /basket/update`
- `DELETE /basket/{lineItemId}`
- `POST /basket/clear`
- `GET /basket/availability?countryCode={code}&regionCode={code}`
- `GET /basket/estimated-shipping?countryCode={code}&regionCode={code}`

Context:
- `GET /context` (country + region + currency + basket summary)

Shipping/location:
- `GET /shipping/countries`
- `GET /shipping/country`
- `POST /shipping/country`
- `GET /shipping/countries/{countryCode}/regions`

Currency:
- `GET /currency`
- `POST /currency`

Product availability:
- `GET /products/{productId}/availability?countryCode={code}&regionCode={code}&quantity={n}`

Upsells (optional advanced):
- `GET /upsells?location={Basket|ProductPage|Checkout|Email|Confirmation}&countryCode={code}&regionCode={code}`
- `GET /upsells/product/{productId}`
- `POST /upsells/events`

### 8.4 OpenAPI / Swagger for Headless Developers

Merchello now publishes two OpenAPI documents in Umbraco Swagger:

- Backoffice API document name: `merchello`
- Storefront/headless API document name: `merchello-storefront`

Typical Umbraco Swagger endpoints:

- UI: `/umbraco/swagger`
- Backoffice JSON: `/umbraco/swagger/merchello/swagger.json`
- Storefront JSON: `/umbraco/swagger/merchello-storefront/swagger.json`

For headless clients, generate typed SDKs from the `merchello-storefront` document.

Example (`@hey-api/openapi-ts`):

```bash
npx @hey-api/openapi-ts -i https://your-store.com/umbraco/swagger/merchello-storefront/swagger.json -o ./src/api/generated
```

## 9. Core-First vs Optional Features

Core-first (recommended to launch with):
- Category filtering and sorting
- Product variant selection
- Product add-ons (required and optional)
- Basket add/update/remove
- Country-based display context and availability checks

Optional advanced features (keep secondary):
- Upsell suggestions and tracking
- Additional merchandising content blocks
- Protocol/webhook/email automation extras

## 10. NuGet Prep Checklist (Do Not Switch Yet)

Before moving `.Site` from project reference to NuGet:

1. Ensure all `.Site` storefront calls use only documented DTO contracts in `merchello-api.js`.
2. Confirm no `.Site` code depends on internal service/model types from `Merchello.Core` that are not public API contracts.
3. Validate view paths expected by `Merchello:ProductViewLocations`.
4. Confirm `StorefrontApiController` route URLs remain unchanged.
5. Run smoke pass for category/product/basket flows in clean database.

## 11. Migration Notes (Breaking DTO Field Renames)

If you are upgrading custom storefront code to this release:

1. Replace basket line item field:
- `dependantLineItemSku` -> `dependentLineItemSku`

2. Replace availability fields:
- `canShipToCountry` -> `canShipToLocation`

Applies to contracts returned from:
- `GET /api/merchello/storefront/products/{productId}/availability`
- `GET /api/merchello/storefront/basket/availability`
- `GET /api/merchello/storefront/basket` (item availability map)

## 12. Validation Checklist

Run these commands before release:

```bash
dotnet build src/Merchello.sln
dotnet test src/Merchello.Tests/Merchello.Tests.csproj
```

Manual smoke checklist:
- Product page renders without removed non-product fields
- Variant + add-on selection updates price/stock/URL correctly
- Header shows max 4 categories with overflow in `More`
- Mobile menu can navigate categories and basket
- Basket region dropdown renders `region.name`
- Country switch updates currency/display totals consistently
