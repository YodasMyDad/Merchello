# Downloads API Reference

The Downloads API provides secure file download endpoints for digital products. Customers use these endpoints to access purchased digital files using HMAC-signed download tokens.

**Base URL:** `/api/merchello/downloads`

**Authentication:** All endpoints require Umbraco member authentication (`[Authorize]`). Customers can only access their own downloads.

---

## How Digital Downloads Work

When a customer purchases a digital product, Merchello generates secure download links with HMAC-signed tokens. Each link has:

- An **expiry date** (configurable per product via `DownloadLinkExpiryDays`)
- A **maximum download count** (configurable per product via `MaxDownloadsPerLink`)
- A **customer ownership check** (the token is bound to the customer who purchased the product)

The download flow:

1. Customer visits their account or order confirmation page
2. Frontend calls `GET /customer` or `GET /invoice/{invoiceId}` to get download links
3. Customer clicks a download link, which calls `GET /{token}`
4. Merchello validates the token, checks expiry/limits, streams the file, and records the download

---

## Endpoints

### GET `/{token}`

Download a file using a secure token.

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | string | The HMAC-signed download token |

**Rate limiting:** This endpoint uses the `downloads` rate limiting policy to prevent abuse.

**Security checks performed:**

1. Customer must be authenticated
2. Token is validated via `ValidateDownloadTokenAsync` (HMAC signature, expiry, customer ownership)
3. Download count is checked against the maximum
4. File path is validated to prevent path traversal attacks (must stay within `wwwroot`)

**Response (200):** The file is streamed with the appropriate content type and filename.

**Supported content types:**

| Extension | Content Type |
|-----------|-------------|
| `.pdf` | `application/pdf` |
| `.zip` | `application/zip` |
| `.mp3` | `audio/mpeg` |
| `.mp4` | `video/mp4` |
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.png` | `image/png` |
| `.gif` | `image/gif` |
| `.doc` | `application/msword` |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `.xls` | `application/vnd.ms-excel` |
| `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `.epub` | `application/epub+zip` |
| `.mobi` | `application/x-mobipocket-ebook` |
| Other | `application/octet-stream` |

**Error responses:**

| Status | Reason |
|--------|--------|
| `401` | Customer not authenticated |
| `403` | Download limit reached |
| `404` | Invalid/expired token, or file not found on disk |
| `400` | Other validation failure |

---

### GET `/customer`

Get all download links for the current authenticated customer.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeExpired` | bool | `false` | Include expired download links |

**Response (200):**

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "fileName": "ebook-guide.pdf",
    "downloadUrl": "/api/merchello/downloads/abc123token...",
    "expiresUtc": "2026-04-28T00:00:00Z",
    "productName": "",
    "maxDownloads": 5,
    "downloadCount": 2,
    "remainingDownloads": 3,
    "lastDownloadUtc": "2026-03-28T14:30:00Z",
    "isExpired": false,
    "isDownloadLimitReached": false
  }
]
```

**Error responses:**

| Status | Reason |
|--------|--------|
| `401` | Customer not authenticated |
| `404` | Customer not found |

> **Tip:** Use `includeExpired=true` to show customers their full download history, even for links that have expired. You can then display a "Contact support" message next to expired downloads.

---

### GET `/invoice/{invoiceId}`

Get all download links for a specific invoice. This is typically shown on the order confirmation page or order detail page.

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `invoiceId` | Guid | The invoice ID |

**Response (200):** Same format as the customer downloads endpoint.

**Security:** The endpoint verifies that the authenticated customer owns the invoice. If the invoice belongs to a different customer, a `403 Forbidden` is returned.

**Error responses:**

| Status | Reason |
|--------|--------|
| `401` | Customer not authenticated |
| `403` | Invoice belongs to a different customer |
| `404` | Customer or invoice not found |

---

## Frontend Integration Example

Here is a simple example of how you might display downloads on a customer account page:

```javascript
// Fetch customer downloads
const response = await fetch('/api/merchello/downloads/customer', {
  credentials: 'include' // important: send auth cookies
});
const downloads = await response.json();

downloads.forEach(download => {
  if (download.isExpired) {
    // Show "Link expired" message
  } else if (download.isDownloadLimitReached) {
    // Show "Download limit reached" message
  } else {
    // Show download button linking to download.downloadUrl
    // Display: "Downloaded 2 of 5 times"
  }
});
```

> **Warning:** Digital products require a customer account -- guest checkout is not supported for digital products. Make sure your checkout flow requires sign-in or account creation when the basket contains digital items.
