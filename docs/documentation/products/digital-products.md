# Digital Products

Digital products let you sell downloadable items like software, ebooks, music, or any file stored in the Umbraco Media Library. Merchello handles secure download links, expiry, download limits, and automatic order completion for digital-only purchases.

> **Invariant:** All digital settings live in `ProductRoot.ExtendedData` under constant keys -- do not add model properties for them. Digital products require a customer account (no guest checkout) and cannot use variant options (`IsVariant = true`); use add-on options with `PriceAdjustment`/`CostAdjustment`/`SkuSuffix` instead.

## How Digital Products Work

A digital product is a regular product root with `IsDigitalProduct = true`. All digital-specific settings are stored in `ProductRoot.ExtendedData` using constant keys accessed via [ProductRootDigitalExtensions.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/DigitalProducts/Extensions/ProductRootDigitalExtensions.cs) -- there are no extra database columns. Service contract: [IDigitalProductService.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/DigitalProducts/Services/Interfaces/IDigitalProductService.cs).

### Key Constraints

- **Customer account required** -- digital products cannot be purchased via guest checkout. Customers must create an account.
- **No variant options** -- digital products cannot use variant options (`IsVariant = true`). They can only use add-on options (`IsVariant = false`) with price/cost adjustments.
- **Digital-only invoices auto-complete** -- when an invoice contains only digital products and payment succeeds, the order is automatically marked as complete (no fulfilment needed).

## Delivery Methods

Each digital product has a delivery method that controls how download links are presented to the customer:

```csharp
public enum DigitalDeliveryMethod
{
    InstantDownload = 0,  // Links shown on order confirmation page
    EmailDelivered = 1    // Links sent via email only
}
```

- **InstantDownload** -- the customer sees download links immediately on the order confirmation page, and also receives them by email.
- **EmailDelivered** -- download links are only sent via email. Useful for license keys, time-sensitive content, or when you want controlled delivery.

## Configuring a Digital Product

Digital settings are stored in `ProductRoot.ExtendedData` and accessed via extension methods from `ProductRootDigitalExtensions`:

```csharp
using Merchello.Core.DigitalProducts.Extensions;

// Set delivery method
productRoot.SetDigitalDeliveryMethod(DigitalDeliveryMethod.InstantDownload);

// Attach files (Umbraco Media IDs)
productRoot.SetDigitalFileIds(["media-guid-1", "media-guid-2"]);

// Set download link expiry (0 = unlimited)
productRoot.SetDownloadLinkExpiryDays(30);  // Links valid for 30 days

// Set max downloads per link (0 = unlimited)
productRoot.SetMaxDownloadsPerLink(5);  // Each link can be downloaded 5 times
```

### Reading Digital Settings

```csharp
var method = productRoot.GetDigitalDeliveryMethod();     // DigitalDeliveryMethod
var fileIds = productRoot.GetDigitalFileIds();            // List<string> of media IDs
var expiryDays = productRoot.GetDownloadLinkExpiryDays(); // int (default: 30)
var maxDownloads = productRoot.GetMaxDownloadsPerLink();  // int (default: 0 = unlimited)
var hasFiles = productRoot.HasDigitalFiles();             // bool
```

### ExtendedData Keys

The constant keys used in `ProductRoot.ExtendedData`:

| Key | Value | Default |
|-----|-------|---------|
| `DigitalDeliveryMethod` | `"InstantDownload"` or `"EmailDelivered"` | `InstantDownload` |
| `DigitalFileIds` | JSON array of Umbraco Media IDs | `[]` |
| `DownloadLinkExpiryDays` | Integer as string, `0` = unlimited | `30` |
| `MaxDownloadsPerLink` | Integer as string, `0` = unlimited | `0` |

## Download Links

When a customer pays for a digital product, `IDigitalProductService` creates download links for each file. Each link has:

- A unique **HMAC-signed token** for security.
- An optional **expiry date** based on the product's `DownloadLinkExpiryDays`.
- An optional **download limit** based on `MaxDownloadsPerLink`.
- A **download count** that increments with each download.

### Service API

```csharp
public interface IDigitalProductService
{
    // Create links for all digital products in an invoice (idempotent)
    Task<CrudResult<List<DownloadLink>>> CreateDownloadLinksAsync(
        CreateDownloadLinksParameters parameters, CancellationToken ct);

    // Validate a download token
    Task<CrudResult<DownloadLink>> ValidateDownloadTokenAsync(
        ValidateDownloadTokenParameters parameters, CancellationToken ct);

    // Record a download (increments count)
    Task<CrudResult<bool>> RecordDownloadAsync(Guid downloadLinkId, CancellationToken ct);

    // Get all downloads for a customer
    Task<List<DownloadLink>> GetCustomerDownloadsAsync(
        GetCustomerDownloadsParameters parameters, CancellationToken ct);

    // Get downloads for a specific invoice
    Task<List<DownloadLink>> GetInvoiceDownloadsAsync(Guid invoiceId, CancellationToken ct);

    // Check if invoice is digital-only
    Task<bool> IsDigitalOnlyInvoiceAsync(Guid invoiceId, CancellationToken ct);

    // Regenerate links (invalidates old ones)
    Task<CrudResult<List<DownloadLink>>> RegenerateDownloadLinksAsync(
        RegenerateDownloadLinksParameters parameters, CancellationToken ct);
}
```

> **Note:** `CreateDownloadLinksAsync` is idempotent -- if links already exist for an invoice, it returns the existing ones rather than creating duplicates.

## Download Security

Downloads go through the `DownloadsController` at `GET /api/merchello/downloads/{token}`. Security is enforced at multiple layers:

1. **Authentication required** -- the endpoint requires `[Authorize]`. Only logged-in customers can download.
2. **Customer ownership** -- the token is validated against the requesting customer's ID, preventing one customer from using another's download link.
3. **HMAC-signed tokens** -- download URLs use cryptographically signed tokens, not guessable IDs.
4. **Constant-time validation** -- token comparison uses constant-time algorithms to prevent timing attacks.
5. **Rate limiting** -- the endpoint uses `[EnableRateLimiting("downloads")]` to prevent abuse.
6. **Path traversal protection** -- file paths are validated to stay within wwwroot.
7. **Expiry and download limits** -- links are checked for time expiry and download count limits.

## Customer Download Endpoints

The `DownloadsController` provides two endpoints for customers to view their downloads:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/merchello/downloads/customer` | All downloads for current customer |
| `GET` | `/api/merchello/downloads/invoice/{invoiceId}` | Downloads for a specific invoice |

Both require authentication and validate customer ownership. The invoice endpoint additionally verifies that the customer owns the invoice.

The response includes:

```json
{
    "id": "guid",
    "fileName": "ebook.pdf",
    "downloadUrl": "/api/merchello/downloads/{token}",
    "expiresUtc": "2026-04-27T00:00:00Z",
    "maxDownloads": 5,
    "downloadCount": 2,
    "remainingDownloads": 3,
    "lastDownloadUtc": "2026-03-28T10:30:00Z",
    "isExpired": false,
    "isDownloadLimitReached": false
}
```

## Automatic Order Completion

When a digital-only invoice (no physical products) receives a successful payment, the `DigitalProductPaymentHandler` notification handler automatically:

1. Creates download links for all digital files in the invoice.
2. Marks the invoice/order as complete (no shipping or fulfilment needed).
3. Publishes a `DigitalProductDeliveredNotification` so you can hook in email delivery or other post-processing.

## Supported File Types

The download controller maps file extensions to content types automatically:

| Extension | Content Type |
|-----------|-------------|
| `.pdf` | `application/pdf` |
| `.zip` | `application/zip` |
| `.mp3` | `audio/mpeg` |
| `.mp4` | `video/mp4` |
| `.jpg`/`.jpeg` | `image/jpeg` |
| `.png` | `image/png` |
| `.epub` | `application/epub+zip` |
| `.mobi` | `application/x-mobipocket-ebook` |
| `.doc`/`.docx` | MS Word |
| `.xls`/`.xlsx` | MS Excel |
| Other | `application/octet-stream` |

## Key Points

- Digital product settings live in `ProductRoot.ExtendedData` -- no extra database tables needed for configuration.
- Download links are stored in the `merchelloDownloadLinks` table.
- Files are stored in Umbraco's Media Library and served through a secure controller.
- Link creation is idempotent; regeneration explicitly invalidates old links.
- The `DownloadUrl` on `DownloadLink` is built at runtime using `MerchelloSettings.WebsiteUrl` to ensure correct URLs behind reverse proxies.
