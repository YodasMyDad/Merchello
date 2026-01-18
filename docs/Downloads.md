# Digital Products Feature Implementation Plan

## Overview
Implement complete digital product functionality including file storage, secure download links, delivery methods, and email notifications.

**Requirements:**
- Store files via Umbraco Media Library (existing media picker)
- Two delivery modes: "Instant Download" vs "Email Delivered" (product-level switch)
- Secure masked download URLs tied to customer ID
- Configurable link expiry (days), unlimited downloads during validity
- Digital-only orders auto-complete on successful payment

---

## Phase 1: Data Model

### 1.1 New Enum
**New File:** `src/Merchello.Core/DigitalProducts/Models/DigitalDeliveryMethod.cs`
```csharp
namespace Merchello.Core.DigitalProducts.Models;

public enum DigitalDeliveryMethod
{
    InstantDownload = 0,  // Links on order confirmation page
    EmailDelivered = 1    // Links sent via email only
}
```

### 1.2 Extend ProductRoot
**File:** `src/Merchello.Core/Products/Models/ProductRoot.cs`

Add properties:
```csharp
public DigitalDeliveryMethod DigitalDeliveryMethod { get; set; } = DigitalDeliveryMethod.InstantDownload;
public List<string> DigitalFileIds { get; set; } = [];  // Umbraco Media IDs
public int DownloadLinkExpiryDays { get; set; } = 30;   // 0 = unlimited
```

### 1.3 New Entity: DownloadLink
**New File:** `src/Merchello.Core/DigitalProducts/Models/DownloadLink.cs`

```csharp
namespace Merchello.Core.DigitalProducts.Models;

public class DownloadLink
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public Guid LineItemId { get; set; }
    public Guid? CustomerId { get; set; }  // Nullable for guest checkouts
    public string MediaId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;  // HMAC-signed secure token
    public DateTime? ExpiresUtc { get; set; }
    public int DownloadCount { get; set; }
    public DateTime? LastDownloadUtc { get; set; }
    public DateTime DateCreated { get; set; }  // Set by DB mapping
    public bool IsValid => !ExpiresUtc.HasValue || ExpiresUtc > DateTime.UtcNow;
}
```

### 1.4 Database Mapping & Migration
**New File:** `src/Merchello.Core/DigitalProducts/Mapping/DownloadLinkDbMapping.cs`

**Update:** `src/Merchello.Core/Data/Context/MerchelloDbContext.cs`
```csharp
public DbSet<DownloadLink> DownloadLinks => Set<DownloadLink>();
```

Update DTOs:
- `CreateProductRootDto` / `UpdateProductRootDto` - add digital product fields
- `ProductRootDetailDto` - add digital product fields for reads

Run migration script after changes:
```powershell
.\scripts\add-migration.ps1 -Name AddDigitalProducts
```

---

## Phase 2: Backend Services

### 2.1 Digital Product Service
**New Folder:** `src/Merchello.Core/DigitalProducts/`

**New Files:**
- `Services/Interfaces/IDigitalProductService.cs`
- `Services/DigitalProductService.cs`

Key methods:
```csharp
Task<List<DownloadLink>> CreateDownloadLinksAsync(Guid invoiceId, CancellationToken ct);
Task<DownloadLink?> ValidateDownloadTokenAsync(string token, Guid? customerId, CancellationToken ct);
Task RecordDownloadAsync(Guid downloadLinkId, CancellationToken ct);
Task<List<DownloadLink>> GetCustomerDownloadsAsync(Guid customerId, CancellationToken ct);
Task<List<DownloadLink>> GetInvoiceDownloadsAsync(Guid invoiceId, CancellationToken ct);
Task<bool> IsDigitalOnlyInvoiceAsync(Guid invoiceId, CancellationToken ct);
Task<List<DownloadLink>> RegenerateDownloadLinksAsync(Guid invoiceId, CancellationToken ct);
```

### 2.1.1 DI Registration
Register service in `MerchelloBuilderExtensions.cs`:
```csharp
services.AddScoped<IDigitalProductService, DigitalProductService>();
```

### 2.2 Secure Token Generation
Token format: `{linkId:N}-{hmacSignature}`

- Signature: HMAC-SHA256(`{linkId}:{customerId}:{mediaId}`, secretKey)
- URL-safe Base64 encoding
- Constant-time comparison for validation

### 2.3 Download Controller
**New File:** `src/Merchello/Controllers/DownloadsController.cs`

```csharp
[ApiController]
[Route("api/merchello/downloads")]
public class DownloadsController
{
    [HttpGet("{token}")]
    public async Task<IActionResult> Download(string token);

    [HttpGet("customer")]
    [Authorize]
    public async Task<IActionResult> GetCustomerDownloads();

    [HttpGet("invoice/{invoiceId}")]
    public async Task<IActionResult> GetInvoiceDownloads(Guid invoiceId);
}
```

Download endpoint:
1. Parse token and extract link ID
2. Load DownloadLink from DB
3. Validate HMAC signature
4. Check expiry
5. Verify customer ownership (if authenticated)
6. Increment download count
7. Stream file from Umbraco Media Library

---

## Phase 3: Order Flow Integration

### 3.1 Payment Handler for Digital Orders
**New File:** `src/Merchello.Core/DigitalProducts/Handlers/DigitalProductPaymentHandler.cs`

```csharp
[NotificationHandlerPriority(1500)]  // After payment recorded, before external sync
public class DigitalProductPaymentHandler : INotificationAsyncHandler<PaymentCreatedNotification>
{
    public async Task HandleAsync(PaymentCreatedNotification notification, CancellationToken ct)
    {
        // 1. Check if payment succeeded
        // 2. Get invoice and check for digital products
        // 3. Create download links for digital items
        // 4. If digital-only order: auto-complete all orders
        // 5. Publish DigitalProductDeliveredNotification
    }
}
```

### 3.2 Auto-Complete Logic
For digital-only invoices (no physical products):
- All orders transition to `OrderStatus.Completed`
- Set `CompletedDate = DateTime.UtcNow`
- No shipments created (as before)

For mixed orders:
- Physical items: normal fulfillment flow
- Digital items: links created immediately, accessible regardless of shipment status

### 3.3 Constants
**File:** `src/Merchello.Core/Constants.cs`

Add to `ExtendedDataKeys`:
```csharp
public const string DigitalDeliveryMethod = "DigitalDeliveryMethod";
public const string DigitalFileIds = "DigitalFileIds";
```

---

## Phase 4: Email Notifications

### 4.1 New Notification
**New File:** `src/Merchello.Core/DigitalProducts/Notifications/DigitalProductDeliveredNotification.cs`

```csharp
using Merchello.Core.Accounting.Models;
using Merchello.Core.DigitalProducts.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.DigitalProducts.Notifications;

/// <summary>
/// Published when digital product download links are ready for delivery.
/// </summary>
public class DigitalProductDeliveredNotification(
    Invoice invoice,
    List<DownloadLink> downloadLinks) : MerchelloNotification
{
    /// <summary>
    /// Gets the invoice containing digital products.
    /// </summary>
    public Invoice Invoice { get; } = invoice;

    /// <summary>
    /// Gets the download links generated for the digital products.
    /// </summary>
    public List<DownloadLink> DownloadLinks { get; } = downloadLinks;
}
```

### 4.2 Email Topic
**File:** `src/Merchello.Core/Constants.cs`

Add to `EmailTopics`:
```csharp
public const string DigitalProductDelivered = "digital.delivered";
```

### 4.3 Register Topic
**File:** `src/Merchello.Core/Email/Services/EmailTopicRegistry.cs`

Add using statement:
```csharp
using Merchello.Core.DigitalProducts.Notifications;
```

Add to topic dictionary:
```csharp
[Constants.EmailTopics.DigitalProductDelivered] = new EmailTopic
{
    Topic = Constants.EmailTopics.DigitalProductDelivered,
    DisplayName = "Digital Product Delivered",
    Description = "Triggered when digital product download links are ready.",
    Category = "Digital Products",
    NotificationType = typeof(DigitalProductDeliveredNotification)
}
```

### 4.4 Email Handler
**File:** `src/Merchello.Core/Email/Handlers/EmailNotificationHandler.cs`

Add using statement:
```csharp
using Merchello.Core.DigitalProducts.Notifications;
```

Add the notification interface to class declaration:
```csharp
INotificationAsyncHandler<DigitalProductDeliveredNotification>
```

Add handler method:
```csharp
public Task HandleAsync(DigitalProductDeliveredNotification notification, CancellationToken ct)
    => ProcessEmailsAsync(Constants.EmailTopics.DigitalProductDelivered, notification, notification.Invoice.Id, "Invoice", ct);
```

### 4.5 Available Tokens
- `{{invoice.invoiceNumber}}`
- `{{invoice.billingAddress.email}}`
- `{{invoice.billingAddress.firstName}}`
- `{{downloadLinks}}` (enumerable for iteration in template)
- `{{store.name}}`, `{{store.websiteUrl}}`

---

## Phase 5: Frontend UI

### 5.1 Product Workspace - Digital Panel
**File:** `src/Merchello/Client/src/products/components/product-detail.element.ts`

When `isDigitalProduct` is checked, show new panel:

```html
<uui-box headline="Digital Product Settings">
  <!-- Delivery Method -->
  <umb-property-layout label="Delivery Method"
    description="How customers receive their digital files">
    <uui-select>
      <option value="InstantDownload">Instant Download</option>
      <option value="EmailDelivered">Email Delivered</option>
    </uui-select>
  </umb-property-layout>

  <!-- Media Picker -->
  <umb-property-layout label="Digital Files"
    description="Select files from the media library">
    <umb-input-media multiple />
  </umb-property-layout>

  <!-- Expiry Days -->
  <umb-property-layout label="Link Expiry (Days)"
    description="0 = links never expire">
    <uui-input type="number" min="0" value="30" />
  </umb-property-layout>
</uui-box>
```

### 5.2 TypeScript Types
**File:** `src/Merchello/Client/src/products/types/product.types.ts`

```typescript
export type DigitalDeliveryMethod = 'InstantDownload' | 'EmailDelivered';

// Add to ProductRootDetailDto & UpdateProductRootDto:
digitalDeliveryMethod?: DigitalDeliveryMethod;
digitalFileIds?: string[];
downloadLinkExpiryDays?: number;
```

### 5.3 Order Confirmation
For "Instant Download" products, display download links on confirmation page.

**New DTO:** `src/Merchello.Core/DigitalProducts/Dtos/DownloadLinkDto.cs`
```csharp
public class DownloadLinkDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string DownloadUrl { get; set; } = string.Empty;
    public DateTime? ExpiresUtc { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int DownloadCount { get; set; }
    public DateTime? LastDownloadUtc { get; set; }
    public bool IsExpired { get; set; }
}
```

Add `DownloadLinks` property to checkout completion response.

### 5.4 Admin Order View - Downloads Tab
**New File:** `src/Merchello/Client/src/orders/components/order-downloads.element.ts`

Display for each download link:
- Product name, File name
- Download count
- Last download date
- Expiry date and status
- "Regenerate Link" button (resets expiry)

---

## Phase 6: Configuration

### 6.1 MerchelloSettings
**File:** `src/Merchello.Core/Shared/Models/MerchelloSettings.cs`

```csharp
public string DownloadTokenSecret { get; set; } = "";  // REQUIRED: strong random key
public int DefaultDownloadLinkExpiryDays { get; set; } = 30;
```

### 6.2 appsettings.json Example
```json
{
  "Merchello": {
    "DownloadTokenSecret": "your-strong-secret-key-here-32chars",
    "DefaultDownloadLinkExpiryDays": 30
  }
}
```

---

## File Summary

### New Files
| File | Purpose |
|------|---------|
| `DigitalProducts/Models/DigitalDeliveryMethod.cs` | Delivery method enum |
| `DigitalProducts/Models/DownloadLink.cs` | Download link entity |
| `DigitalProducts/Dtos/DownloadLinkDto.cs` | API DTO |
| `DigitalProducts/Mapping/DownloadLinkDbMapping.cs` | EF Core mapping |
| `DigitalProducts/Services/Interfaces/IDigitalProductService.cs` | Service interface |
| `DigitalProducts/Services/DigitalProductService.cs` | Service implementation |
| `DigitalProducts/Handlers/DigitalProductPaymentHandler.cs` | Payment notification handler |
| `DigitalProducts/Notifications/DigitalProductDeliveredNotification.cs` | Email notification |
| `Controllers/DownloadsController.cs` | Download API endpoints |
| `Client/src/orders/components/order-downloads.element.ts` | Admin downloads view |

### Modified Files
| File | Changes |
|------|---------|
| `Products/Models/ProductRoot.cs` | Add digital product fields |
| `Products/Dtos/CreateProductRootDto.cs` | Add digital fields |
| `Products/Dtos/UpdateProductRootDto.cs` | Add digital fields |
| `Products/Dtos/ProductRootDetailDto.cs` | Add digital fields |
| `Products/Mapping/ProductRootDbMapping.cs` | Map new columns |
| `Data/Context/MerchelloDbContext.cs` | Add DownloadLinks DbSet |
| `Constants.cs` | Add ExtendedDataKeys, EmailTopics |
| `Email/Services/EmailTopicRegistry.cs` | Register digital delivery topic |
| `Email/Handlers/EmailNotificationHandler.cs` | Handle digital notification |
| `Shared/Models/MerchelloSettings.cs` | Add config options |
| `Composing/MerchelloBuilderExtensions.cs` | Register IDigitalProductService |
| `Client/src/products/components/product-detail.element.ts` | Digital product panel |
| `Client/src/products/types/product.types.ts` | TypeScript types |

---

## Verification

### Backend Testing
1. Create a digital product with files via API
2. Purchase the product, verify payment triggers link creation
3. Verify download endpoint streams file correctly
4. Verify token validation rejects tampered/expired tokens
5. Verify digital-only orders auto-complete

### Frontend Testing
1. Toggle "Digital Product" checkbox, verify panel appears
2. Select files via media picker, verify saved
3. Purchase digital product, verify links on confirmation page
4. Admin view: verify download history displays correctly

### Email Testing
1. Configure email for `digital.delivered` topic
2. Purchase with "Email Delivered" method
3. Verify email received with download links
4. Verify token in email link works

---

## Security Checklist
- [ ] Download token uses HMAC-SHA256 with strong secret
- [ ] Constant-time comparison for token validation
- [ ] Customer ownership verified for authenticated users
- [ ] Rate limiting on download endpoint
- [ ] Media files not directly exposed (proxied through controller)
- [ ] Token expiry enforced server-side
