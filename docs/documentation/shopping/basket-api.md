# Basket Storefront API

The storefront API provides REST endpoints for basket operations at `/api/merchello/storefront`. These endpoints are designed for JavaScript-driven storefronts -- you can build your entire shopping cart experience with these APIs.

Source: [StorefrontApiController.cs](../../../src/Merchello/Controllers/StorefrontApiController.cs). For the service-level basket contract behind these endpoints, see [Basket Service](./basket-service.md).

## Base URL

All endpoints are at: `/api/merchello/storefront`

No authentication is required for basket operations (baskets are identified by cookie).

## Add to Basket

**`POST /basket/add`**

Adds a product to the basket. Handles product validation, availability checking, add-on creation, and Google auto-discount application.

**Request:**

```json
{
    "productId": "variant-guid",
    "quantity": 1,
    "addons": [
        {
            "optionId": "option-guid",
            "valueId": "value-guid"
        }
    ]
}
```

- `productId` -- the product variant ID (not the product root ID).
- `quantity` -- defaults to 1.
- `addons` -- optional list of selected add-on option values.

**Response (success):**

```json
{
    "success": true,
    "message": "Added to basket",
    "basket": { ... }
}
```

**Response (failure):**

```json
{
    "success": false,
    "message": "Insufficient stock. Available: 2, Requested: 5",
    "basket": null
}
```

## Get Basket

**`GET /basket`**

Returns the full basket with all line items and totals.

**Query parameters:**
- `includeAvailability` (bool, default `false`) -- when `true`, includes per-item availability data.
- `countryCode` (string, optional) -- country code for availability checking.
- `regionCode` (string, optional) -- region code for availability checking.

**Response:**

The basket response includes line items, subtotal, tax, discount, shipping, and total amounts in both store currency and the customer's display currency.

## Get Basket Count

**`GET /basket/count`**

Returns just the item count and formatted total -- useful for updating a mini-cart in the header.

## Update Quantity

**`POST /basket/update`**

Updates the quantity of a line item in the basket.

**Request:**

```json
{
    "lineItemId": "line-item-guid",
    "quantity": 3
}
```

**Response:** Returns the updated basket (same format as `GET /basket`).

## Remove Item

**`DELETE /basket/{lineItemId}`**

Removes a line item from the basket.

**Response:** Returns the updated basket.

## Clear Basket

**`POST /basket/clear`**

Removes all items from the basket and deletes it.

**Response:**

```json
{
    "success": true,
    "message": "Basket cleared",
    "basket": null
}
```

## Check Product Availability

**`GET /products/{productId}/availability`**

Checks whether a product is available to ship to a given location.

**Query parameters:**
- `countryCode` (string, optional) -- defaults to customer's current location.
- `regionCode` (string, optional) -- state/province code.
- `quantity` (int, default `1`) -- quantity to check.

**Response:**

```json
{
    "canShipToLocation": true,
    "hasStock": true,
    "availableStock": 15,
    "statusMessage": "In Stock",
    "showStockLevels": true
}
```

## Check Basket Availability

**`GET /basket/availability`**

Checks availability for all items in the basket at a specific location.

**Query parameters:**
- `countryCode` (string, optional) -- defaults to customer's current location.
- `regionCode` (string, optional) -- state/province code.

**Response:** Returns per-item availability information, highlighting items that cannot ship to the location or are out of stock.

## Get Estimated Shipping

**`GET /basket/estimated-shipping`**

Gets an estimated shipping cost for the basket. Auto-selects the cheapest shipping option per warehouse group.

**Query parameters:**
- `countryCode` (string, optional) -- defaults to customer's current location.
- `regionCode` (string, optional) -- state/province code.

**Response (success):**

Returns the combined shipping total, group count, and basket totals including the estimated shipping. Amounts are shown in the customer's display currency with tax-inclusive pricing applied if configured.

**Response (failure):**

```json
{
    "success": false,
    "message": "No shipping location available"
}
```

> **Tip:** This endpoint is great for showing "Estimated shipping: $5.99" on the basket page before the customer enters checkout.

## Country and Currency Endpoints

### Get Shipping Countries

**`GET /shipping/countries`**

Returns available shipping countries with the customer's current selection.

### Set Shipping Country

**`POST /shipping/country`**

```json
{
    "countryCode": "US",
    "regionCode": "CA"
}
```

Sets the customer's shipping country. Also automatically updates the currency based on country-to-currency mapping and converts basket amounts to the new currency.

### Get Regions

**`GET /shipping/countries/{countryCode}/regions`**

Returns available regions (states/provinces) for a country.

### Get Current Currency

**`GET /currency`**

Returns the customer's current display currency.

### Set Currency

**`POST /currency`**

```json
{
    "currencyCode": "EUR"
}
```

Overrides the customer's display currency and converts basket amounts.

## Bootstrap Context

**`GET /context`**

Returns location, currency, and basket summary in a single call. Ideal for initializing a JavaScript storefront:

```javascript
// On page load, get everything in one call
const ctx = await fetch('/api/merchello/storefront/context').then(r => r.json());

// ctx.location  -- { countryCode: "GB", countryName: "United Kingdom" }
// ctx.currency  -- { currencyCode: "GBP", currencySymbol: "£" }
// ctx.basket    -- { itemCount: 3, formattedTotal: "£45.00" }
```

## Error Handling

All endpoints return consistent error responses:

- **400 Bad Request** -- validation errors or business rule violations (e.g. insufficient stock).
- **404 Not Found** -- product not found.
- **200 OK** -- always includes a `success` boolean and `message` string.

The basket operation endpoints (`add`, `update`, `remove`, `clear`) all return the same response shape:

```json
{
    "success": true|false,
    "message": "Human-readable message",
    "basket": { ... } | null
}
```

## Key Points

- All basket endpoints use cookie-based identification -- no authentication needed.
- The `addons` array in `POST /basket/add` is for non-variant options (add-ons with price adjustments).
- Use `GET /basket?includeAvailability=true` to get availability data bundled with the basket (saves an extra API call).
- Setting the shipping country via `POST /shipping/country` automatically converts basket currency.
- The `GET /context` endpoint is the most efficient way to bootstrap a JavaScript storefront.
