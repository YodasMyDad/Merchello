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

### 1.0 Add ExtendedData to ProductRoot (Prerequisite)

ProductRoot needs an `ExtendedData` dictionary (matching the pattern used by `Invoice`, `LineItem`, `Warehouse`, etc.) to store digital product settings via constant keys.

**File:** `src/Merchello.Core/Products/Models/ProductRoot.cs`

Add property:
```csharp
/// <summary>
/// Extended data dictionary for storing additional product metadata.
/// Used for digital product settings, custom attributes, plugin data, etc.
/// Keys should use Constants.ExtendedDataKeys for consistency.
/// </summary>
public Dictionary<string, object> ExtendedData { get; set; } = [];
```

**File:** `src/Merchello.Core/Products/Mapping/ProductRootDbMapping.cs`

Add JSON column mapping using the existing extension method:
```csharp
builder.Property(x => x.ExtendedData).ToJsonConversion(3000);
```

**Migration:** Run after adding property:
```powershell
.\scripts\add-migration.ps1 -Name AddProductRootExtendedData
```

---

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
public const string MaxDownloadsPerLink = "MaxDownloadsPerLink";        // int as string, 0 = unlimited
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

    public static int GetMaxDownloadsPerLink(this ProductRoot product)
    {
        if (product.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.MaxDownloadsPerLink, out var value))
            return int.TryParse(value?.ToString(), out var max) ? max : 0;
        return 0;  // 0 = unlimited
    }

    public static void SetMaxDownloadsPerLink(this ProductRoot product, int maxDownloads)
        => product.ExtendedData[Constants.ExtendedDataKeys.MaxDownloadsPerLink] = maxDownloads.ToString();
}
```

### 1.4 New Entity: DownloadLink
**New File:** `src/Merchello.Core/DigitalProducts/Models/DownloadLink.cs`

```csharp
using System.ComponentModel.DataAnnotations.Schema;

namespace Merchello.Core.DigitalProducts.Models;

public class DownloadLink
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public Guid LineItemId { get; set; }
    public Guid CustomerId { get; set; }  // Required - digital products require account
    public string MediaId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;  // HMAC-signed secure token
    public DateTime? ExpiresUtc { get; set; }
    public int? MaxDownloads { get; set; }  // null = unlimited
    public int DownloadCount { get; set; }
    public DateTime? LastDownloadUtc { get; set; }
    public DateTime DateCreated { get; set; }  // Set by DB mapping
    public bool IsValid =>
        (!ExpiresUtc.HasValue || ExpiresUtc > DateTime.UtcNow) &&
        (!MaxDownloads.HasValue || DownloadCount < MaxDownloads);

    /// <summary>
    /// The full download URL. Not persisted - built at runtime by the service.
    /// </summary>
    [NotMapped]
    public string DownloadUrl { get; set; } = string.Empty;
}
```

**Note:** `DownloadUrl` is built by `IDigitalProductService` using `MerchelloSettings.WebsiteUrl` to ensure correct base URL regardless of deployment configuration (reverse proxy, custom domain, etc.).

### 1.5 Database Mapping & Migration
**New File:** `src/Merchello.Core/DigitalProducts/Mapping/DownloadLinkDbMapping.cs`

```csharp
using Merchello.Core.DigitalProducts.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Merchello.Core.DigitalProducts.Mapping;

public class DownloadLinkDbMapping : IEntityTypeConfiguration<DownloadLink>
{
    public void Configure(EntityTypeBuilder<DownloadLink> builder)
    {
        builder.ToTable("merchelloDownloadLinks");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Token).HasMaxLength(200).IsRequired();
        builder.Property(x => x.MediaId).HasMaxLength(50).IsRequired();
        builder.Property(x => x.FileName).HasMaxLength(500);
        builder.Property(x => x.DateCreated).HasDefaultValueSql("GETUTCDATE()");

        builder.HasIndex(x => x.Token).IsUnique();
        builder.HasIndex(x => x.InvoiceId);
        builder.HasIndex(x => x.CustomerId);

        builder.Ignore(x => x.IsValid);      // Computed property
        builder.Ignore(x => x.DownloadUrl);  // Runtime property
    }
}
```

**Update:** `src/Merchello.Core/Data/Context/MerchelloDbContext.cs`
```csharp
public DbSet<DownloadLink> DownloadLinks => Set<DownloadLink>();
```

**Note:** ProductRoot.ExtendedData was added in Phase 1.0 - digital settings stored there via constant keys.

Update DTOs (convenience properties that map to/from ExtendedData):
- `CreateProductRootDto` / `UpdateProductRootDto` - add digital product fields
- `ProductRootDetailDto` - add digital product fields for reads

```csharp
// Add to CreateProductRootDto and UpdateProductRootDto:
public string? DigitalDeliveryMethod { get; set; }  // "InstantDownload" or "EmailDelivered"
public List<string>? DigitalFileIds { get; set; }
public int? DownloadLinkExpiryDays { get; set; }
public int? MaxDownloadsPerLink { get; set; }  // 0 = unlimited

// Add to ProductRootDetailDto:
public string? DigitalDeliveryMethod { get; set; }
public List<string>? DigitalFileIds { get; set; }
public int? DownloadLinkExpiryDays { get; set; }
public int? MaxDownloadsPerLink { get; set; }
```

**ProductService mapping:** Use extension methods to map DTO fields to/from ExtendedData during create/update/read operations.

Run migration script after changes:
```powershell
.\scripts\add-migration.ps1 -Name AddDownloadLinks
```

### 1.6 Factory
**New File:** `src/Merchello.Core/DigitalProducts/Factories/DownloadLinkFactory.cs`

```csharp
using System.Security.Cryptography;
using System.Text;
using Merchello.Core.DigitalProducts.Models;
using Merchello.Core.DigitalProducts.Services.Parameters;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.DigitalProducts.Factories;

public class DownloadLinkFactory(MerchelloSettings settings)
{
    public DownloadLink Create(CreateDownloadLinkParameters parameters)
    {
        var expiryDays = parameters.ExpiryDays ?? settings.DefaultDownloadLinkExpiryDays;
        var linkId = Guid.NewGuid();

        return new DownloadLink
        {
            Id = linkId,
            InvoiceId = parameters.InvoiceId,
            LineItemId = parameters.LineItemId,
            CustomerId = parameters.CustomerId,
            MediaId = parameters.MediaId,
            FileName = parameters.FileName,
            Token = GenerateSecureToken(linkId, parameters),
            ExpiresUtc = expiryDays > 0 ? DateTime.UtcNow.AddDays(expiryDays) : null,
            MaxDownloads = parameters.MaxDownloads > 0 ? parameters.MaxDownloads : null,
            DownloadCount = 0
        };
    }

    private string GenerateSecureToken(Guid linkId, CreateDownloadLinkParameters parameters)
    {
        var payload = $"{linkId}:{parameters.CustomerId}:{parameters.MediaId}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(settings.DownloadTokenSecret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return $"{linkId:N}-{Convert.ToBase64String(hash).Replace("+", "-").Replace("/", "_").TrimEnd('=')}";
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

**URL Building:** All methods that return `DownloadLink` objects populate the `DownloadUrl` property:
```csharp
// In DigitalProductService
private void PopulateDownloadUrls(IEnumerable<DownloadLink> links)
{
    var baseUrl = _settings.WebsiteUrl.TrimEnd('/');
    foreach (var link in links)
    {
        link.DownloadUrl = $"{baseUrl}/api/merchello/downloads/{link.Token}";
    }
}
```

This ensures download links work correctly regardless of:
- Reverse proxy configuration
- Custom domain setup
- Umbraco virtual directory hosting

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

**Implementation Note:** The service internally:
1. Loads the invoice with line items
2. For each line item with a ProductId, fetches the product to get `IsDigitalProduct` and `DigitalFileIds` from ExtendedData
3. For each digital file, creates a DownloadLink with the configured expiry
4. Saves all links to the database in a single transaction

```csharp
// In DigitalProductService.CreateDownloadLinksAsync (pseudocode)

// Idempotency check - return existing links if already created
var existingLinks = await _dbContext.DownloadLinks
    .Where(l => l.InvoiceId == parameters.InvoiceId)
    .ToListAsync(ct);

if (existingLinks.Count > 0)
{
    PopulateDownloadUrls(existingLinks);
    return CrudResult<List<DownloadLink>>.Success(existingLinks);
}

var invoice = await _invoiceService.GetAsync(parameters.InvoiceId, ct);
var links = new List<DownloadLink>();

foreach (var lineItem in invoice.LineItems.Where(li => li.ProductId.HasValue))
{
    var product = await _productService.GetProductRootAsync(lineItem.ProductId.Value, ct);
    if (product?.IsDigitalProduct != true) continue;

    var fileIds = product.GetDigitalFileIds();
    var expiryDays = product.GetDownloadLinkExpiryDays();

    var maxDownloads = product.GetMaxDownloadsPerLink();

    foreach (var mediaId in fileIds)
    {
        // Use Umbraco's IMediaService to get media file details
        // Inject: IMediaService _umbracoMediaService (from Umbraco.Cms.Core.Services)
        var media = _umbracoMediaService.GetById(Guid.Parse(mediaId));
        links.Add(_factory.Create(new CreateDownloadLinkParameters
        {
            InvoiceId = invoice.Id,
            LineItemId = lineItem.Id,
            CustomerId = invoice.CustomerId!.Value,  // Required - digital products require account
            MediaId = mediaId,
            FileName = media?.Name ?? "Download",
            ExpiryDays = expiryDays,
            MaxDownloads = maxDownloads > 0 ? maxDownloads : null
        }));
    }
}

// Save all links
await _dbContext.DownloadLinks.AddRangeAsync(links, ct);
await _dbContext.SaveChangesAsync(ct);

PopulateDownloadUrls(links);
return CrudResult<List<DownloadLink>>.Success(links);
```

**New File:** `CreateDownloadLinkParameters.cs` (used by factory)
```csharp
namespace Merchello.Core.DigitalProducts.Services.Parameters;

public class CreateDownloadLinkParameters
{
    public required Guid InvoiceId { get; init; }
    public required Guid LineItemId { get; init; }
    public required Guid CustomerId { get; init; }  // Required - digital products require account
    public required string MediaId { get; init; }
    public required string FileName { get; init; }
    public int? ExpiryDays { get; init; }
    public int? MaxDownloads { get; init; }  // 0 or null = unlimited
}
```

**New File:** `ValidateDownloadTokenParameters.cs`
```csharp
namespace Merchello.Core.DigitalProducts.Services.Parameters;

public class ValidateDownloadTokenParameters
{
    public required string Token { get; init; }
    public Guid? CustomerId { get; init; }  // Optional for validation - if provided, verifies ownership
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

**Implementation Note:** Regeneration **invalidates old links** before creating new ones:
```csharp
// In DigitalProductService.RegenerateDownloadLinksAsync
// Delete existing links (invalidates old tokens)
var oldLinks = await _dbContext.DownloadLinks
    .Where(l => l.InvoiceId == parameters.InvoiceId)
    .ToListAsync(ct);

_dbContext.DownloadLinks.RemoveRange(oldLinks);
await _dbContext.SaveChangesAsync(ct);

// Create fresh links with new tokens, reset expiry and download counts
// ... proceeds to create new links using product settings or override expiry ...
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
- Constant-time comparison for validation (prevents timing attacks)

**Token Validation Implementation:**
```csharp
// In DigitalProductService.ValidateDownloadTokenAsync
private bool ValidateTokenSignature(DownloadLink link, string providedToken)
{
    // Recompute expected token
    var payload = $"{link.Id}:{link.CustomerId}:{link.MediaId}";
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_settings.DownloadTokenSecret));
    var expectedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));

    // Extract hash from provided token (after the hyphen)
    var parts = providedToken.Split('-', 2);
    if (parts.Length != 2) return false;

    var providedHashBase64 = parts[1].Replace("-", "+").Replace("_", "/");
    // Pad base64 if needed
    switch (providedHashBase64.Length % 4)
    {
        case 2: providedHashBase64 += "=="; break;
        case 3: providedHashBase64 += "="; break;
    }

    var providedHash = Convert.FromBase64String(providedHashBase64);

    // CRITICAL: Use constant-time comparison to prevent timing attacks
    return CryptographicOperations.FixedTimeEquals(expectedHash, providedHash);
}
```

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

### 3.3 Delivery Method Behavior

| Method | Confirmation Page | Email | Notes |
|--------|------------------|-------|-------|
| **InstantDownload** | âœ… Shows download links | âœ… Sends email | Customer sees links immediately + gets email backup |
| **EmailDelivered** | âŒ Hidden | âœ… Sends email only | For license keys, time-sensitive content, etc. |

### 3.4 Checkout Account Requirement for Digital Products

**Requirement:** Customers purchasing digital products must create an account (or sign in) to access their downloads later.

#### Backend Changes

**File:** `src/Merchello.Core/Checkout/Services/CheckoutService.cs`

Add method to detect digital products in basket:
```csharp
public async Task<bool> BasketHasDigitalProductsAsync(Basket basket, CancellationToken ct = default)
{
    if (basket?.LineItems == null) return false;

    foreach (var item in basket.LineItems.Where(li => li.ProductId.HasValue))
    {
        var product = await _productService.GetProductRootAsync(item.ProductId!.Value, ct);
        if (product?.IsDigitalProduct == true)
            return true;
    }
    return false;
}
```

**File:** `src/Merchello/Models/CheckoutViewModel.cs`

Add property:
```csharp
/// <summary>
/// Whether the basket contains digital products (requires account creation).
/// </summary>
public bool HasDigitalProducts { get; set; }
```

**File:** `src/Merchello/Controllers/CheckoutController.cs`

Set the flag when building the view model:
```csharp
var viewModel = new CheckoutViewModel
{
    // ... existing properties
    HasDigitalProducts = await _checkoutService.BasketHasDigitalProductsAsync(basket, ct)
};
```

#### Frontend Changes

**File:** `src/Merchello/App_Plugins/Merchello/Views/Checkout/SinglePage.cshtml`

Add to initial data JSON:
```csharp
hasDigitalProducts = Model.HasDigitalProducts,
```

**File:** `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/stores/checkout.store.js`

Add to store state:
```javascript
/** @type {boolean} Whether basket contains digital products (requires account) */
hasDigitalProducts: initialData.hasDigitalProducts ?? false,
```

**File:** `src/Merchello/wwwroot/App_Plugins/Merchello/js/checkout/components/single-page-checkout.js`

Modify `init()`:
```javascript
async init() {
    // ... existing init code ...

    // Force account creation section open for digital products
    const store = this.$store.checkout;
    if (store?.hasDigitalProducts && !store?.isLoggedIn) {
        this.showAccountSection = true;
        // Check if email has existing account once email is entered
        if (this.form.email) {
            await this.checkEmailForAccount();
        }
    }
}
```

Modify `cancelAccountSection()`:
```javascript
cancelAccountSection() {
    // Don't allow canceling if digital products require account
    if (this.$store.checkout?.hasDigitalProducts && !this.$store.checkout?.isLoggedIn) {
        return; // Can't cancel - account required
    }

    this.showAccountSection = false;
    // ... rest of existing code
}
```

Modify `canSubmit` getter:
```javascript
get canSubmit() {
    // ... existing validation ...

    // Digital products require account (signed in OR valid password for new account)
    const store = this.$store.checkout;
    if (store?.hasDigitalProducts && !store?.isLoggedIn) {
        // Must either have signed in during checkout OR have valid password for new account
        if (!this.isSignedIn && (!this.form.password || !this.passwordValid)) {
            return false;
        }
    }

    return /* existing conditions */;
}
```

**File:** `src/Merchello/App_Plugins/Merchello/Views/Checkout/SinglePage.cshtml`

Add message explaining why account is required:
```html
<!-- Account required message for digital products -->
<div x-show="$store.checkout?.hasDigitalProducts && !$store.checkout?.isLoggedIn && !isSignedIn"
     class="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-2">
    <strong>Account required:</strong> Digital products in your cart require an account to access your downloads.
</div>
```

Hide cancel button when account is required:
```html
<button type="button"
        x-show="!($store.checkout?.hasDigitalProducts && !$store.checkout?.isLoggedIn)"
        @@click="cancelAccountSection()"
        class="text-xs text-gray-500 hover:text-gray-700">
    Cancel
</button>
```

#### Email Check Integration

The existing email check flow (`checkEmailForAccountVisibility()` called on email blur) already checks if an account exists. For digital products:
- If account exists: User must sign in (existing flow works)
- If no account: User must create password (enforced by `canSubmit`)

### 3.5 Constants
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
{{store.email}}
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
        @* DownloadUrl is pre-built by the service using the configured base URL *@
        var expiryText = link.ExpiresUtc.HasValue
            ? link.ExpiresUtc.Value.ToString("MMM dd, yyyy")
            : "Never";
        <tr style="border-bottom: 1px solid #ecedee;">
          <td style="padding: 15px 0;">
            <a href="@link.DownloadUrl" style="color: #007bff; text-decoration: none; font-weight: 500;">
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

  <!-- Max Downloads -->
  <umb-property-layout label="Max Downloads Per Link"
    description="0 = unlimited downloads">
    <uui-input type="number" min="0" value="0" />
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
maxDownloadsPerLink?: number;  // 0 = unlimited
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
    public int? MaxDownloads { get; set; }  // null = unlimited
    public int DownloadCount { get; set; }
    public int? RemainingDownloads { get; set; }  // null = unlimited, computed: MaxDownloads - DownloadCount
    public DateTime? LastDownloadUtc { get; set; }
    public bool IsExpired { get; set; }
    public bool IsDownloadLimitReached { get; set; }  // true if MaxDownloads reached
}
```

Add `DownloadLinks` property to checkout completion response.

### 5.5 Admin Order View - Downloads Tab
**New File:** `src/Merchello/Client/src/orders/components/order-downloads.element.ts`

Display for each download link:
- Product name, File name
- Download count / Max downloads (e.g., "3 / 10" or "3 / âˆž")
- Last download date
- Expiry date and status
- "Regenerate Links" button (invalidates old links, creates new ones with fresh expiry and reset download counts)

---

## Phase 6: Configuration

### 6.1 MerchelloSettings
**File:** `src/Merchello.Core/Shared/Models/MerchelloSettings.cs`

```csharp
/// <summary>
/// Base URL of the storefront (e.g., "https://shop.example.com").
/// Used for building absolute URLs for download links, emails, and webhooks.
/// </summary>
public string WebsiteUrl { get; set; } = "";  // REQUIRED: must be configured

public string DownloadTokenSecret { get; set; } = "";  // REQUIRED: strong random key
public int DefaultDownloadLinkExpiryDays { get; set; } = 30;
public int DefaultMaxDownloadsPerLink { get; set; } = 0;  // 0 = unlimited
```

### 6.2 appsettings.json Example
```json
{
  "Merchello": {
    "WebsiteUrl": "https://shop.example.com",
    "DownloadTokenSecret": "your-strong-secret-key-here-32chars",
    "DefaultDownloadLinkExpiryDays": 30,
    "DefaultMaxDownloadsPerLink": 0
  }
}
```

### 6.3 Startup Validation

**File:** `src/Merchello.Core/Startup.cs`

Add validation to ensure required settings are configured:
```csharp
// In ConfigureServices or builder configuration section
var settings = configuration.GetSection("Merchello").Get<MerchelloSettings>();

if (string.IsNullOrEmpty(settings?.WebsiteUrl))
{
    throw new InvalidOperationException(
        "Merchello:WebsiteUrl must be configured (e.g., \"https://shop.example.com\"). " +
        "This is required for generating download links and email URLs.");
}

if (string.IsNullOrEmpty(settings?.DownloadTokenSecret) || settings.DownloadTokenSecret.Length < 32)
{
    throw new InvalidOperationException(
        "Merchello:DownloadTokenSecret must be configured with at least 32 characters for digital product security. " +
        "Generate a secure random key and add it to appsettings.json.");
}
```

---

## File Summary

### Module Structure
```
DigitalProducts/
â”œâ”€â”€ Dtos/
â”‚   â””â”€â”€ DownloadLinkDto.cs
â”œâ”€â”€ Extensions/
â”‚   â””â”€â”€ ProductRootDigitalExtensions.cs
â”œâ”€â”€ Factories/
â”‚   â””â”€â”€ DownloadLinkFactory.cs
â”œâ”€â”€ Handlers/
â”‚   â””â”€â”€ DigitalProductPaymentHandler.cs
â”œâ”€â”€ Mapping/
â”‚   â””â”€â”€ DownloadLinkDbMapping.cs
â”œâ”€â”€ Models/
â”‚   â”œâ”€â”€ DigitalDeliveryMethod.cs
â”‚   â””â”€â”€ DownloadLink.cs
â”œâ”€â”€ Notifications/
â”‚   â””â”€â”€ DigitalProductDeliveredNotification.cs
â””â”€â”€ Services/
    â”œâ”€â”€ Interfaces/
    â”‚   â””â”€â”€ IDigitalProductService.cs
    â”œâ”€â”€ Parameters/
    â”‚   â”œâ”€â”€ CreateDownloadLinksParameters.cs
    â”‚   â”œâ”€â”€ CreateDownloadLinkParameters.cs
    â”‚   â”œâ”€â”€ GetCustomerDownloadsParameters.cs
    â”‚   â”œâ”€â”€ RegenerateDownloadLinksParameters.cs
    â”‚   â””â”€â”€ ValidateDownloadTokenParameters.cs
    â””â”€â”€ DigitalProductService.cs
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
| `Products/Models/ProductRoot.cs` | Add `ExtendedData` dictionary property |
| `Products/Mapping/ProductRootDbMapping.cs` | Add `.ToJsonConversion(3000)` for ExtendedData |
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
| `Shared/Models/MerchelloSettings.cs` | Add WebsiteUrl, DownloadTokenSecret, DefaultDownloadLinkExpiryDays, DefaultMaxDownloadsPerLink |
| `Composing/MerchelloBuilderExtensions.cs` | Register IDigitalProductService, DownloadLinkFactory |
| `Startup.cs` | Register notification handlers, rate limiting |
| `Client/src/products/components/product-detail.element.ts` | Digital product panel |
| `Client/src/products/components/product-options-*.element.ts` | Force add-ons only for digital products |
| `Client/src/products/types/product.types.ts` | TypeScript types |
| `Checkout/Services/CheckoutService.cs` | Add `BasketHasDigitalProducts()` method |
| `Models/CheckoutViewModel.cs` | Add `HasDigitalProducts` property |
| `Controllers/CheckoutController.cs` | Set `HasDigitalProducts` flag |
| `Views/Checkout/SinglePage.cshtml` | Add `hasDigitalProducts` to initial data, account required message |
| `wwwroot/App_Plugins/Merchello/js/checkout/stores/checkout.store.js` | Add `hasDigitalProducts` state |
| `wwwroot/App_Plugins/Merchello/js/checkout/components/single-page-checkout.js` | Force account section, update `canSubmit` |

---

## Verification

### Backend Testing
1. Create a digital product with files via API
2. Purchase the product, verify payment triggers link creation
3. Verify download endpoint streams file correctly
4. Verify token validation rejects tampered/expired tokens
5. Verify digital-only orders auto-complete
6. Verify max downloads limit is enforced (returns error after limit reached)
7. Verify idempotent link creation (duplicate payment webhook returns existing links)
8. Verify link regeneration invalidates old tokens and creates new ones
9. Verify `DownloadTokenSecret` validation fails startup if not configured or < 32 chars
10. Verify token validation uses constant-time comparison (no timing side-channel)

### Frontend Testing
1. Toggle "Digital Product" checkbox, verify panel appears
2. Select files via media picker, verify saved
3. **Add product options to digital product, verify IsVariant toggle is hidden/disabled and forced to false (add-on only)**
4. Purchase digital product, verify links on confirmation page
5. Admin view: verify download history displays correctly

### Checkout Account Requirement Testing
1. Add digital product to cart as guest
2. Navigate to checkout, verify:
   - Account section is automatically expanded
   - Message explains "Account required: Digital products in your cart require an account"
   - Cancel button is hidden/disabled
   - Cannot submit without valid password or signing in
3. Enter email that has existing account:
   - Verify sign-in prompt appears
   - Complete sign-in, verify can proceed
4. Enter email without existing account:
   - Verify password field shows
   - Enter invalid password, verify error
   - Enter valid password, verify can proceed
5. Add mix of digital and physical products:
   - Verify account section still required (digital products present)
6. Logged-in user adds digital product:
   - Verify account section not shown (already authenticated)
   - Verify can proceed normally

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
- [ ] Max download count enforced server-side
- [ ] Digital products require account creation (no guest checkout)

---

## Rate Limiting Implementation

### Download Endpoint Rate Limiting

Implement rate limiting on the download endpoint to prevent abuse.

**File:** `src/Merchello/Controllers/DownloadsController.cs`

Use ASP.NET Core's built-in rate limiting (requires .NET 7+):

```csharp
[ApiController]
[Route("api/merchello/downloads")]
public class DownloadsController(
    IDigitalProductService digitalProductService,
    IMediaService mediaService,
    ILogger<DownloadsController> logger) : ControllerBase
{
    /// <summary>
    /// Download a file using a secure token.
    /// Rate limited to 30 requests per minute per IP.
    /// </summary>
    [HttpGet("{token}")]
    [EnableRateLimiting("downloads")]
    public async Task<IActionResult> Download(string token, CancellationToken ct)
    {
        // Validate token and stream file...
    }
}
```

**File:** `src/Merchello/Startup.cs` (or Program.cs)

Configure the rate limiting policy:
```csharp
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("downloads", limiterOptions =>
    {
        limiterOptions.PermitLimit = 30;           // 30 requests
        limiterOptions.Window = TimeSpan.FromMinutes(1);  // per minute
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 5;             // Allow 5 queued requests
    });

    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsync(
            "Too many download requests. Please wait before trying again.", token);
    };
});

// In Configure/app pipeline:
app.UseRateLimiter();
```

### Additional Rate Limiting Considerations

| Endpoint | Rate Limit | Window | Notes |
|----------|------------|--------|-------|
| `GET /api/merchello/downloads/{token}` | 30 | 1 min | Per IP, prevents bulk downloading |
| `POST /api/merchello/downloads/regenerate` | 5 | 1 hour | Per customer, prevents link abuse |

**Alternative: Per-Customer Rate Limiting**

For authenticated endpoints, rate limit by customer ID instead of IP:
```csharp
options.AddPolicy("customer-downloads", context =>
{
    var customerId = context.User?.FindFirst("CustomerId")?.Value ?? context.Connection.RemoteIpAddress?.ToString();
    return RateLimitPartition.GetFixedWindowLimiter(customerId, _ => new FixedWindowRateLimiterOptions
    {
        PermitLimit = 30,
        Window = TimeSpan.FromMinutes(1)
    });
});
```


