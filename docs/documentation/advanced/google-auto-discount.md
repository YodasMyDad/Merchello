# Google Auto Discount Integration

Merchello integrates with Google's automatic discount feature, which lets Google Shopping display discounted prices directly in search results. When a shopper clicks through from Google, the discount is automatically applied to their checkout session.

## How It Works

Google Shopping can send shoppers to your site with a `pv2` query parameter in the URL. This parameter contains a signed JWT token with discount information (discounted price, discount percentage, currency, offer ID, etc.).

Merchello's `GoogleAutoDiscountMiddleware` intercepts these requests, validates the token, and stores the discount information in an encrypted cookie so it persists through the checkout flow.

### The Flow

```
1. Shopper sees discounted price on Google Shopping
2. Clicks through to your product page
   URL: https://yourstore.com/products/blue-widget?pv2=eyJhbGci...
3. GoogleAutoDiscountMiddleware intercepts the request
4. Validates the pv2 JWT against your configured merchant ID(s)
5. Stores discount info in an encrypted cookie (merchello_gad)
6. Redirects to the same URL without the pv2 parameter
7. On subsequent requests, restores discount from cookie
8. Checkout service applies the discount during basket calculation
```

## Middleware Details

The middleware (`GoogleAutoDiscountMiddleware`) runs on every request and does two things:

### On GET requests with a `pv2` parameter

1. Looks up all product feeds that have an auto-discount merchant ID configured
2. Tries to validate the JWT token against each merchant ID
3. On successful validation, creates a `GoogleAutoDiscountActiveDto` with:
   - `DiscountedPrice` -- the price Google is advertising
   - `DiscountPercentage` -- the discount percentage
   - `DiscountCode` -- the discount code to apply
   - `CurrencyCode` -- the currency of the discounted price
   - `OfferId` -- the Google Shopping offer ID
   - `PageExpiryUtc` -- when the discount should stop showing on the page (30 minutes)
   - `CheckoutExpiryUtc` -- when the discount expires for checkout purposes (48 hours, or JWT expiry, whichever is sooner)
4. Sets the DTO on `HttpContext.Items["MerchelloGoogleAutoDiscount"]` for immediate use
5. Encrypts the DTO and stores it in a secure cookie
6. Redirects to the same URL without the `pv2` parameter (to avoid bookmark/share issues)

### On all other requests

1. Checks for the `merchello_gad` cookie
2. If found, decrypts and deserializes the discount data
3. Checks if the checkout expiry has passed -- if so, deletes the cookie
4. Otherwise, sets the DTO on `HttpContext.Items` for the checkout service to pick up

## Cookie Security

The discount cookie uses multiple layers of protection:

| Property | Value | Why |
|---|---|---|
| `HttpOnly` | `true` | Cannot be read by JavaScript |
| `Secure` | `true` | Only sent over HTTPS |
| `SameSite` | `Lax` | Allows the initial redirect from Google |
| `IsEssential` | `true` | Not affected by cookie consent (it is functional, not tracking) |
| Encryption | ASP.NET Data Protection | Cookie payload is encrypted using `IDataProtectionProvider` |
| Expiry | `CheckoutExpiryUtc` | Cookie auto-expires when the discount window closes |

## Expiry Windows

There are two expiry windows, and the shorter of each window or the JWT expiry is used:

| Window | Duration | Purpose |
|---|---|---|
| Page display | 30 minutes | How long the discounted price shows on product pages |
| Checkout | 48 hours | How long the discount remains valid for checkout |

> **Note:** The JWT token from Google has its own expiry. Merchello uses whichever expires sooner -- the configured window or the JWT expiry.

## Configuration

To enable Google auto discounts, you need:

1. A product feed configured in the Merchello backoffice with a Google Merchant Center merchant ID
2. Auto-discount settings enabled on that product feed
3. Products listed on Google Shopping with automatic discounts configured in Google Merchant Center

The middleware reads merchant IDs from enabled product feeds via `IProductFeedService.GetAutoDiscountMerchantIdsAsync()`. You do not need to configure merchant IDs separately -- they come from your product feed settings.

## Reading the Discount in Your Code

The active discount (if any) is available via `HttpContext.Items`:

```csharp
// In a controller or service with HttpContext access
var discount = httpContext.Items["MerchelloGoogleAutoDiscount"] as GoogleAutoDiscountActiveDto;
if (discount != null)
{
    // A Google auto discount is active
    var discountedPrice = discount.DiscountedPrice;
    var discountCode = discount.DiscountCode;
    var isPageExpired = discount.PageExpiryUtc <= DateTime.UtcNow;
    var isCheckoutExpired = discount.CheckoutExpiryUtc <= DateTime.UtcNow;
}
```

> **Tip:** The page expiry and checkout expiry serve different purposes. You might want to stop showing the discounted price on the product page after 30 minutes (page expiry), but still honor the discount during checkout for up to 48 hours (checkout expiry).

## Error Handling

The middleware is designed to be fault-tolerant. If anything goes wrong (invalid token, decryption failure, service error), it logs a warning and continues the request pipeline normally. A Google auto-discount failure should never prevent a customer from using your site.

## Key Files

| File | Description |
|---|---|
| `Merchello/Middleware/GoogleAutoDiscountMiddleware.cs` | The middleware implementation |
| `Merchello.Core/ProductFeeds/Dtos/GoogleAutoDiscountActiveDto.cs` | DTO stored in HttpContext and cookie |
| `Merchello.Core/ProductFeeds/Services/Interfaces/IGoogleAutoDiscountService.cs` | JWT validation service |
| `Merchello.Core/ProductFeeds/Services/Interfaces/IProductFeedService.cs` | Product feed service (merchant ID lookup) |
