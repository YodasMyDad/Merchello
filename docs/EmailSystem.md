# Email System & Email Builder

A comprehensive email automation system for Merchello that allows users to create email automations through a backoffice "Email Builder" UI. Emails are triggered by the existing notification system and rendered using Razor templates on the file system.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Design Decisions](#key-design-decisions)
3. [Architecture](#architecture)
4. [Implementation Progress](#implementation-progress)
5. [Database Schema](#database-schema)
6. [Models](#models)
7. [Services](#services)
8. [Token System](#token-system)
9. [Configuration](#configuration)
10. [API Endpoints](#api-endpoints)
11. [Backoffice UI](#backoffice-ui)
12. [File Structure](#file-structure)
13. [Sample Templates](#sample-templates)
14. [Testing](#testing)

---

## Overview

The Email System provides:
- **Email Builder UI** - Configure automated emails in the Merchello backoffice
- **Template-based emails** - Razor templates stored on the file system (developer-editable)
- **Token resolution** - `{{path}}` syntax for dynamic fields (To, From, Subject)
- **Shared delivery infrastructure** - Unified `OutboundDelivery` table for webhooks and emails
- **Multiple configs per topic** - Send both customer and admin emails for the same event
- **Preview & Test** - Preview rendered emails and send test emails before going live
- **Retry & Logging** - Automatic retry with exponential backoff, full delivery history

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Razor templates on file system | Developer-editable, version-controllable, IDE-supported |
| `{{path}}` token syntax | Familiar (Handlebars/Liquid-like), easy autocomplete |
| Wrapped email model | `EmailModel<TNotification>` provides notification + store context |
| Shared OutboundDelivery table | Single delivery log, unified retry mechanism |
| Multiple configs per topic | Customer confirmation + admin notification emails |
| Umbraco IEmailSender | Leverages existing SMTP configuration |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Notification Published (e.g., OrderCreatedNotification)            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  EmailNotificationHandler (priority 2000, like WebhookHandler)      │
│    - Looks up EmailConfigurations for topic                         │
│    - For each enabled config: queue email delivery                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  IEmailService                                                       │
│    - QueueDeliveryAsync() → creates OutboundDelivery record         │
│    - RenderTemplateAsync() → Razor view → HTML string               │
│    - ResolveTokensAsync() → {{path}} → actual values                │
│    - SendAsync() → calls Umbraco IEmailSender                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  OutboundDeliveryJob (shared background service)                    │
│    - Processes pending deliveries (webhooks AND emails)             │
│    - Handles retry with exponential backoff                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Umbraco IEmailSender                                               │
│    - Uses SMTP config from Umbraco:CMS:Global:Smtp                  │
│    - Handles actual email delivery via MailKit                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Progress

### Phase 1: OutboundDelivery Refactoring ✅ COMPLETED

| Task | Status | Files |
|------|--------|-------|
| Create `OutboundDeliveryType` enum | ✅ | `src/Merchello.Core/Shared/Models/Enums/OutboundDeliveryType.cs` |
| Create `OutboundDeliveryStatus` enum | ✅ | `src/Merchello.Core/Shared/Models/Enums/OutboundDeliveryStatus.cs` |
| Rename `WebhookDelivery` → `OutboundDelivery` | ✅ | `src/Merchello.Core/Webhooks/Models/WebhookDelivery.cs` |
| Rename `WebhookDeliveryResult` → `OutboundDeliveryResult` | ✅ | `src/Merchello.Core/Webhooks/Models/OutboundDeliveryResult.cs` |
| Rename `WebhookDeliveryQueryParameters` → `OutboundDeliveryQueryParameters` | ✅ | `src/Merchello.Core/Webhooks/Services/Parameters/OutboundDeliveryQueryParameters.cs` |
| Update `IWebhookDispatcher` | ✅ | Uses `OutboundDelivery` and `OutboundDeliveryResult` |
| Update `WebhookDispatcher` | ✅ | Uses `OutboundDelivery` and `OutboundDeliveryResult` |
| Rename `WebhookDeliveryJob` → `OutboundDeliveryJob` | ✅ | `src/Merchello.Core/Webhooks/Services/OutboundDeliveryJob.cs` |
| Update `WebhookSubscription` navigation property | ✅ | Uses `ICollection<OutboundDelivery>` |
| Update `WebhooksApiController` | ✅ | Uses all new types |
| Update `WebhookDeliveryDto` → `OutboundDeliveryDto` | ✅ | `src/Merchello.Core/Webhooks/Dtos/WebhookDeliveryDto.cs` |
| Create `OutboundDeliveryDbMapping` | ✅ | `src/Merchello.Core/Webhooks/Mapping/OutboundDeliveryDbMapping.cs` |
| Delete old files | ✅ | Removed obsolete WebhookDelivery* files |

### Phase 1: Email Infrastructure ✅ COMPLETED

| Task | Status | Files |
|------|--------|-------|
| Create `EmailConfiguration` entity | ✅ | `src/Merchello.Core/Email/Models/EmailConfiguration.cs` |
| Create `EmailModel<T>` wrapper | ✅ | `src/Merchello.Core/Email/Models/EmailModel.cs` |
| Create `EmailStoreContext` | ✅ | `src/Merchello.Core/Email/Models/EmailStoreContext.cs` |
| Create `EmailTopic` and `TokenInfo` | ✅ | `src/Merchello.Core/Email/Models/EmailTopic.cs` |
| Create `EmailTemplateInfo` | ✅ | `src/Merchello.Core/Email/Models/EmailTemplateInfo.cs` |
| Create `EmailSettings` | ✅ | `src/Merchello.Core/Email/EmailSettings.cs` |
| Create `EmailConfigurationDbMapping` | ✅ | `src/Merchello.Core/Email/Mapping/EmailConfigurationDbMapping.cs` |
| Add to `MerchelloDbContext` | ✅ | Added `EmailConfigurations` and `OutboundDeliveries` DbSets |
| Update `appsettings.json` | ✅ | Added `Merchello:Email` section |
| Register in `Startup.cs` | ✅ | Registered `EmailSettings` |

### Phase 2: Email Services ✅ COMPLETED

| Task | Status | Files |
|------|--------|-------|
| Create `IEmailTopicRegistry` | ✅ | `src/Merchello.Core/Email/Services/Interfaces/IEmailTopicRegistry.cs` |
| Create `EmailTopicRegistry` | ✅ | `src/Merchello.Core/Email/Services/EmailTopicRegistry.cs` |
| Create `IEmailTokenResolver` | ✅ | `src/Merchello.Core/Email/Services/Interfaces/IEmailTokenResolver.cs` |
| Create `EmailTokenResolver` | ✅ | `src/Merchello.Core/Email/Services/EmailTokenResolver.cs` |
| Create `IEmailTemplateDiscoveryService` | ✅ | `src/Merchello.Core/Email/Services/Interfaces/IEmailTemplateDiscoveryService.cs` |
| Create `EmailTemplateDiscoveryService` | ✅ | `src/Merchello.Core/Email/Services/EmailTemplateDiscoveryService.cs` |
| Create `IEmailConfigurationService` | ✅ | `src/Merchello.Core/Email/Services/Interfaces/IEmailConfigurationService.cs` |
| Create `EmailConfigurationService` | ✅ | `src/Merchello.Core/Email/Services/EmailConfigurationService.cs` |
| Create `IEmailService` | ✅ | `src/Merchello.Core/Email/Services/Interfaces/IEmailService.cs` |
| Create `EmailService` | ✅ | `src/Merchello.Core/Email/Services/EmailService.cs` |
| Create `EmailRazorViewRenderer` | ✅ | `src/Merchello/Email/EmailRazorViewRenderer.cs` |
| Create `EmailPreviewDto` | ✅ | `src/Merchello.Core/Email/Dtos/EmailPreviewDto.cs` |
| Create `EmailSendTestResultDto` | ✅ | `src/Merchello.Core/Email/Dtos/EmailSendTestResultDto.cs` |

### Phase 3: Notification Handler & New Notifications ✅ COMPLETED

| Task | Status | Files |
|------|--------|-------|
| Create `EmailNotificationHandler` | ✅ | `src/Merchello.Core/Email/Handlers/EmailNotificationHandler.cs` |
| Create `CustomerPasswordResetRequestedNotification` | ✅ | `src/Merchello.Core/Notifications/CustomerNotifications/CustomerPasswordResetRequestedNotification.cs` |
| Create `CheckoutAbandonedNotification` | ✅ | `src/Merchello.Core/Notifications/CheckoutNotifications/CheckoutAbandonedNotification.cs` |
| Create `CheckoutRecoveredNotification` | ✅ | `src/Merchello.Core/Notifications/CheckoutNotifications/CheckoutRecoveredNotification.cs` |
| Create `CheckoutRecoveryConvertedNotification` | ✅ | `src/Merchello.Core/Notifications/CheckoutNotifications/CheckoutRecoveryConvertedNotification.cs` |
| Update `EmailTopicRegistry` with new topics | ✅ | Added customer.password_reset, checkout.abandoned, checkout.recovered, checkout.converted |
| Register handlers in `Startup.cs` | ✅ | All 13 notification handlers registered (lines 313-331) |

### Phase 4: API Endpoints ✅ COMPLETED

| Task | Status | Files |
|------|--------|-------|
| Create `EmailConfigurationApiController` | ✅ | `src/Merchello/Controllers/EmailConfigurationApiController.cs` |
| Create `EmailMetadataApiController` | ✅ | `src/Merchello/Controllers/EmailMetadataApiController.cs` |
| Create `EmailConfigurationDto` | ✅ | `src/Merchello.Core/Email/Dtos/EmailConfigurationDto.cs` |
| Create `EmailTopicDto` | ✅ | `src/Merchello.Core/Email/Dtos/EmailTopicDto.cs` |

### Phase 5: Backoffice UI ✅ COMPLETED

| Task | Status | Files |
|------|--------|-------|
| Create email workspace manifest | ✅ | `src/Merchello/Client/src/email/manifest.ts` |
| Create email configuration list | ✅ | `src/Merchello/Client/src/email/components/email-list.element.ts` |
| Create email configuration editor | ✅ | `src/Merchello/Client/src/email/components/email-editor.element.ts` |
| Create token autocomplete component | ✅ | Expression builder with token support |
| Create email preview modal | ✅ | `src/Merchello/Client/src/email/modals/email-preview-modal.element.ts` |

### Phase 6: Sample Templates & Migration ⏳ PENDING

| Task | Status |
|------|--------|
| Create sample Razor templates | ⏳ |
| Run database migration | ⏳ |

---

## Database Schema

### Table: `merchelloEmailConfigurations`

```csharp
public class EmailConfiguration
{
    public Guid Id { get; set; }
    public string Name { get; set; }              // "Order Confirmation Email"
    public string Topic { get; set; }             // "order.created"
    public bool Enabled { get; set; } = true;

    // Template
    public string TemplatePath { get; set; }      // "OrderConfirmation.cshtml"

    // Dynamic fields with {{token}} support
    public string ToExpression { get; set; }      // "{{order.customerEmail}}"
    public string? CcExpression { get; set; }
    public string? BccExpression { get; set; }
    public string? FromExpression { get; set; }   // "{{store.email}}" or fixed
    public string SubjectExpression { get; set; } // "Order #{{order.orderNumber}} Confirmed"

    // Metadata
    public string? Description { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime DateModified { get; set; }

    // Stats
    public int TotalSent { get; set; }
    public int TotalFailed { get; set; }
    public DateTime? LastSentUtc { get; set; }

    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
```

### Table: `merchelloOutboundDeliveries`

Shared table for both webhook and email deliveries.

```csharp
public class OutboundDelivery
{
    public Guid Id { get; set; }
    public OutboundDeliveryType DeliveryType { get; set; }  // Webhook = 0, Email = 1
    public Guid ConfigurationId { get; set; }                // FK to subscription OR email config
    public string Topic { get; set; }

    // Shared fields
    public OutboundDeliveryStatus Status { get; set; }
    public int AttemptNumber { get; set; }
    public DateTime? NextRetryUtc { get; set; }
    public string? ErrorMessage { get; set; }

    // Entity reference
    public Guid? EntityId { get; set; }
    public string? EntityType { get; set; }

    // Timestamps
    public DateTime DateCreated { get; set; }
    public DateTime? DateSent { get; set; }
    public DateTime? DateCompleted { get; set; }
    public int DurationMs { get; set; }

    // Webhook-specific
    public string? TargetUrl { get; set; }
    public string? RequestBody { get; set; }
    public string? RequestHeaders { get; set; }
    public int? ResponseStatusCode { get; set; }
    public string? ResponseBody { get; set; }
    public string? ResponseHeaders { get; set; }

    // Email-specific
    public string? EmailRecipients { get; set; }
    public string? EmailSubject { get; set; }
    public string? EmailFrom { get; set; }
    public string? EmailBody { get; set; }

    public Dictionary<string, object> ExtendedData { get; set; } = [];
}

public enum OutboundDeliveryType
{
    Webhook = 0,
    Email = 1
}

public enum OutboundDeliveryStatus
{
    Pending = 0,
    Sending = 1,
    Succeeded = 2,
    Failed = 3,
    Retrying = 4,
    Abandoned = 5
}
```

---

## Models

### EmailModel<TNotification>

The wrapped model provided to Razor templates:

```csharp
public class EmailModel<TNotification> where TNotification : MerchelloNotification
{
    public required TNotification Notification { get; init; }
    public required EmailStoreContext Store { get; init; }
    public required EmailConfiguration Configuration { get; init; }
    public DateTime GeneratedAtUtc { get; init; } = DateTime.UtcNow;
}
```

### EmailStoreContext

Store context available to all templates:

```csharp
public class EmailStoreContext
{
    public string Name { get; set; }
    public string Email { get; set; }
    public string? LogoUrl { get; set; }
    public string? WebsiteUrl { get; set; }
    public string? SupportEmail { get; set; }
    public string? Phone { get; set; }
    public Address? Address { get; set; }
    public string? CurrencyCode { get; set; }
    public string? CurrencySymbol { get; set; }
}
```

### EmailTopic

Topic definition with available tokens:

```csharp
public class EmailTopic
{
    public string Topic { get; set; }              // "order.created"
    public string DisplayName { get; set; }        // "Order Created"
    public string Description { get; set; }
    public string Category { get; set; }           // "Orders", "Customers", "Checkout"
    public Type NotificationType { get; set; }     // typeof(OrderCreatedNotification)
    public IReadOnlyList<TokenInfo> AvailableTokens { get; set; }
}

public class TokenInfo
{
    public string Path { get; set; }         // "order.customerEmail"
    public string DisplayName { get; set; }  // "Customer Email"
    public string? Description { get; set; }
    public string DataType { get; set; }     // "string", "decimal", "DateTime"
}
```

---

## Services

### IEmailTopicRegistry ✅ IMPLEMENTED

```csharp
public interface IEmailTopicRegistry
{
    IReadOnlyList<EmailTopic> GetAllTopics();
    EmailTopic? GetTopic(string topic);
    Type? GetNotificationType(string topic);
    bool TopicExists(string topic);
    IEnumerable<IGrouping<string, EmailTopic>> GetTopicsByCategory();
}
```

### Supported Topics

| Category | Topic | Notification Type | Description |
|----------|-------|-------------------|-------------|
| **Orders** | `order.created` | `OrderCreatedNotification` | Order confirmation |
| | `order.status_changed` | `OrderStatusChangedNotification` | Status update |
| | `order.cancelled` | `InvoiceCancelledNotification` | Cancellation notice |
| **Payments** | `payment.created` | `PaymentCreatedNotification` | Payment receipt |
| | `payment.refunded` | `PaymentRefundedNotification` | Refund confirmation |
| **Shipping** | `shipment.created` | `ShipmentCreatedNotification` | Shipping confirmation |
| | `shipment.updated` | `ShipmentSavedNotification` | Tracking update |
| **Customers** | `customer.created` | `CustomerCreatedNotification` | Welcome email |
| | `customer.updated` | `CustomerSavedNotification` | Account updated |
| | `customer.password_reset` | `CustomerPasswordResetRequestedNotification` | Password reset |
| **Checkout** | `checkout.abandoned` | `CheckoutAbandonedNotification` | Cart recovery |
| | `checkout.recovered` | `CheckoutRecoveredNotification` | Recovery analytics |
| **Inventory** | `inventory.low_stock` | `LowStockNotification` | Low stock alert |

### IEmailTokenResolver ✅ IMPLEMENTED

```csharp
public interface IEmailTokenResolver
{
    string ResolveTokens<TNotification>(string template, EmailModel<TNotification> model)
        where TNotification : MerchelloNotification;

    IReadOnlyList<TokenInfo> GetAvailableTokens(string topic);
    IReadOnlyList<TokenInfo> GetAvailableTokens<TNotification>()
        where TNotification : MerchelloNotification;

    string? ResolveToken<TNotification>(string path, EmailModel<TNotification> model)
        where TNotification : MerchelloNotification;
}
```

### IEmailTemplateDiscoveryService ✅ IMPLEMENTED

```csharp
public interface IEmailTemplateDiscoveryService
{
    IReadOnlyList<EmailTemplateInfo> GetAvailableTemplates();
    bool TemplateExists(string templatePath);
    EmailTemplateInfo? GetTemplate(string templatePath);
    string? GetFullPath(string templatePath);
}
```

### IEmailConfigurationService ✅ IMPLEMENTED

```csharp
public interface IEmailConfigurationService
{
    Task<EmailConfiguration?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<EmailConfiguration>> GetByTopicAsync(string topic, CancellationToken ct = default);
    Task<IReadOnlyList<EmailConfiguration>> GetEnabledByTopicAsync(string topic, CancellationToken ct = default);
    Task<IReadOnlyList<EmailConfiguration>> GetByCategoryAsync(string category, CancellationToken ct = default);
    Task<PaginatedList<EmailConfiguration>> QueryAsync(EmailConfigurationQueryParameters parameters, CancellationToken ct = default);
    Task<CrudResult<EmailConfiguration>> CreateAsync(CreateEmailConfigurationParameters parameters, CancellationToken ct = default);
    Task<CrudResult<EmailConfiguration>> UpdateAsync(UpdateEmailConfigurationParameters parameters, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<bool> ToggleEnabledAsync(Guid id, CancellationToken ct = default);
    Task IncrementSentCountAsync(Guid id, CancellationToken ct = default);
    Task IncrementFailedCountAsync(Guid id, CancellationToken ct = default);
}
```

### IEmailService ✅ IMPLEMENTED

```csharp
public interface IEmailService
{
    Task<OutboundDelivery> QueueDeliveryAsync<TNotification>(
        EmailConfiguration config,
        TNotification notification,
        Guid? entityId = null,
        string? entityType = null,
        CancellationToken ct = default) where TNotification : MerchelloNotification;

    Task<bool> SendImmediateAsync<TNotification>(
        EmailConfiguration config,
        TNotification notification,
        CancellationToken ct = default) where TNotification : MerchelloNotification;

    Task<string> RenderTemplateAsync<TNotification>(
        string templatePath,
        EmailModel<TNotification> model,
        CancellationToken ct = default) where TNotification : MerchelloNotification;

    Task<bool> SendTestEmailAsync(Guid configurationId, string testRecipient, CancellationToken ct = default);
    Task<EmailPreviewDto> PreviewAsync(Guid configurationId, CancellationToken ct = default);
    Task ProcessPendingRetriesAsync(CancellationToken ct = default);
    EmailStoreContext GetStoreContext();
}
```

---

## Token System

### Token Syntax

Tokens use the `{{path.to.property}}` format:

```
{{order.customerEmail}}
{{order.billingAddress.name}}
{{store.name}}
{{store.websiteUrl}}
```

### Token Resolution

The `EmailTokenResolver` uses reflection to:
1. Parse the token path
2. Navigate through object properties
3. Format the final value appropriately

### Available Tokens by Topic

**Order Created (`order.created`):**
```
{{order.id}}
{{order.invoiceNumber}}
{{order.customerEmail}}
{{order.total}}
{{order.billingAddress.name}}
{{order.billingAddress.email}}
{{order.shippingAddress.name}}
{{store.name}}
{{store.email}}
{{store.websiteUrl}}
```

**Checkout Abandoned (`checkout.abandoned`):**
```
{{customerEmail}}
{{basketTotal}}
{{recoveryLink}}
{{abandonedCheckout.id}}
{{store.name}}
```

---

## Configuration

### appsettings.json

```json
{
  "Merchello": {
    "Email": {
      "Enabled": true,
      "TemplateViewLocations": ["/Views/Emails/{0}.cshtml"],
      "DefaultFromAddress": null,
      "DefaultFromName": null,
      "MaxRetries": 3,
      "RetryDelaysSeconds": [60, 300, 900],
      "DeliveryRetentionDays": 30,
      "Store": {
        "Name": "My Store",
        "Email": "store@example.com",
        "LogoUrl": null,
        "WebsiteUrl": null,
        "SupportEmail": null,
        "Phone": null
      }
    }
  }
}
```

### EmailSettings.cs ✅ IMPLEMENTED

```csharp
public class EmailSettings
{
    public bool Enabled { get; set; } = true;
    public string[] TemplateViewLocations { get; set; } = ["/Views/Emails/{0}.cshtml"];
    public string? DefaultFromAddress { get; set; }
    public string? DefaultFromName { get; set; }
    public int MaxRetries { get; set; } = 3;
    public int[] RetryDelaysSeconds { get; set; } = [60, 300, 900];
    public int DeliveryRetentionDays { get; set; } = 30;
    public EmailStoreSettings Store { get; set; } = new();
}
```

---

## API Endpoints

### EmailConfigurationApiController ✅ IMPLEMENTED

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/emails` | List all configurations (paginated) |
| GET | `/api/v1/emails/{id}` | Get single configuration |
| POST | `/api/v1/emails` | Create configuration |
| PUT | `/api/v1/emails/{id}` | Update configuration |
| DELETE | `/api/v1/emails/{id}` | Delete configuration |
| POST | `/api/v1/emails/{id}/toggle` | Toggle enabled |
| POST | `/api/v1/emails/{id}/test` | Send test email |
| GET | `/api/v1/emails/{id}/preview` | Preview rendered email |

### EmailMetadataApiController ✅ IMPLEMENTED

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/emails/topics` | List available topics with tokens |
| GET | `/api/v1/emails/topics/categories` | List topics grouped by category |
| GET | `/api/v1/emails/topics/{topic}/tokens` | Get tokens for topic |
| GET | `/api/v1/emails/templates` | List available template files |
| GET | `/api/v1/emails/templates/exists` | Check if template exists |

### Delivery Endpoints (via WebhooksApiController) ✅ IMPLEMENTED

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/webhooks/{id}/deliveries` | List deliveries for a subscription |
| GET | `/api/v1/webhooks/deliveries/{id}` | Get delivery details |
| POST | `/api/v1/webhooks/deliveries/{id}/retry` | Retry failed delivery |

Note: Delivery records are shared between webhooks and emails via the `OutboundDelivery` table with `DeliveryType` discriminator.

---

## Backoffice UI

### Email Builder Workspace ✅ IMPLEMENTED

**Location:** `src/Merchello/Client/src/email/`

#### Components:

1. **Email Configuration List** (`email-list.element.ts`)
   - Table with: Name, Topic, Template, Enabled, Last Sent, Stats
   - Filter by topic category
   - Quick toggle enabled/disabled

2. **Email Configuration Editor** (`email-editor.element.ts`)
   - Name input
   - Topic dropdown (grouped by category)
   - Template dropdown (from file system)
   - Expression inputs with token autocomplete:
     - To, CC, BCC
     - From
     - Subject
   - Help text explaining `{{token}}` syntax
   - Preview button (opens modal)
   - Send Test button
   - Enable/disable toggle

3. **Email Preview Modal** (`email-preview-modal.element.ts`)
   - Shows rendered HTML in iframe
   - Shows resolved To, From, Subject
   - "Send Test" button with email input

4. **Token Autocomplete** (`token-autocomplete.element.ts`)
   - Shared component for expression inputs
   - Shows available tokens when typing `{{`
   - Grouped by: notification properties, store context

---

## File Structure

```
src/Merchello.Core/
├── Email/
│   ├── Dtos/                              # ✅ Complete
│   │   ├── EmailConfigurationDto.cs
│   │   ├── EmailPreviewDto.cs
│   │   ├── EmailSendTestResultDto.cs
│   │   └── EmailTopicDto.cs
│   ├── Models/                            # ✅ Complete
│   │   ├── EmailConfiguration.cs
│   │   ├── EmailModel.cs
│   │   ├── EmailStoreContext.cs
│   │   ├── EmailTopic.cs (includes TokenInfo)
│   │   └── EmailTemplateInfo.cs
│   ├── Mapping/                           # ✅ Complete
│   │   └── EmailConfigurationDbMapping.cs
│   ├── Services/
│   │   ├── Interfaces/                    # ✅ Complete
│   │   │   ├── IEmailTopicRegistry.cs     # ✅
│   │   │   ├── IEmailTokenResolver.cs     # ✅
│   │   │   ├── IEmailTemplateDiscoveryService.cs  # ✅
│   │   │   ├── IEmailConfigurationService.cs      # ✅
│   │   │   └── IEmailService.cs           # ✅
│   │   ├── EmailTopicRegistry.cs          # ✅
│   │   ├── EmailTokenResolver.cs          # ✅
│   │   ├── EmailTemplateDiscoveryService.cs  # ✅
│   │   ├── EmailConfigurationService.cs   # ✅
│   │   ├── EmailService.cs                # ✅
│   │   └── Parameters/                    # ✅
│   │       ├── EmailConfigurationQueryParameters.cs
│   │       ├── CreateEmailConfigurationParameters.cs
│   │       └── UpdateEmailConfigurationParameters.cs
│   ├── Handlers/                          # ✅ Complete
│   │   └── EmailNotificationHandler.cs
│   └── EmailSettings.cs                   # ✅

├── Webhooks/
│   ├── Models/
│   │   ├── OutboundDelivery.cs            # ✅ (renamed from WebhookDelivery)
│   │   └── OutboundDeliveryResult.cs      # ✅
│   ├── Dtos/
│   │   ├── OutboundDeliveryDto.cs         # ✅ (renamed)
│   │   └── OutboundDeliveryResultDto.cs   # ✅
│   ├── Mapping/
│   │   └── OutboundDeliveryDbMapping.cs   # ✅
│   └── Services/
│       ├── OutboundDeliveryJob.cs         # ✅ (processes webhooks AND emails)
│       └── Parameters/
│           └── OutboundDeliveryQueryParameters.cs  # ✅

├── Shared/Models/Enums/
│   ├── OutboundDeliveryType.cs            # ✅
│   └── OutboundDeliveryStatus.cs          # ✅

├── Notifications/
│   ├── CustomerNotifications/
│   │   └── CustomerPasswordResetRequestedNotification.cs  # ✅
│   └── CheckoutNotifications/
│       ├── CheckoutAbandonedNotification.cs     # ✅
│       ├── CheckoutRecoveredNotification.cs     # ✅
│       └── CheckoutRecoveryConvertedNotification.cs  # ✅

src/Merchello/
├── Controllers/
│   ├── EmailConfigurationApiController.cs      # ✅
│   └── EmailMetadataApiController.cs           # ✅
├── Email/
│   └── EmailRazorViewRenderer.cs               # ✅

src/Merchello/Client/src/
├── email/                                 # ✅ Complete
│   ├── components/
│   │   ├── email-list.element.ts
│   │   └── email-editor.element.ts
│   ├── modals/
│   │   ├── email-preview-modal.element.ts
│   │   └── email-preview-modal.token.ts
│   ├── contexts/
│   │   └── email-workspace.context.ts
│   ├── types/
│   │   └── email.types.ts
│   └── manifest.ts
```

---

## Sample Templates

### OrderConfirmation.cshtml

```html
@model Merchello.Core.Email.Models.EmailModel<Merchello.Core.Notifications.Order.OrderCreatedNotification>

<!DOCTYPE html>
<html>
<head>
    <title>Order Confirmation</title>
</head>
<body>
    <h1>Thank you for your order!</h1>
    <p>Hi @Model.Notification.Order.BillingAddress?.Name,</p>
    <p>Your order <strong>#@Model.Notification.Order.InvoiceNumber</strong> has been received.</p>

    <h2>Order Summary</h2>
    <table>
        @foreach (var item in Model.Notification.Order.LineItems)
        {
            <tr>
                <td>@item.Name</td>
                <td>@item.Quantity x @item.Amount.ToString("C")</td>
            </tr>
        }
        <tr>
            <td><strong>Total</strong></td>
            <td><strong>@Model.Notification.Order.Total.ToString("C")</strong></td>
        </tr>
    </table>

    <p>Thank you for shopping with @Model.Store.Name!</p>
</body>
</html>
```

### AbandonedCart.cshtml

```html
@model Merchello.Core.Email.Models.EmailModel<Merchello.Core.Notifications.CheckoutNotifications.CheckoutAbandonedNotification>

<!DOCTYPE html>
<html>
<head>
    <title>Complete Your Purchase</title>
</head>
<body>
    <h1>Don't forget your items!</h1>
    <p>You left @Model.Notification.BasketTotal.ToString("C") worth of items in your cart.</p>

    <a href="@Model.Notification.RecoveryLink" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none;">
        Complete Your Purchase
    </a>

    <p>If you have any questions, contact us at @Model.Store.SupportEmail</p>
</body>
</html>
```

---

## Testing

### Manual Testing Checklist

1. [ ] Configure SMTP in `Umbraco:CMS:Global:Smtp`
2. [ ] Create an email configuration for `order.created`
3. [ ] Use preview to verify template renders
4. [ ] Send test email to verify delivery
5. [ ] Create an order and verify email is sent automatically
6. [ ] Verify delivery log shows the email
7. [ ] Test retry by temporarily breaking SMTP

### Unit Tests

- [ ] Token resolver correctly extracts values
- [ ] Template discovery finds .cshtml files
- [ ] Configuration service CRUD operations
- [ ] Topic registry returns correct notification types

### Integration Tests

- [ ] End-to-end: notification → handler → queue → delivery
- [ ] Retry mechanism works with failed SMTP
- [ ] Preview renders correctly with sample data

---

## Implementation Status

### Completed (Phases 1-5)

- ✅ OutboundDelivery refactoring (unified webhook + email delivery infrastructure)
- ✅ Email models, DTOs, and database mapping
- ✅ All email services (TopicRegistry, TokenResolver, TemplateDiscovery, ConfigurationService, EmailService)
- ✅ EmailNotificationHandler for 13 notification types
- ✅ New checkout notifications (Abandoned, Recovered, Converted)
- ✅ CustomerPasswordResetRequestedNotification
- ✅ Service registration in Startup.cs
- ✅ API controllers (EmailConfigurationApiController, EmailMetadataApiController)
- ✅ Backoffice UI (Email Builder workspace, list, editor, preview modal)
- ✅ OutboundDeliveryJob processes both webhooks AND emails

### Remaining (Phase 6)

1. **Create sample Razor templates** - Order confirmation, shipping notification, abandoned cart, etc.
2. **Run database migration** - Create `merchelloEmailConfigurations` and update `merchelloOutboundDeliveries` tables
