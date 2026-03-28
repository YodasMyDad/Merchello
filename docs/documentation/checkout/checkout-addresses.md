# Checkout Addresses

The checkout address step captures the customer's billing and shipping addresses, email, and marketing opt-in preference. Merchello validates addresses, supports "shipping same as billing", and integrates with address lookup providers for autocomplete.

## Saving Addresses

The main entry point for saving addresses during checkout is the `POST /api/merchello/checkout/addresses` endpoint, which delegates to `ICheckoutService.SaveAddressesAsync`.

### API Endpoint

**`POST /api/merchello/checkout/addresses`**

```json
{
    "email": "customer@example.com",
    "billingAddress": {
        "name": "Jane Smith",
        "company": "",
        "addressOne": "123 High Street",
        "addressTwo": "Flat 4",
        "townCity": "London",
        "countyState": "",
        "regionCode": "",
        "postalCode": "SW1A 1AA",
        "countryCode": "GB",
        "phone": "+447700900000"
    },
    "shippingAddress": {
        "name": "Jane Smith",
        "addressOne": "123 High Street",
        "addressTwo": "Flat 4",
        "townCity": "London",
        "countyState": "",
        "regionCode": "",
        "postalCode": "SW1A 1AA",
        "countryCode": "GB"
    },
    "shippingSameAsBilling": true,
    "acceptsMarketing": false,
    "password": null
}
```

When `shippingSameAsBilling` is `true`, the shipping address in the request is ignored and the billing address is used for both.

### What Happens When You Save Addresses

`SaveAddressesAsync` does more than just store addresses. It:

1. Maps the address DTOs to domain models.
2. Saves addresses to the basket and checkout session.
3. Recalculates basket totals (tax rates depend on shipping address).
4. Refreshes automatic discounts (some discounts are location-dependent).
5. Persists everything to the database.
6. Updates the storefront shipping country cookie.

**Response (success):**

```json
{
    "success": true,
    "message": "Addresses saved successfully.",
    "basket": { ... }
}
```

**Response (validation error):**

```json
{
    "success": false,
    "message": "Validation failed.",
    "errors": {
        "billing.name": "Name is required",
        "shipping.countryCode": "Country is required"
    }
}
```

## Address Validation

The `ICheckoutValidator` validates addresses before they are saved. Validation checks include:

- Required fields: email, name, address line 1, town/city, country code, postal code.
- Email format validation.
- Field-specific error keys with a prefix (e.g. `billing.name`, `shipping.postalCode`).

```csharp
// Service usage
var errors = checkoutValidator.ValidateAddressRequest(request);
if (errors.Count > 0)
{
    // errors is Dictionary<string, string>
    // Key: "billing.name", Value: "Name is required"
}

// Single address validation
var errors = checkoutValidator.ValidateAddress(addressDto, "shipping");

// Email validation
bool isValid = checkoutValidator.IsValidEmail("customer@example.com");
```

> **Note:** Frontend validation is for UX only -- the backend always re-validates. Never trust client-side validation as authoritative.

## Address Field Names

Merchello uses specific field names that must be consistent across C# DTOs, JSON, and JavaScript:

| C# Property | JSON Property | Do NOT Use |
|-------------|--------------|------------|
| `AddressOne` | `addressOne` | `address1`, `line1`, `street` |
| `AddressTwo` | `addressTwo` | `address2`, `line2` |
| `TownCity` | `townCity` | `city`, `locality` |
| `CountyState` | `countyState` | `state`, `county`, `province` |
| `RegionCode` | `regionCode` | `stateCode`, `provinceCode` |

> **Warning:** Using wrong field names is a common mistake. Always use the canonical names from `AddressDto`.

## Country and Region Endpoints

The checkout provides separate country/region endpoints for billing and shipping. Shipping countries are restricted to locations your warehouses can service. Billing countries have no restrictions.

### Shipping Countries (Restricted)

**`GET /api/merchello/checkout/shipping/countries`**

Returns only countries that your warehouses can ship to.

**`GET /api/merchello/checkout/shipping/regions/{countryCode}`**

Returns regions (states/provinces) for a shipping country.

### Billing Countries (All)

**`GET /api/merchello/checkout/billing/countries`**

Returns all countries from the locality catalog -- no shipping restrictions.

**`GET /api/merchello/checkout/billing/regions/{countryCode}`**

Returns all regions for any country.

## Address Lookup Integration

Merchello supports address autocomplete through `IAddressLookupService`. When configured with a provider, the checkout UI shows a typeahead that helps customers find their address quickly.

### Get Configuration

**`GET /api/merchello/checkout/address-lookup/config`**

Returns the client configuration for the address lookup provider (e.g. API key, endpoint URL). The checkout JavaScript uses this to initialise the autocomplete widget.

### Get Suggestions

**`POST /api/merchello/checkout/address-lookup/suggestions`**

```json
{
    "query": "123 High",
    "countryCode": "GB",
    "limit": 5,
    "sessionId": "optional-session-id"
}
```

Returns address suggestions matching the query:

```json
{
    "success": true,
    "suggestions": [
        {
            "id": "provider-specific-id",
            "label": "123 High Street, London",
            "description": "SW1A 1AA"
        }
    ]
}
```

Rate limited to 30 requests per minute per IP.

### Resolve Address

**`POST /api/merchello/checkout/address-lookup/resolve`**

```json
{
    "id": "provider-specific-id",
    "countryCode": "GB",
    "sessionId": "optional-session-id"
}
```

Resolves a suggestion into a full address:

```json
{
    "success": true,
    "address": {
        "company": "",
        "addressOne": "123 High Street",
        "addressTwo": "",
        "townCity": "London",
        "countyState": "",
        "regionCode": "",
        "postalCode": "SW1A 1AA",
        "country": "United Kingdom",
        "countryCode": "GB"
    }
}
```

Rate limited to 20 requests per minute per IP.

## Marketing Opt-In

The `acceptsMarketing` field on the address request is stored in the checkout session:

```csharp
session.AcceptsMarketing = true;
```

This is propagated to the customer record and can be used for email marketing consent tracking.

## Guest Checkout and Account Creation

- **Guest checkout** -- only an email is required. A customer record is auto-created from the email.
- **Account creation** -- if a `password` is provided in the address request, an Umbraco member account is created.
- **Digital products** -- baskets containing digital products require a customer account (no guest checkout).

## Key Points

- Saving addresses triggers a full basket recalculation (tax rates depend on shipping address).
- Use the canonical address field names (`AddressOne`, `TownCity`, `CountyState`, `RegionCode`).
- Shipping countries are restricted to locations your warehouses can service.
- Billing countries include all countries -- no restrictions.
- Address lookup is rate-limited to prevent abuse (30 suggestions/min, 20 resolves/min per IP).
- `shippingSameAsBilling = true` copies the billing address to shipping -- the shipping address in the request is ignored.
