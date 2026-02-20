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
14. [MJML Email Templates](#mjml-email-templates)
15. [Email Attachments](#email-attachments)
16. [Testing](#testing)

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
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Notification Published (e.g., OrderCreatedNotification)            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                    â”‚
                                    â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  EmailNotificationHandler (priority 2000, like WebhookHandler)      â”‚
â”‚    - Looks up EmailConfigurations for topic                         â”‚
â”‚    - For each enabled config: queue email delivery                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                    â”‚
                                    â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  IEmailService                                                       â”‚
â”‚    - QueueDeliveryAsync() â†’ creates OutboundDelivery record         â”‚
â”‚    - RenderTemplateAsync() â†’ Razor view â†’ HTML string               â”‚
â”‚    - ResolveTokensAsync() â†’ {{path}} â†’ actual values                â”‚
â”‚    - SendAsync() â†’ calls Umbraco IEmailSender                       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                    â”‚
                                    â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  OutboundDeliveryJob (shared background service)                    â”‚
â”‚    - Processes pending deliveries (webhooks AND emails)             â”‚
â”‚    - Handles retry with exponential backoff                         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                    â”‚
                                    â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Umbraco IEmailSender                                               â”‚
â”‚    - Uses SMTP config from Umbraco:CMS:Global:Smtp                  â”‚
â”‚    - Handles actual email delivery via MailKit                      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Implementation Progress

### Phase 1: OutboundDelivery Refactoring âœ… COMPLETED

| Task | Status | Files |
|------|--------|-------|
| Create `OutboundDeliveryType` enum | âœ… | `src/Merchello.Core/Shared/Models/Enums/OutboundDeliveryType.cs` |
| Create `OutboundDeliveryStatus` enum | âœ… | `src/Merchello.Core/Shared/Models/Enums/OutboundDeliveryStatus.cs` |
| Rename `WebhookDelivery` â†’ `OutboundDelivery` | âœ… | `src/Merchello.Core/Webhooks/Models/WebhookDelivery.cs` |
| Rename `WebhookDeliveryResult` â†’ `OutboundDeliveryResult` | âœ… | `src/Merchello.Core/Webhooks/Models/OutboundDeliveryResult.cs` |
| Rename `WebhookDeliveryQueryParameters` â†’ `OutboundDeliveryQueryParameters` | âœ… | `src/Merchello.Core/Webhooks/Services/Parameters/OutboundDeliveryQueryParameters.cs` |
| Update `IWebhookDispatcher` | âœ… | Uses `OutboundDelivery` and `OutboundDeliveryResult` |
| Update `WebhookDispatcher` | âœ… | Uses `OutboundDelivery` and `OutboundDeliveryResult` |
| Rename `WebhookDeliveryJob` â†’ `OutboundDeliveryJob` | âœ… | `src/Merchello.Core/Webhooks/Services/OutboundDeliveryJob.cs` |
| Update `WebhookSubscription` navigation property | âœ… | Uses `ICollection<OutboundDelivery>` |
| Update `WebhooksApiController` | âœ… | Uses all new types |
| Update `WebhookDeliveryDto` â†’ `OutboundDeliveryDto` | âœ… | `src/Merchello.Core/Webhooks/Dtos/WebhookDeliveryDto.cs` |
| Create `OutboundDeliveryDbMapping` | âœ… | `src/Merchello.Core/Webhooks/Mapping/OutboundDeliveryDbMapping.cs` |
| Delete old files | âœ… | Removed obsolete WebhookDelivery* files |

### Phase 1: Email Infrastructure âœ… COMPLETED

| Task | Status | Files |
|------|--------|-------|
| Create `EmailConfiguration` entity | âœ… | `src/Merchello.Core/Email/Models/EmailConfiguration.cs` |
| Create `EmailModel<T>` wrapper | âœ… | `src/Merchello.Core/Email/Models/EmailModel.cs` |
| Create `EmailStoreContext` | âœ… | `src/Merchello.Core/Email/Models/EmailStoreContext.cs` |
| Create `EmailTopic` and `TokenInfo` | âœ… | `src/Merchello.Core/Email/Models/EmailTopic.cs` |
| Create `EmailTemplateInfo` | âœ… | `src/Merchello.Core/Email/Models/EmailTemplateInfo.cs` |
| Create `EmailSettings` | âœ… | `src/Merchello.Core/Email/EmailSettings.cs` |
| Create `EmailConfigurationDbMapping` | âœ… | `src/Merchello.Core/Email/Mapping/EmailConfigurationDbMapping.cs` |
| Add to `MerchelloDbContext` | âœ… | Added `EmailConfigurations` and `OutboundDeliveries` DbSets |
| Update `appsettings.json` | âœ… | Added `Merchello:Email` section |
| Register in `Startup.cs` | âœ… | Registered `EmailSettings` |

### Phase 2: Email Services âœ… COMPLETED

| Task | Status | Files |
|------|--------|-------|
| Create `IEmailTopicRegistry` | âœ… | `src/Merchello.Core/Email/Services/Interfaces/IEmailTopicRegistry.cs` |
| Create `EmailTopicRegistry` | âœ… | `src/Merchello.Core/Email/Services/EmailTopicRegistry.cs` |
| Create `IEmailTokenResolver` | âœ… | `src/Merchello.Core/Email/Services/Interfaces/IEmailTokenResolver.cs` |
| Create `EmailTokenResolver` | âœ… | `src/Merchello.Core/Email/Services/EmailTokenResolver.cs` |
| Create `IEmailTemplateDiscoveryService` | âœ… | `src/Merchello.Core/Email/Services/Interfaces/IEmailTemplateDiscoveryService.cs` |
| Create `EmailTemplateDiscoveryService` | âœ… | `src/Merchello.Core/Email/Services/EmailTemplateDiscoveryService.cs` |
| Create `IEmailConfigurationService` | âœ… | `src/Merchello.Core/Email/Services/Interfaces/IEmailConfigurationService.cs` |
| Create `EmailConfigurationService` | âœ… | `src/Merchello.Core/Email/Services/EmailConfigurationService.cs` |
| Create `IEmailService` | âœ… | `src/Merchello.Core/Email/Services/Interfaces/IEmailService.cs` |
| Create `EmailService` | âœ… | `src/Merchello.Core/Email/Services/EmailService.cs` |
| Create `EmailRazorViewRenderer` | âœ… | `src/Merchello/Email/EmailRazorViewRenderer.cs` |
| Create `EmailPreviewDto` | âœ… | `src/Merchello.Core/Email/Dtos/EmailPreviewDto.cs` |
| Create `EmailSendTestResultDto` | âœ… | `src/Merchello.Core/Email/Dtos/EmailSendTestResultDto.cs` |

### Phase 3: Notification Handler & New Notifications âœ… COMPLETED

| Task | Status | Files |
|------|--------|-------|
| Create `EmailNotificationHandler` | âœ… | `src/Merchello.Core/Email/Handlers/EmailNotificationHandler.cs` |
| Create `CustomerPasswordResetRequestedNotification` | âœ… | `src/Merchello.Core/Notifications/CustomerNotifications/CustomerPasswordResetRequestedNotification.cs` |
| Create `CheckoutAbandonedNotification` | âœ… | `src/Merchello.Core/Notifications/CheckoutNotifications/CheckoutAbandonedNotification.cs` |
| Create `CheckoutRecoveredNotification` | âœ… | `src/Merchello.Core/Notifications/CheckoutNotifications/CheckoutRecoveredNotification.cs` |
| Create `CheckoutRecoveryConvertedNotification` | âœ… | `src/Merchello.Core/Notifications/CheckoutNotifications/CheckoutRecoveryConvertedNotification.cs` |
| Update `EmailTopicRegistry` with new topics | âœ… | Added customer.password_reset, checkout.abandoned, checkout.recovered, checkout.converted |
| Register handlers in `Startup.cs` | âœ… | All 13 notification handlers registered (lines 313-331) |

### Phase 4: API Endpoints âœ… COMPLETED

| Task | Status | Files |
|------|--------|-------|
| Create `EmailConfigurationApiController` | âœ… | `src/Merchello/Controllers/EmailConfigurationApiController.cs` |
| Create `EmailMetadataApiController` | âœ… | `src/Merchello/Controllers/EmailMetadataApiController.cs` |
| Create `EmailConfigurationDto` | âœ… | `src/Merchello.Core/Email/Dtos/EmailConfigurationDto.cs` |
| Create `EmailTopicDto` | âœ… | `src/Merchello.Core/Email/Dtos/EmailTopicDto.cs` |

### Phase 5: Backoffice UI âœ… COMPLETED

| Task | Status | Files |
|------|--------|-------|
| Create email workspace manifest | âœ… | `src/Merchello/Client/src/email/manifest.ts` |
| Create email configuration list | âœ… | `src/Merchello/Client/src/email/components/email-list.element.ts` |
| Create email configuration editor | âœ… | `src/Merchello/Client/src/email/components/email-editor.element.ts` |
| Create token autocomplete component | âœ… | Expression builder with token support |
| Create email preview modal | âœ… | `src/Merchello/Client/src/email/modals/email-preview-modal.element.ts` |

### Phase 6: MJML Templates & Sample Templates âœ… COMPLETED

| Task | Status | Files |
|------|--------|-------|
| Add Mjml.Net NuGet package | âœ… | `src/Merchello.Core/Merchello.Core.csproj` |
| Create `IMjmlCompiler` interface | âœ… | `src/Merchello.Core/Email/Services/Interfaces/IMjmlCompiler.cs` |
| Create `MjmlCompiler` service | âœ… | `src/Merchello.Core/Email/Services/MjmlCompiler.cs` |
| Add `EmailThemeSettings` | âœ… | `src/Merchello.Core/Email/EmailSettings.cs` |
| Update `EmailRazorViewRenderer` for MJML | âœ… | `src/Merchello/Email/EmailRazorViewRenderer.cs` |
| Create `MjmlHtmlHelperExtensions` | âœ… | `src/Merchello/Email/MjmlHtmlHelperExtensions.cs` |
| Create `MjmlHelper` | âœ… | `src/Merchello/Email/MjmlHelper.cs` |
| Create RCL shared views | âœ… | `src/Merchello/App_Plugins/Merchello/Views/Emails/` |
| Create sample OrderConfirmation template | âœ… | `src/Merchello.Site/Views/Emails/OrderConfirmation.cshtml` |

### Phase 7: Database Migration â³ PENDING

| Task | Status |
|------|--------|
| Run database migration | â³ |

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

### IEmailTopicRegistry âœ… IMPLEMENTED

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
| **Checkout** | `checkout.abandoned.first` | `CheckoutAbandonedFirstNotification` | First recovery email |
| | `checkout.abandoned.reminder` | `CheckoutAbandonedReminderNotification` | Follow-up reminder |
| | `checkout.abandoned.final` | `CheckoutAbandonedFinalNotification` | Last chance email |
| | `checkout.recovered` | `CheckoutRecoveredNotification` | Recovery analytics |
| | `checkout.converted` | `CheckoutRecoveryConvertedNotification` | Conversion tracking |
| **Inventory** | `inventory.low_stock` | `LowStockNotification` | Low stock alert |

### IEmailTokenResolver âœ… IMPLEMENTED

```csharp
public interface IEmailTokenResolver
{
    // Synchronous methods - token resolution is CPU-bound, no async needed
    string ResolveTokens(string template, object model);
    string? ResolveToken(string path, object model);
    IReadOnlyList<TokenInfo> GetAvailableTokens(string topic);
    IReadOnlyList<TokenInfo> GetAvailableTokens(Type notificationType);
}
```

### IEmailTemplateDiscoveryService âœ… IMPLEMENTED

```csharp
public interface IEmailTemplateDiscoveryService
{
    IReadOnlyList<EmailTemplateInfo> GetAvailableTemplates();
    bool TemplateExists(string templatePath);
    EmailTemplateInfo? GetTemplate(string templatePath);
    string? GetFullPath(string templatePath);
}
```

### IEmailConfigurationService âœ… IMPLEMENTED

```csharp
public interface IEmailConfigurationService
{
    Task<EmailConfiguration?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<EmailConfiguration>> GetByTopicAsync(string topic, CancellationToken ct = default);
    Task<IReadOnlyList<EmailConfiguration>> GetEnabledByTopicAsync(string topic, CancellationToken ct = default);
    Task<IReadOnlyDictionary<string, IReadOnlyList<EmailConfiguration>>> GetByCategoryAsync(CancellationToken ct = default);
    Task<PaginatedList<EmailConfiguration>> QueryAsync(EmailConfigurationQueryParameters parameters, CancellationToken ct = default);
    Task<CrudResult<EmailConfiguration>> CreateAsync(CreateEmailConfigurationParameters parameters, CancellationToken ct = default);
    Task<CrudResult<EmailConfiguration>> UpdateAsync(UpdateEmailConfigurationParameters parameters, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<CrudResult<EmailConfiguration>> ToggleEnabledAsync(Guid id, CancellationToken ct = default);
    Task IncrementSentCountAsync(Guid id, CancellationToken ct = default);
    Task IncrementFailedCountAsync(Guid id, CancellationToken ct = default);
}
```

### IEmailService âœ… IMPLEMENTED

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

**Checkout Abandoned (`checkout.abandoned.first`, `.reminder`, `.final`):**
```
{{customerEmail}}
{{basketTotal}}
{{recoveryLink}}
{{abandonedCheckout.id}}
{{emailSequenceNumber}}
{{store.name}}
```

---

## Configuration

### appsettings.json

> Note: email defaults/theme and store identity fields are now DB-backed and edited in the Merchello root workspace tabs (`Store` and `Email`).  
> Keep only delivery/infra options in `Merchello:Email`.

```json
{
  "Merchello": {
    "Email": {
      "TemplateViewLocations": [
        "/App_Plugins/Merchello/Views/Emails/{0}.cshtml",
        "/Views/Emails/{0}.cshtml"
      ],
      "MaxRetries": 3,
      "RetryDelaysSeconds": [60, 300, 900],
      "DeliveryRetentionDays": 30
    }
  }
}
```

### EmailSettings.cs âœ… IMPLEMENTED

```csharp
public class EmailSettings
{
    public bool Enabled { get; set; } = true;
    public string[] TemplateViewLocations { get; set; } =
    [
        "/App_Plugins/Merchello/Views/Emails/{0}.cshtml",
        "/Views/Emails/{0}.cshtml"
    ];
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

### EmailConfigurationApiController âœ… IMPLEMENTED

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

### EmailMetadataApiController âœ… IMPLEMENTED

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/emails/topics` | List available topics with tokens |
| GET | `/api/v1/emails/topics/categories` | List topics grouped by category |
| GET | `/api/v1/emails/topics/{topic}/tokens` | Get tokens for topic |
| GET | `/api/v1/emails/templates` | List available template files |
| GET | `/api/v1/emails/templates/exists` | Check if template exists |
| GET | `/api/v1/emails/attachments` | List all available attachment types |
| GET | `/api/v1/emails/attachments?topic={topic}` | List attachments compatible with topic |

### Delivery Endpoints (via WebhooksApiController) âœ… IMPLEMENTED

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/webhooks/{id}/deliveries` | List deliveries for a subscription |
| GET | `/api/v1/webhooks/deliveries/{id}` | Get delivery details |
| POST | `/api/v1/webhooks/deliveries/{id}/retry` | Retry failed delivery |

Note: Delivery records are shared between webhooks and emails via the `OutboundDelivery` table with `DeliveryType` discriminator.

---

## Backoffice UI

### Email Builder Workspace âœ… IMPLEMENTED

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
â”œâ”€â”€ Email/
â”‚   â”œâ”€â”€ Attachments/                       # Pluggable attachment system
â”‚   â”‚   â”œâ”€â”€ IEmailAttachment.cs            # Base + generic interfaces
â”‚   â”‚   â”œâ”€â”€ EmailAttachmentResult.cs       # Attachment result model
â”‚   â”‚   â”œâ”€â”€ EmailAttachmentInfo.cs         # Metadata for UI
â”‚   â”‚   â”œâ”€â”€ IEmailAttachmentResolver.cs    # Resolver interface
â”‚   â”‚   â”œâ”€â”€ EmailAttachmentResolver.cs     # Resolver implementation
â”‚   â”‚   â”œâ”€â”€ InvoiceSavedPdfAttachment.cs   # Built-in PDF invoice
â”‚   â”‚   â”œâ”€â”€ OrderInvoicePdfAttachment.cs   # Built-in order PDF
â”‚   â”‚   â”œâ”€â”€ OrderLineItemsCsvAttachment.cs # Built-in CSV export
â”‚   â”‚   â”œâ”€â”€ AttachmentIcons.cs             # Shared SVG icons
â”‚   â”‚   â””â”€â”€ Helpers/
â”‚   â”‚       â””â”€â”€ CsvAttachmentHelper.cs     # CSV generation utility
â”‚   â”œâ”€â”€ Dtos/                              # âœ… Complete
â”‚   â”‚   â”œâ”€â”€ EmailConfigurationDto.cs
â”‚   â”‚   â”œâ”€â”€ EmailPreviewDto.cs
â”‚   â”‚   â”œâ”€â”€ EmailSendTestResultDto.cs
â”‚   â”‚   â”œâ”€â”€ EmailAttachmentDto.cs          # Attachment metadata DTO
â”‚   â”‚   â”œâ”€â”€ EmailAttachmentListDto.cs      # Attachment list response
â”‚   â”‚   â””â”€â”€ EmailTopicDto.cs
â”‚   â”œâ”€â”€ Models/                            # âœ… Complete
â”‚   â”‚   â”œâ”€â”€ EmailConfiguration.cs
â”‚   â”‚   â”œâ”€â”€ EmailModel.cs
â”‚   â”‚   â”œâ”€â”€ EmailStoreContext.cs
â”‚   â”‚   â”œâ”€â”€ EmailTopic.cs (includes TokenInfo)
â”‚   â”‚   â””â”€â”€ EmailTemplateInfo.cs
â”‚   â”œâ”€â”€ Mapping/                           # âœ… Complete
â”‚   â”‚   â””â”€â”€ EmailConfigurationDbMapping.cs
â”‚   â”œâ”€â”€ Services/
â”‚   â”‚   â”œâ”€â”€ Interfaces/                    # âœ… Complete
â”‚   â”‚   â”‚   â”œâ”€â”€ IEmailTopicRegistry.cs     # âœ…
â”‚   â”‚   â”‚   â”œâ”€â”€ IEmailTokenResolver.cs     # âœ…
â”‚   â”‚   â”‚   â”œâ”€â”€ IEmailTemplateDiscoveryService.cs  # âœ…
â”‚   â”‚   â”‚   â”œâ”€â”€ IEmailConfigurationService.cs      # âœ…
â”‚   â”‚   â”‚   â”œâ”€â”€ IEmailService.cs           # âœ…
â”‚   â”‚   â”‚   â””â”€â”€ IMjmlCompiler.cs           # âœ… MJML compilation interface
â”‚   â”‚   â”œâ”€â”€ EmailTopicRegistry.cs          # âœ…
â”‚   â”‚   â”œâ”€â”€ EmailTokenResolver.cs          # âœ…
â”‚   â”‚   â”œâ”€â”€ EmailTemplateDiscoveryService.cs  # âœ…
â”‚   â”‚   â”œâ”€â”€ EmailConfigurationService.cs   # âœ…
â”‚   â”‚   â”œâ”€â”€ EmailService.cs                # âœ…
â”‚   â”‚   â”œâ”€â”€ MjmlCompiler.cs                # âœ… Mjml.Net wrapper
â”‚   â”‚   â””â”€â”€ Parameters/                    # âœ…
â”‚   â”‚       â”œâ”€â”€ EmailConfigurationQueryParameters.cs
â”‚   â”‚       â”œâ”€â”€ CreateEmailConfigurationParameters.cs
â”‚   â”‚       â””â”€â”€ UpdateEmailConfigurationParameters.cs
â”‚   â”œâ”€â”€ Handlers/                          # âœ… Complete
â”‚   â”‚   â””â”€â”€ EmailNotificationHandler.cs
â”‚   â””â”€â”€ EmailSettings.cs                   # âœ… (includes EmailThemeSettings)

â”œâ”€â”€ Webhooks/
â”‚   â”œâ”€â”€ Models/
â”‚   â”‚   â”œâ”€â”€ OutboundDelivery.cs            # âœ… (renamed from WebhookDelivery)
â”‚   â”‚   â””â”€â”€ OutboundDeliveryResult.cs      # âœ…
â”‚   â”œâ”€â”€ Dtos/
â”‚   â”‚   â”œâ”€â”€ OutboundDeliveryDto.cs         # âœ… (renamed)
â”‚   â”‚   â””â”€â”€ OutboundDeliveryResultDto.cs   # âœ…
â”‚   â”œâ”€â”€ Mapping/
â”‚   â”‚   â””â”€â”€ OutboundDeliveryDbMapping.cs   # âœ…
â”‚   â””â”€â”€ Services/
â”‚       â”œâ”€â”€ OutboundDeliveryJob.cs         # âœ… (processes webhooks AND emails)
â”‚       â””â”€â”€ Parameters/
â”‚           â””â”€â”€ OutboundDeliveryQueryParameters.cs  # âœ…

â”œâ”€â”€ Shared/Models/Enums/
â”‚   â”œâ”€â”€ OutboundDeliveryType.cs            # âœ…
â”‚   â””â”€â”€ OutboundDeliveryStatus.cs          # âœ…

â”œâ”€â”€ Notifications/
â”‚   â”œâ”€â”€ CustomerNotifications/
â”‚   â”‚   â””â”€â”€ CustomerPasswordResetRequestedNotification.cs  # âœ…
â”‚   â””â”€â”€ CheckoutNotifications/
â”‚       â”œâ”€â”€ CheckoutAbandonedNotification.cs     # âœ…
â”‚       â”œâ”€â”€ CheckoutRecoveredNotification.cs     # âœ…
â”‚       â””â”€â”€ CheckoutRecoveryConvertedNotification.cs  # âœ…

src/Merchello/
â”œâ”€â”€ Controllers/
â”‚   â”œâ”€â”€ EmailConfigurationApiController.cs      # âœ…
â”‚   â””â”€â”€ EmailMetadataApiController.cs           # âœ…
â”œâ”€â”€ Email/
â”‚   â”œâ”€â”€ EmailRazorViewRenderer.cs               # âœ… (includes MJML compilation)
â”‚   â”œâ”€â”€ MjmlHtmlHelperExtensions.cs             # âœ… @Html.Mjml() extension
â”‚   â””â”€â”€ MjmlHelper.cs                           # âœ… IMjmlHelper implementation
â”œâ”€â”€ Views/
â”‚   â””â”€â”€ Emails/                                 # RCL embedded views (ships with package)
â”‚       â”œâ”€â”€ _ViewImports.cshtml                 # âœ… Shared imports
â”‚       â”œâ”€â”€ _EmailLayout.cshtml                 # âœ… Base MJML layout with theme
â”‚       â””â”€â”€ Shared/
â”‚           â”œâ”€â”€ _EmailHeader.cshtml             # âœ… Header partial
â”‚           â”œâ”€â”€ _EmailFooter.cshtml             # âœ… Footer partial
â”‚           â””â”€â”€ _OrderSummary.cshtml            # âœ… Order line items partial

src/Merchello/Client/src/
â”œâ”€â”€ email/                                 # âœ… Complete
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ email-list.element.ts
â”‚   â”‚   â””â”€â”€ email-editor.element.ts
â”‚   â”œâ”€â”€ modals/
â”‚   â”‚   â”œâ”€â”€ email-preview-modal.element.ts
â”‚   â”‚   â””â”€â”€ email-preview-modal.token.ts
â”‚   â”œâ”€â”€ contexts/
â”‚   â”‚   â””â”€â”€ email-workspace.context.ts
â”‚   â”œâ”€â”€ types/
â”‚   â”‚   â””â”€â”€ email.types.ts
â”‚   â””â”€â”€ manifest.ts

src/Merchello.Site/
â””â”€â”€ Views/
    â””â”€â”€ Emails/                                 # Example templates (developer reference)
        â””â”€â”€ OrderConfirmation.cshtml            # âœ… MJML example template
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

### AbandonedCart-First.cshtml

```html
@model Merchello.Core.Email.Models.EmailModel<Merchello.Core.Notifications.CheckoutNotifications.CheckoutAbandonedFirstNotification>

<!DOCTYPE html>
<html>
<head>
    <title>You left something behind!</title>
</head>
<body>
    <h1>Don't forget your items!</h1>
    <p>You left @Model.Notification.FormattedTotal worth of items in your cart.</p>

    <a href="@Model.Notification.RecoveryLink" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none;">
        Complete Your Purchase
    </a>

    <p>If you have any questions, contact us at @Model.Store.Email</p>
</body>
</html>
```

### AbandonedCart-Reminder.cshtml

```html
@model Merchello.Core.Email.Models.EmailModel<Merchello.Core.Notifications.CheckoutNotifications.CheckoutAbandonedReminderNotification>

<!DOCTYPE html>
<html>
<head>
    <title>Still thinking it over?</title>
</head>
<body>
    <h1>Your cart is waiting</h1>
    <p>We noticed you haven't completed your purchase of @Model.Notification.FormattedTotal.</p>
    <p>Your items are still saved - just click below to pick up where you left off.</p>

    <a href="@Model.Notification.RecoveryLink" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none;">
        Return to Your Cart
    </a>

    <p>Questions? Reply to this email or contact @Model.Store.Email</p>
</body>
</html>
```

### AbandonedCart-Final.cshtml

```html
@model Merchello.Core.Email.Models.EmailModel<Merchello.Core.Notifications.CheckoutNotifications.CheckoutAbandonedFinalNotification>

<!DOCTYPE html>
<html>
<head>
    <title>Last chance!</title>
</head>
<body>
    <h1>Last chance to complete your purchase</h1>
    <p>Your cart with @Model.Notification.FormattedTotal worth of items will expire soon.</p>

    <a href="@Model.Notification.RecoveryLink" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none;">
        Complete Purchase Now
    </a>

    <p>After this, your cart will be cleared and you'll need to start over.</p>
    <p>Need help? Contact us at @Model.Store.Email</p>
</body>
</html>
```

---

## MJML Email Templates

Merchello includes built-in support for MJML (Mailjet Markup Language), which compiles to responsive HTML that works across all email clients. Templates can use `@Html.Mjml()` helpers, raw MJML, or a mix of both.

### Getting Started

1. Create a `.cshtml` file in `/Views/Emails/`
2. Add the `@model` directive for your notification type
3. Use MJML markup with optional `@Html.Mjml()` helpers
4. The system automatically detects and compiles MJML to responsive HTML

### Template Model Reference

When creating email templates, use the correct `@model` directive for each notification topic:

| Topic | Model Directive | Key Properties |
|-------|----------------|----------------|
| `order.created` | `@model EmailModel<OrderCreatedNotification>` | `Order`, `Order.Invoice`, `Order.Invoice.LineItems` |
| `order.status_changed` | `@model EmailModel<OrderStatusChangedNotification>` | `Order`, `OldStatus`, `NewStatus` |
| `order.cancelled` | `@model EmailModel<InvoiceCancelledNotification>` | `Invoice`, `Reason` |
| `payment.created` | `@model EmailModel<PaymentCreatedNotification>` | `Payment`, `Invoice` |
| `payment.refunded` | `@model EmailModel<PaymentRefundedNotification>` | `Payment`, `RefundAmount` |
| `shipment.created` | `@model EmailModel<ShipmentCreatedNotification>` | `Shipment`, `TrackingNumber`, `Order` |
| `shipment.updated` | `@model EmailModel<ShipmentSavedNotification>` | `Shipment` |
| `shipment.status_changed` | `@model EmailModel<ShipmentStatusChangedNotification>` | `Shipment`, `OldStatus`, `NewStatus` |
| `customer.created` | `@model EmailModel<CustomerCreatedNotification>` | `Customer` |
| `customer.updated` | `@model EmailModel<CustomerSavedNotification>` | `Customer` |
| `customer.password_reset` | `@model EmailModel<CustomerPasswordResetRequestedNotification>` | `Customer`, `ResetToken`, `ResetLink` |
| `checkout.abandoned.first` | `@model EmailModel<CheckoutAbandonedFirstNotification>` | `RecoveryLink`, `BasketTotal`, `AbandonedCheckout` |
| `checkout.abandoned.reminder` | `@model EmailModel<CheckoutAbandonedReminderNotification>` | `RecoveryLink`, `BasketTotal`, `AbandonedCheckout` |
| `checkout.abandoned.final` | `@model EmailModel<CheckoutAbandonedFinalNotification>` | `RecoveryLink`, `BasketTotal`, `AbandonedCheckout` |
| `checkout.recovered` | `@model EmailModel<CheckoutRecoveredNotification>` | `AbandonedCheckout`, `Order` |
| `checkout.converted` | `@model EmailModel<CheckoutRecoveryConvertedNotification>` | `AbandonedCheckout`, `Order` |
| `inventory.low_stock` | `@model EmailModel<LowStockNotification>` | `Product`, `CurrentStock`, `Threshold` |
| `invoice.reminder` | `@model EmailModel<InvoiceReminderNotification>` | `Invoice`, `DaysOverdue` |
| `invoice.overdue` | `@model EmailModel<InvoiceOverdueNotification>` | `Invoice`, `DaysOverdue` |

**Note:** All models are wrapped in `EmailModel<TNotification>` which provides:
- `Model.Notification` - The notification with event-specific data
- `Model.Store` - Store context (name, logo, email, website URL, support email)
- `Model.Configuration` - The email configuration that triggered this email

### Required Using Statements

Add these at the top of your template:

```cshtml
@using Merchello.Core.Email.Models
@using Merchello.Core.Notifications.Order
@using Merchello.Email
```

### MJML Helper Methods

The `@Html.Mjml()` extension provides the following helpers:

#### Structure Helpers

| Helper | Description | Example |
|--------|-------------|---------|
| `EmailStart(title, preview?)` | Opens MJML document with `<mjml>`, `<mj-head>`, `<mj-body>` | `@Html.Mjml().EmailStart("Order Confirmed", "Thank you!")` |
| `EmailEnd()` | Closes MJML document | `@Html.Mjml().EmailEnd()` |

#### Component Helpers

| Helper | Description | Parameters |
|--------|-------------|------------|
| `Header(store)` | Store logo and branding header | `EmailStoreContext` |
| `Footer(store)` | Contact info, support links | `EmailStoreContext` |
| `Button(text, url, bgColor?)` | Call-to-action button | Text, URL, optional background color |
| `Text(content, bold?, fontSize?)` | Styled text block | Content, optional bold, optional font size |
| `Heading(text, level?)` | Heading (H1-H4) | Text, level (1-4, default 1) |
| `Divider()` | Horizontal divider line | - |
| `Spacer(height?)` | Vertical spacing | Height in pixels (default 20) |

#### E-commerce Helpers

| Helper | Description | Parameters |
|--------|-------------|------------|
| `OrderSummary(invoice)` | Full order with line items, totals | `Invoice` |
| `AddressBlock(address, title?)` | Formatted address | `Address`, optional title |
| `LineItemsTable(items)` | Line items table only | `IEnumerable<LineItem>` |

### Example: Order Confirmation Template

```cshtml
@using Merchello.Core.Email.Models
@using Merchello.Core.Notifications.Order
@using Merchello.Email
@model EmailModel<OrderCreatedNotification>

@Html.Mjml().EmailStart(
    $"Order #{Model.Notification.Order.Invoice?.InvoiceNumber} Confirmed",
    $"Thank you for your order!")

@Html.Mjml().Header(Model.Store)

<mj-section>
  <mj-column>
    @Html.Mjml().Heading("Order Confirmed")
    @Html.Mjml().Text($"Hi {Model.Notification.Order.Invoice?.BillingAddress?.Name ?? "there"},")
    <mj-text>
      Thank you for your order! We've received it and will begin processing shortly.
      You'll receive another email when your order ships.
    </mj-text>
    @Html.Mjml().Text($"Order #{Model.Notification.Order.Invoice?.InvoiceNumber}", bold: true)
  </mj-column>
</mj-section>

@if (Model.Notification.Order.Invoice != null)
{
    @Html.Mjml().OrderSummary(Model.Notification.Order.Invoice)

    <mj-section>
      <mj-column>
        @Html.Mjml().AddressBlock(Model.Notification.Order.Invoice.ShippingAddress, "Shipping Address")
      </mj-column>
      <mj-column>
        @Html.Mjml().AddressBlock(Model.Notification.Order.Invoice.BillingAddress, "Billing Address")
      </mj-column>
    </mj-section>
}

<mj-section>
  <mj-column>
    @Html.Mjml().Button("View Order", $"{Model.Store.WebsiteUrl}/account/orders/{Model.Notification.Order.Id}")
  </mj-column>
</mj-section>

@Html.Mjml().Footer(Model.Store)
@Html.Mjml().EmailEnd()
```

### Example: Abandoned Cart Template

```cshtml
@using Merchello.Core.Email.Models
@using Merchello.Core.Notifications.CheckoutNotifications
@using Merchello.Email
@model EmailModel<CheckoutAbandonedFirstNotification>

@Html.Mjml().EmailStart("You left something behind!", "Complete your purchase")

@Html.Mjml().Header(Model.Store)

<mj-section>
  <mj-column>
    @Html.Mjml().Heading("Don't forget your items!")
    @Html.Mjml().Text($"You left {Model.Notification.FormattedTotal} worth of items in your cart.")
    @Html.Mjml().Spacer(20)
    @Html.Mjml().Button("Complete Your Purchase", Model.Notification.RecoveryLink)
  </mj-column>
</mj-section>

<mj-section>
  <mj-column>
    <mj-text>
      If you have any questions, contact us at
      <a href="mailto:@Model.Store.Email">@Model.Store.Email</a>
    </mj-text>
  </mj-column>
</mj-section>

@Html.Mjml().Footer(Model.Store)
@Html.Mjml().EmailEnd()
```

### Theme Configuration

Customize email appearance via `appsettings.json`:

```json
{
  "Merchello": {
    "Email": {
      "Theme": {
        "PrimaryColor": "#007bff",
        "TextColor": "#333333",
        "SecondaryTextColor": "#666666",
        "BackgroundColor": "#f4f4f4",
        "ContentBackgroundColor": "#ffffff",
        "FontFamily": "'Helvetica Neue', Helvetica, Arial, sans-serif"
      }
    }
  }
}
```

Theme settings are applied automatically to all MJML helpers and the shared layout.

### Mixing Helpers with Raw MJML

You can freely mix `@Html.Mjml()` helpers with raw MJML tags:

```cshtml
@Html.Mjml().EmailStart("My Email")

<mj-section background-color="#f0f0f0">
  <mj-column>
    @* Use a helper for text *@
    @Html.Mjml().Heading("Welcome!")

    @* Use raw MJML for custom styling *@
    <mj-text font-size="18px" color="#ff6600">
      This is custom styled text with raw MJML.
    </mj-text>

    @* Back to helpers *@
    @Html.Mjml().Button("Click Here", "https://example.com")
  </mj-column>
</mj-section>

@Html.Mjml().EmailEnd()
```

### MJML Compilation

The system automatically detects MJML content (by checking for `<mjml>` or `<mj-` tags) and compiles it to responsive HTML. If the template doesn't contain MJML, it's passed through unchanged, allowing plain HTML templates to work as before.

---

## Email Attachments

A pluggable attachment system that allows developers to create typed attachment generators discovered via `ExtensionManager` and selectable in the backoffice UI.

### Overview

- **Typed attachment generators** - `IEmailAttachment<TNotification>` interface with compile-time type safety
- **ExtensionManager discovery** - Attachments auto-discovered like shipping providers
- **Backoffice selection** - Multi-select dropdown to choose attachments per EmailConfiguration
- **Queue-time generation** - Attachments generated during `QueueDeliveryAsync()` and stored as temp files
- **File-based storage** - Attachments saved to `App_Data/Email_Attachments/` (not base64 in database)

### Interface

```csharp
public interface IEmailAttachment<TNotification> : IEmailAttachment
    where TNotification : MerchelloNotification
{
    Task<EmailAttachmentResult?> GenerateAsync(
        EmailModel<TNotification> model,
        CancellationToken ct = default);
}

public interface IEmailAttachment
{
    string Alias { get; }           // Globally unique, lowercase-kebab-case (e.g., "order-invoice-pdf")
    string DisplayName { get; }     // Shown in backoffice dropdown
    string? Description { get; }
    string? IconSvg { get; }        // Optional inline SVG for UI
    Type NotificationType { get; }  // Used for topic filtering
}
```

### Built-in Attachments

| Alias | Display Name | Topic | Description |
|-------|--------------|-------|-------------|
| `invoice-saved-pdf` | PDF Invoice | invoice.saved | Professional PDF invoice with line items, totals, payment details |
| `order-invoice-pdf` | PDF Invoice | order.created | PDF invoice for order confirmation emails |
| `order-line-items-csv` | Order Lines CSV | order.created | CSV export of order line items |

### Configuration

Settings added to `EmailSettings`:

```csharp
public class EmailSettings
{
    // ... existing properties ...

    /// <summary>
    /// Maximum size in bytes for a single attachment. Default: 10 MB.
    /// </summary>
    public long MaxAttachmentSizeBytes { get; set; } = 10 * 1024 * 1024;

    /// <summary>
    /// Maximum combined size in bytes for all attachments. Default: 25 MB.
    /// </summary>
    public long MaxTotalAttachmentSizeBytes { get; set; } = 25 * 1024 * 1024;
}
```

### Storage & Delivery

Attachments are stored as temp files to avoid database size limits (not base64 in database).

**Flow:**
1. **Queue Phase** - `IEmailAttachmentResolver.GenerateAttachmentsAsync()` generates attachments
2. **File Storage** - `IEmailAttachmentStorageService.SaveAttachmentAsync()` saves to `App_Data/Email_Attachments/{deliveryId}/`
3. **Reference Storage** - `StoredAttachmentReference` (file path, not content) serialized to `OutboundDelivery.ExtendedData["attachments"]`
4. **Delivery Phase** - Files loaded from disk and attached to email
5. **Cleanup** - Files deleted after successful delivery or by `EmailAttachmentCleanupJob` for orphaned files

**Configuration** (in `EmailSettings`):
```csharp
AttachmentStoragePath = "App_Data/Email_Attachments"  // Relative to content root
AttachmentRetentionHours = 72                          // Cleanup orphaned files after 72 hours
```

**Security:**
- Path traversal prevention via `ValidatePathSecurity()`
- Filename sanitization for invalid characters
- Storage folder protected from web access (inside `App_Data/`)

### Error Handling

- Failed attachment generation is **logged and skipped** - email still sends
- Attachments returning `null` are silently skipped (for conditional attachments)
- Attachments exceeding size limits are logged and skipped
- Attachments processed **sequentially** and sorted **alphabetically by alias**

### Backoffice UI

The email editor includes:
- **Attachments section** with multi-select dropdown filtered by selected topic
- **Attachment badges** showing selected attachments with icons
- **Topic change confirmation** when changing topic with incompatible attachments selected

### Creating Custom Attachments

```csharp
public class ShippingLabelAttachment : IEmailAttachment<ShipmentCreatedNotification>
{
    private readonly IShippingLabelService _labelService;

    public ShippingLabelAttachment(IShippingLabelService labelService)
    {
        _labelService = labelService;
    }

    public string Alias => "shipment-shipping-label-pdf";
    public string DisplayName => "Shipping Label";
    public string? Description => "Attaches the shipping label PDF";
    public string? IconSvg => AttachmentIcons.Pdf;
    public Type NotificationType => typeof(ShipmentCreatedNotification);

    public async Task<EmailAttachmentResult?> GenerateAsync(
        EmailModel<ShipmentCreatedNotification> model,
        CancellationToken ct = default)
    {
        var shipment = model.Notification.Shipment;
        if (string.IsNullOrEmpty(shipment.TrackingNumber)) return null;

        var labelBytes = await _labelService.GetLabelPdfAsync(shipment.Id, ct);
        if (labelBytes == null) return null;

        return new EmailAttachmentResult
        {
            Content = labelBytes,
            FileName = $"ShippingLabel-{shipment.TrackingNumber}.pdf",
            ContentType = "application/pdf"
        };
    }
}
```

Alias convention: `{notification-context}-{attachment-type}` (e.g., `order-invoice-pdf`, `shipment-shipping-label-pdf`)

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

- [ ] End-to-end: notification â†’ handler â†’ queue â†’ delivery
- [ ] Retry mechanism works with failed SMTP
- [ ] Preview renders correctly with sample data

---

## Implementation Status

### Completed (Phases 1-6)

- âœ… OutboundDelivery refactoring (unified webhook + email delivery infrastructure)
- âœ… Email models, DTOs, and database mapping
- âœ… All email services (TopicRegistry, TokenResolver, TemplateDiscovery, ConfigurationService, EmailService)
- âœ… EmailNotificationHandler for 13 notification types
- âœ… New checkout notifications (Abandoned, Recovered, Converted)
- âœ… CustomerPasswordResetRequestedNotification
- âœ… Service registration in Startup.cs
- âœ… API controllers (EmailConfigurationApiController, EmailMetadataApiController)
- âœ… Backoffice UI (Email Builder workspace, list, editor, preview modal)
- âœ… OutboundDeliveryJob processes both webhooks AND emails
- âœ… MJML email template system with Mjml.Net
- âœ… `@Html.Mjml()` HtmlHelper extensions (Header, Footer, Button, Text, OrderSummary, etc.)
- âœ… Shared RCL views (_EmailLayout, _EmailHeader, _EmailFooter, _OrderSummary)
- âœ… Theme configuration via EmailThemeSettings
- âœ… Example OrderConfirmation.cshtml template using MJML

### Remaining (Phase 7)

1. **Run database migration** - Create `merchelloEmailConfigurations` and update `merchelloOutboundDeliveries` tables
2. **Additional sample templates** - Shipping notification, abandoned cart, password reset, etc. (optional)

