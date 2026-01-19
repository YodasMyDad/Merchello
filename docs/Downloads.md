# Digital Products Feature Implementation Plan

## Overview
Implement complete digital product functionality including file storage, secure download links, delivery methods, and email notifications.

**Requirements:**
- Store files via Umbraco Media Library (existing media picker)
- Two delivery modes: "Instant Download" vs "Email Delivered" (product-level switch)
- Secure masked download URLs tied to customer ID
- Configurable link expiry (days), unlimited downloads during validity
- Digital-only orders auto-complete on successful payment

**Constraints:**
- **No variants for digital products** - UI forces all product options to be add-ons only (IsVariant = false)
- **Use ExtendedData** - Digital settings stored via ProductRoot.ExtendedData with constant keys (no new model properties)

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

### 1.2 ExtendedData Keys (No ProductRoot Changes)
**File:** `src/Merchello.Core/Constants.cs`

Add to `ExtendedDataKeys` class:
```csharp
public const string DigitalDeliveryMethod = "DigitalDeliveryMethod";    // "InstantDownload" or "EmailDelivered"
public const string DigitalFileIds = "DigitalFileIds";                  // JSON array of Umbraco Media IDs
public const string DownloadLinkExpiryDays = "DownloadLinkExpiryDays";  // int as string, 0 = unlimited
```

### 1.3 ExtendedData Helper Extensions
**New File:** `src/Merchello.Core/DigitalProducts/Extensions/ProductRootDigitalExtensions.cs`
```csharp
using System.Text.Json;
using Merchello.Core.DigitalProducts.Models;
using Merchello.Core.Products.Models;

namespace Merchello.Core.DigitalProducts.Extensions;

public static class ProductRootDigitalExtensions
{
    public static DigitalDeliveryMethod GetDigitalDeliveryMethod(this ProductRoot product)
    {
        if (product.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DigitalDeliveryMethod, out var value))
            return Enum.Parse<DigitalDeliveryMethod>(value?.ToString() ?? "InstantDownload");
        return DigitalDeliveryMethod.InstantDownload;
    }

    public static void SetDigitalDeliveryMethod(this ProductRoot product, DigitalDeliveryMethod method)
        => product.ExtendedData[Constants.ExtendedDataKeys.DigitalDeliveryMethod] = method.ToString();

    public static List<string> GetDigitalFileIds(this ProductRoot product)
    {
        if (product.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DigitalFileIds, out var value))
            return JsonSerializer.Deserialize<List<string>>(value?.ToString() ?? "[]") ?? [];
        return [];
    }

    public static void SetDigitalFileIds(this ProductRoot product, List<string> fileIds)
        => product.ExtendedData[Constants.ExtendedDataKeys.DigitalFileIds] = JsonSerializer.Serialize(fileIds);

    public static int GetDownloadLinkExpiryDays(this ProductRoot product)
    {
        if (product.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DownloadLinkExpiryDays, out var value))
            return int.TryParse(value?.ToString(), out var days) ? days : 30;
        return 30;
    }

    public static void SetDownloadLinkExpiryDays(this ProductRoot product, int days)
        => product.ExtendedData[Constants.ExtendedDataKeys.DownloadLinkExpiryDays] = days.ToString();
}
```

### 1.4 New Entity: DownloadLink
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

### 1.5 Database Mapping & Migration
**New File:** `src/Merchello.Core/DigitalProducts/Mapping/DownloadLinkDbMapping.cs`

**Update:** `src/Merchello.Core/Data/Context/MerchelloDbContext.cs`
```csharp
public DbSet<DownloadLink> DownloadLinks => Set<DownloadLink>();
```

**Note:** No ProductRoot table changes needed - digital settings stored in ExtendedData (JSON column).

Update DTOs (convenience properties that map to/from ExtendedData):
- `CreateProductRootDto` / `UpdateProductRootDto` - add digital product fields
- `ProductRootDetailDto` - add digital product fields for reads

```csharp
// Add to CreateProductRootDto and UpdateProductRootDto:
public string? DigitalDeliveryMethod { get; set; }  // "InstantDownload" or "EmailDelivered"
public List<string>? DigitalFileIds { get; set; }
public int? DownloadLinkExpiryDays { get; set; }

// Add to ProductRootDetailDto:
public string? DigitalDeliveryMethod { get; set; }
public List<string>? DigitalFileIds { get; set; }
public int? DownloadLinkExpiryDays { get; set; }
```

**ProductService mapping:** Use extension methods to map DTO fields to/from ExtendedData during create/update/read operations.

Run migration script after changes:
```powershell
.\scripts\add-migration.ps1 -Name AddDownloadLinks
```

### 1.6 Factory
**New File:** `src/Merchello.Core/DigitalProducts/Factories/DownloadLinkFactory.cs`

```csharp
namespace Merchello.Core.DigitalProducts.Factories;

public class DownloadLinkFactory(MerchelloSettings settings)
{
    public DownloadLink Create(CreateDownloadLinkParameters parameters)
    {
        var expiryDays = parameters.ExpiryDays ?? settings.DefaultDownloadLinkExpiryDays;

        return new DownloadLink
        {
            Id = Guid.NewGuid(),
            InvoiceId = parameters.InvoiceId,
            LineItemId = parameters.LineItemId,
            CustomerId = parameters.CustomerId,
            MediaId = parameters.MediaId,
            FileName = parameters.FileName,
            Token = GenerateSecureToken(parameters),
            ExpiresUtc = expiryDays > 0 ? DateTime.UtcNow.AddDays(expiryDays) : null,
            DownloadCount = 0
        };
    }

    private string GenerateSecureToken(CreateDownloadLinkParameters parameters)
    {
        var payload = $"{parameters.InvoiceId}:{parameters.CustomerId}:{parameters.MediaId}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(settings.DownloadTokenSecret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return $"{parameters.InvoiceId:N}-{Convert.ToBase64String(hash).Replace("+", "-").Replace("/", "_").TrimEnd('=')}";
    }
}
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
Task<CrudResult<List<DownloadLink>>> CreateDownloadLinksAsync(CreateDownloadLinksParameters parameters, CancellationToken ct);
Task<CrudResult<DownloadLink>> ValidateDownloadTokenAsync(ValidateDownloadTokenParameters parameters, CancellationToken ct);
Task<CrudResult> RecordDownloadAsync(Guid downloadLinkId, CancellationToken ct);
Task<List<DownloadLink>> GetCustomerDownloadsAsync(GetCustomerDownloadsParameters parameters, CancellationToken ct);
Task<List<DownloadLink>> GetInvoiceDownloadsAsync(Guid invoiceId, CancellationToken ct);
Task<bool> IsDigitalOnlyInvoiceAsync(Guid invoiceId, CancellationToken ct);
Task<CrudResult<List<DownloadLink>>> RegenerateDownloadLinksAsync(RegenerateDownloadLinksParameters parameters, CancellationToken ct);
```

### 2.1.1 DI Registration
Register service in `MerchelloBuilderExtensions.cs`:
```csharp
services.AddScoped<IDigitalProductService, DigitalProductService>();
services.AddSingleton<DownloadLinkFactory>();
```

### 2.1.2 Service Parameters (RORO Pattern)
**New Folder:** `src/Merchello.Core/DigitalProducts/Services/Parameters/`

**New File:** `CreateDownloadLinksParameters.cs`
```csharp
namespace Merchello.Core.DigitalProducts.Services.Parameters;

public class CreateDownloadLinksParameters
{
    public required Guid InvoiceId { get; init; }
}
```

**New File:** `CreateDownloadLinkParameters.cs` (used by factory)
```csharp
namespace Merchello.Core.DigitalProducts.Services.Parameters;

public class CreateDownloadLinkParameters
{
    public required Guid InvoiceId { get; init; }
    public required Guid LineItemId { get; init; }
    public Guid? CustomerId { get; init; }
    public required string MediaId { get; init; }
    public required string FileName { get; init; }
    public int? ExpiryDays { get; init; }
}
```

**New File:** `ValidateDownloadTokenParameters.cs`
```csharp
namespace Merchello.Core.DigitalProducts.Services.Parameters;

public class ValidateDownloadTokenParameters
{
    public required string Token { get; init; }
    public Guid? CustomerId { get; init; }
}
```

**New File:** `RegenerateDownloadLinksParameters.cs`
```csharp
namespace Merchello.Core.DigitalProducts.Services.Parameters;

public class RegenerateDownloadLinksParameters
{
    public required Guid InvoiceId { get; init; }
    public int? NewExpiryDays { get; init; }
}
```

**New File:** `GetCustomerDownloadsParameters.cs`
```csharp
namespace Merchello.Core.DigitalProducts.Services.Parameters;

public class GetCustomerDownloadsParameters
{
    public required Guid CustomerId { get; init; }
    public bool IncludeExpired { get; init; } = false;
}
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

### 4.5 Available Tokens (for Config Expressions)

Tokens are used in email configuration fields (To, From, Subject) and are resolved by the `EmailTokenResolver`:

```
{{invoice.invoiceNumber}}
{{invoice.billingAddress.email}}
{{invoice.billingAddress.name}}
{{store.name}}
{{store.websiteUrl}}
{{store.supportEmail}}
```

**Important:** Tokens are for simple values only. The `DownloadLinks` collection is rendered in templates via Razor `@foreach`, not token substitution. See section 4.7 for the template example.

### 4.6 Webhook Topic
**File:** `src/Merchello.Core/Constants.cs`

Add to `WebhookTopics`:
```csharp
public const string DigitalDelivered = "digital.delivered";
```

**File:** `src/Merchello.Core/Webhooks/Services/WebhookTopicRegistry.cs`

Add using statement:
```csharp
using Merchello.Core.DigitalProducts.Notifications;
```

Add to topic dictionary:
```csharp
[Constants.WebhookTopics.DigitalDelivered] = new WebhookTopic
{
    Topic = Constants.WebhookTopics.DigitalDelivered,
    DisplayName = "Digital Product Delivered",
    Description = "Triggered when digital product download links are ready.",
    Category = "Digital Products",
    NotificationType = typeof(DigitalProductDeliveredNotification)
}
```

**File:** `src/Merchello.Core/Webhooks/Handlers/WebhookNotificationHandler.cs`

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
    => ProcessWebhooksAsync(Constants.WebhookTopics.DigitalDelivered, notification, notification.Invoice.Id, "Invoice", ct);
```

### 4.7 Email Template
**New File:** `src/Merchello.Site/Views/Emails/DigitalProductDelivered.cshtml`

```cshtml
@using Merchello.Core.Email.Models
@using Merchello.Core.DigitalProducts.Notifications
@using Merchello.Email.Extensions
@model EmailModel<DigitalProductDeliveredNotification>

@Html.Mjml().EmailStart(
    "Your Digital Products Are Ready",
    "Download your files now")

@Html.Mjml().Header(Model.Store)

<mj-section>
  <mj-column>
    @Html.Mjml().Heading("Your Downloads Are Ready!")
    @Html.Mjml().Text($"Hi {Model.Notification.Invoice.BillingAddress?.Name ?? "there"},")
    <mj-text>
      Thank you for your purchase! Your digital products are ready for download.
    </mj-text>
  </mj-column>
</mj-section>

@* Download Links Section *@
@if (Model.Notification.DownloadLinks.Count > 0)
{
<mj-section padding="0 20px">
  <mj-column>
    <mj-text font-weight="bold" font-size="16px">Your Downloads</mj-text>
    <mj-table>
      <tr style="border-bottom: 1px solid #ecedee;">
        <th style="padding: 10px 0; text-align: left;">File</th>
        <th style="padding: 10px 0; text-align: right;">Expires</th>
      </tr>
      @foreach (var link in Model.Notification.DownloadLinks)
      {
        var downloadUrl = $"{Model.Store.WebsiteUrl}/api/merchello/downloads/{link.Token}";
        var expiryText = link.ExpiresUtc.HasValue
            ? link.ExpiresUtc.Value.ToString("MMM dd, yyyy")
            : "Never";
        <tr style="border-bottom: 1px solid #ecedee;">
          <td style="padding: 15px 0;">
            <a href="@downloadUrl" style="color: #007bff; text-decoration: none; font-weight: 500;">
              @link.FileName
            </a>
          </td>
          <td style="padding: 15px 0; text-align: right; color: #666;">
            @expiryText
          </td>
        </tr>
      }
    </mj-table>
  </mj-column>
</mj-section>
}

<mj-section>
  <mj-column>
    @Html.Mjml().Spacer(20)
    <mj-text font-size="13px" color="#666">
      <strong>Important:</strong> Your download links
      @if (Model.Notification.DownloadLinks.FirstOrDefault()?.ExpiresUtc != null)
      {
        <span>will expire. Please download your files before the expiry date.</span>
      }
      else
      {
        <span>do not expire, but we recommend downloading and backing up your files.</span>
      }
    </mj-text>
  </mj-column>
</mj-section>

@Html.Mjml().Footer(Model.Store)
@Html.Mjml().EmailEnd()
```

### 4.8 Handler Registration
**File:** `src/Merchello.Core/Startup.cs`

Add after other email/webhook handlers (around line 330):

```csharp
// Digital Products
builder.AddNotificationAsyncHandler<DigitalProductDeliveredNotification, EmailNotificationHandler>();
builder.AddNotificationAsyncHandler<DigitalProductDeliveredNotification, WebhookNotificationHandler>();
```

---

## Phase 5: Frontend UI

### 5.1 Product Options - Force Add-ons for Digital Products
**File:** `src/Merchello/Client/src/products/components/product-options-editor.element.ts` (or equivalent)

When `isDigitalProduct === true`:
- Hide or disable the "Is Variant" toggle/checkbox on product options
- Force `isVariant = false` for all options added to digital products
- Show info message: "Digital products use add-on options only (no variants)"

```typescript
// In product options editor, when adding/editing an option:
if (this.isDigitalProduct) {
  option.isVariant = false;  // Force add-on mode
}
```

### 5.2 Product Workspace - Digital Panel
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

### 5.3 TypeScript Types
**File:** `src/Merchello/Client/src/products/types/product.types.ts`

```typescript
export type DigitalDeliveryMethod = 'InstantDownload' | 'EmailDelivered';

// Add to ProductRootDetailDto & UpdateProductRootDto:
digitalDeliveryMethod?: DigitalDeliveryMethod;
digitalFileIds?: string[];
downloadLinkExpiryDays?: number;
```

### 5.4 Order Confirmation
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

### 5.5 Admin Order View - Downloads Tab
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

### Module Structure
```
DigitalProducts/
├── Dtos/
│   └── DownloadLinkDto.cs
├── Extensions/
│   └── ProductRootDigitalExtensions.cs
├── Factories/
│   └── DownloadLinkFactory.cs
├── Handlers/
│   └── DigitalProductPaymentHandler.cs
├── Mapping/
│   └── DownloadLinkDbMapping.cs
├── Models/
│   ├── DigitalDeliveryMethod.cs
│   └── DownloadLink.cs
├── Notifications/
│   └── DigitalProductDeliveredNotification.cs
└── Services/
    ├── Interfaces/
    │   └── IDigitalProductService.cs
    ├── Parameters/
    │   ├── CreateDownloadLinksParameters.cs
    │   ├── CreateDownloadLinkParameters.cs
    │   ├── GetCustomerDownloadsParameters.cs
    │   ├── RegenerateDownloadLinksParameters.cs
    │   └── ValidateDownloadTokenParameters.cs
    └── DigitalProductService.cs
```

### New Files
| File | Purpose |
|------|---------|
| `DigitalProducts/Models/DigitalDeliveryMethod.cs` | Delivery method enum |
| `DigitalProducts/Models/DownloadLink.cs` | Download link entity |
| `DigitalProducts/Extensions/ProductRootDigitalExtensions.cs` | ExtendedData helper methods |
| `DigitalProducts/Dtos/DownloadLinkDto.cs` | API DTO |
| `DigitalProducts/Factories/DownloadLinkFactory.cs` | Factory for creating download links |
| `DigitalProducts/Mapping/DownloadLinkDbMapping.cs` | EF Core mapping |
| `DigitalProducts/Services/Interfaces/IDigitalProductService.cs` | Service interface |
| `DigitalProducts/Services/DigitalProductService.cs` | Service implementation |
| `DigitalProducts/Services/Parameters/CreateDownloadLinksParameters.cs` | RORO parameter object |
| `DigitalProducts/Services/Parameters/CreateDownloadLinkParameters.cs` | Factory parameter object |
| `DigitalProducts/Services/Parameters/ValidateDownloadTokenParameters.cs` | RORO parameter object |
| `DigitalProducts/Services/Parameters/RegenerateDownloadLinksParameters.cs` | RORO parameter object |
| `DigitalProducts/Services/Parameters/GetCustomerDownloadsParameters.cs` | RORO parameter object |
| `DigitalProducts/Handlers/DigitalProductPaymentHandler.cs` | Payment notification handler |
| `DigitalProducts/Notifications/DigitalProductDeliveredNotification.cs` | Email/webhook notification |
| `Controllers/DownloadsController.cs` | Download API endpoints |
| `Client/src/orders/components/order-downloads.element.ts` | Admin downloads view |
| `Views/Emails/DigitalProductDelivered.cshtml` | Email template for digital delivery |

### Modified Files
| File | Changes |
|------|---------|
| `Products/Dtos/CreateProductRootDto.cs` | Add digital convenience fields (map to ExtendedData) |
| `Products/Dtos/UpdateProductRootDto.cs` | Add digital convenience fields (map to ExtendedData) |
| `Products/Dtos/ProductRootDetailDto.cs` | Add digital convenience fields (map from ExtendedData) |
| `Products/Services/ProductService.cs` | Map DTO digital fields to/from ExtendedData |
| `Data/Context/MerchelloDbContext.cs` | Add DownloadLinks DbSet |
| `Constants.cs` | Add ExtendedDataKeys, EmailTopics, WebhookTopics |
| `Email/Services/EmailTopicRegistry.cs` | Register digital delivery topic |
| `Email/Handlers/EmailNotificationHandler.cs` | Handle digital notification |
| `Webhooks/Services/WebhookTopicRegistry.cs` | Register digital delivery topic |
| `Webhooks/Handlers/WebhookNotificationHandler.cs` | Handle digital notification |
| `Shared/Models/MerchelloSettings.cs` | Add config options |
| `Composing/MerchelloBuilderExtensions.cs` | Register IDigitalProductService, DownloadLinkFactory |
| `Startup.cs` | Register notification handlers for email and webhooks |
| `Client/src/products/components/product-detail.element.ts` | Digital product panel |
| `Client/src/products/components/product-options-*.element.ts` | Force add-ons only for digital products |
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
3. **Add product options to digital product, verify IsVariant toggle is hidden/disabled and forced to false (add-on only)**
4. Purchase digital product, verify links on confirmation page
5. Admin view: verify download history displays correctly

### Email Testing
1. In Merchello backoffice, navigate to Email Builder
2. Create new email configuration:
   - **Topic:** `digital.delivered`
   - **Template:** `DigitalProductDelivered.cshtml`
   - **To:** `{{invoice.billingAddress.email}}`
   - **Subject:** `Your downloads for Order #{{invoice.invoiceNumber}} are ready`
   - **From:** (use store default or custom)
3. Create a digital product with "Email Delivered" delivery method
4. Purchase the digital product
5. Verify email received with:
   - Correct recipient
   - Download links rendered as clickable table rows
   - Expiry dates displayed (or "Never" for non-expiring)
6. Click download link in email and verify file downloads correctly
7. Test expired link returns appropriate error

---

## Security Checklist
- [ ] Download token uses HMAC-SHA256 with strong secret
- [ ] Constant-time comparison for token validation
- [ ] Customer ownership verified for authenticated users
- [ ] Rate limiting on download endpoint
- [ ] Media files not directly exposed (proxied through controller)
- [ ] Token expiry enforced server-side
