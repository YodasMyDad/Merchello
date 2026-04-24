# Email System

Merchello's email system handles all transactional emails -- order confirmations, shipment notifications, abandoned cart recovery, password resets, and more. It is built around three ideas: **topic-based routing**, **MJML templates**, and a **reliable delivery queue** with retry support.

## How It Works

The email system connects internal Merchello [notifications](../notifications/notification-system.md) to email templates through a topic registry. When something happens in the system (an order is created, a shipment ships, a cart is abandoned), a notification fires. The [`EmailNotificationHandler`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Email/Handlers/EmailNotificationHandler.cs) picks it up, finds all email configurations for that topic, and queues a delivery for each one.

```
Notification fires -> EmailNotificationHandler (priority 2100) -> Find configs for topic -> Queue deliveries
```

This means you can have multiple email configurations for the same topic. For example, you might send an order confirmation to the customer and a different notification to your warehouse team -- both triggered by the same `order.created` topic.

> **CLAUDE.md invariant:** The handler swallows (catch/log) all dispatch errors and never rethrows. An email delivery failure must never break the business operation that triggered it. See [EmailNotificationHandler.cs:ProcessEmailsAsync](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Email/Handlers/EmailNotificationHandler.cs#L194).

## Email Configurations

An email configuration maps a topic to a template with recipient rules. You create these in the backoffice under **Settings** > **Email**.

Each configuration has:

| Field | Description |
|---|---|
| `Name` | Display name (e.g., "Order Confirmation to Customer") |
| `Topic` | The notification topic that triggers this email |
| `TemplatePath` | Relative path to the Razor/MJML template |
| `ToExpression` | Recipient address, supports `{{token}}` syntax |
| `CcExpression` | CC recipients (optional) |
| `BccExpression` | BCC recipients (optional) |
| `FromExpression` | Sender address (falls back to default settings) |
| `SubjectExpression` | Email subject, supports `{{token}}` syntax |
| `AttachmentAliases` | Which attachments to include (e.g., `invoice-saved-pdf`) |
| `Enabled` | Toggle on/off without deleting |

### Token Replacement

Subject and recipient fields support token syntax. Tokens come from the notification that triggered the email:

```
Subject: "Order #{{order.orderNumber}} Confirmed"
To: "{{order.customerEmail}}"
```

Available tokens vary by topic and are listed in the backoffice when you edit an email configuration.

## Email Topics

Topics are registered in `IEmailTopicRegistry` and defined as constants in [Constants.cs:EmailTopics](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Constants.cs#L303). Each topic maps to a notification type and lists its available tokens. Here are the built-in topics by category:

### Orders
- `order.created` -- New order placed
- `order.status_changed` -- Order status updated
- `order.cancelled` -- Order cancelled (dispatched from `InvoiceCancelledNotification`)

### Invoices
- `invoice.created` -- Invoice generated
- `invoice.paid` -- Invoice fully paid (dispatched alongside `payment.created`)
- `invoice.refunded` -- Refund processed (dispatched alongside `payment.refunded`)
- `invoice.deleted` -- Invoice deleted
- `invoice.reminder` -- Payment reminder (from `InvoiceReminderJob`)
- `invoice.overdue` -- Invoice overdue (from `InvoiceReminderJob`)

### Payments
- `payment.created` -- Payment received
- `payment.refunded` -- Payment refunded

### Customers
- `customer.created` -- New customer registered
- `customer.updated` -- Customer profile changed
- `customer.password_reset` -- Password reset requested

### Shipments
- `shipment.created` -- Shipment created
- `shipment.preparing` -- Shipment being prepared (bridged from `ShipmentCreatedNotification`)
- `shipment.updated` -- Shipment details changed
- `shipment.shipped` -- Shipment dispatched with tracking
- `shipment.delivered` -- Shipment delivered
- `shipment.cancelled` -- Shipment cancelled

### Checkout Recovery
- `checkout.abandoned` -- Cart abandoned (general)
- `checkout.abandoned.first` -- First recovery email due
- `checkout.abandoned.reminder` -- Reminder email due
- `checkout.abandoned.final` -- Final recovery email due
- `checkout.recovered` -- Abandoned cart recovered
- `checkout.converted` -- Recovery converted to order

### Inventory
- `inventory.low_stock` -- Stock below threshold

### Digital Products
- `digital.delivered` -- Download links ready

### Fulfilment
- `fulfilment.supplier_order` -- Order sent to supplier (Supplier Direct)

> **Topic naming convention:** Topic keys use dots as category separators and underscores within a single word (`order.status_changed`, `inventory.low_stock`). Avoid inventing your own format; always use the constants in `Constants.EmailTopics`.

## MJML Templates

Merchello uses [MJML](https://mjml.io) for email templates. MJML is a markup language that compiles to responsive HTML email. You write simple markup and it generates the complex table-based HTML that email clients need.

Templates are Razor (`.cshtml`) files whose rendered output is compiled to HTML by the `IMjmlCompiler` ([MjmlCompiler.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Email/Services/MjmlCompiler.cs)) and support theme settings (colors, fonts, logo) from `EmailThemeSettings` ([EmailThemeSettings.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Email/EmailThemeSettings.cs)). The provided HTML helpers live in `Merchello.Email.Extensions` so you can mix helpers (`@Html.Mjml().EmailStart(...)`) with raw MJML elements.

Sample templates ship in the example site at [src/Merchello.Site/Views/Emails/](https://github.com/YodasMyDad/Merchello/tree/main/src/Merchello.Site/Views/Emails) (`OrderConfirmation.cshtml`, `AbandonedCartFirst.cshtml`, `AbandonedCartReminder.cshtml`, `AbandonedCartFinal.cshtml`, `DigitalProductDelivered.cshtml`, `PasswordReset.cshtml`, `SupplierOrder.cshtml`). Copy one as a starting point — they already demonstrate the strongly-typed `EmailModel<TNotification>` pattern.

### Template Locations

Templates are resolved from the view locations configured in [EmailSettings.TemplateViewLocations](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Email/EmailSettings.cs#L12) (in order):

1. `/App_Plugins/Merchello/Views/Emails/{template}.cshtml`
2. `/Views/Emails/{template}.cshtml`

You can customize these paths in settings:

```json
{
  "Merchello": {
    "Email": {
      "TemplateViewLocations": [
        "/Views/Emails/{0}.cshtml",
        "/App_Plugins/Merchello/Views/Emails/{0}.cshtml"
      ]
    }
  }
}
```

## Attachments

Email configurations can include attachments by specifying attachment aliases. Built-in attachment types include:

- `invoice-saved-pdf` -- PDF of the invoice
- `order-invoice-pdf` -- Generated invoice PDF for the order
- `order-line-items-csv` -- CSV of order line items

Attachments have size limits:
- Single attachment: 10 MB (configurable via `MaxAttachmentSizeBytes`)
- Total attachments per email: 25 MB (configurable via `MaxTotalAttachmentSizeBytes`)

The `EmailAttachmentCleanupJob` removes orphaned attachment files after 72 hours (configurable).

## Delivery Queue and Retries

Emails are not sent immediately. They are queued as `OutboundDelivery` records ([OutboundDelivery.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Webhooks/Models/OutboundDelivery.cs)) and processed by the `OutboundDeliveryJob` background service ([OutboundDeliveryJob.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Webhooks/Services/OutboundDeliveryJob.cs)). Email and [webhook](../webhooks/webhooks-overview.md) deliveries share the same queue and job; the `DeliveryType` column distinguishes them (`Webhook = 0`, `Email = 1`).

This means:

- Emails do not block the main request
- Failed emails are automatically retried
- You get a full delivery log in the backoffice
- Payloads render lazily at send time, so template tokens always reflect the latest entity state

### Retry Policy

```json
{
  "Merchello": {
    "Email": {
      "MaxRetries": 3,
      "RetryDelaysSeconds": [60, 300, 900],
      "DeliveryRetentionDays": 30
    }
  }
}
```

Failed deliveries retry at 1 minute, 5 minutes, and 15 minutes. After all attempts are exhausted, the delivery is marked as `Abandoned`.

### Delivery Statuses

| Status | Description |
|---|---|
| `Pending` | Queued, waiting to be sent |
| `Sending` | Currently being sent |
| `Succeeded` | Delivered successfully |
| `Failed` | Last attempt failed, will retry |
| `Retrying` | Waiting for next retry attempt |
| `Abandoned` | All retries exhausted |

## Configuration

Full email settings in `appsettings.json`:

```json
{
  "Merchello": {
    "Email": {
      "DefaultFromAddress": "store@example.com",
      "DefaultFromName": "My Store",
      "MaxRetries": 3,
      "RetryDelaysSeconds": [60, 300, 900],
      "DeliveryRetentionDays": 30,
      "MaxAttachmentSizeBytes": 10485760,
      "MaxTotalAttachmentSizeBytes": 26214400,
      "AttachmentStoragePath": "App_Data/Email_Attachments",
      "AttachmentRetentionHours": 72,
      "Theme": {
        "PrimaryColor": "#2563eb",
        "LogoUrl": "/img/logo.png"
      }
    }
  }
}
```

> **Tip:** If `DefaultFromAddress` is not set, Merchello falls back to the SMTP sender configured in Umbraco's settings.

## Backoffice API

Routes are relative to the Umbraco management API prefix. Source: [EmailConfigurationApiController.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Controllers/EmailConfigurationApiController.cs), [EmailMetadataApiController.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Controllers/EmailMetadataApiController.cs).

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/emails` | GET | List email configurations (paginated, filterable) |
| `/api/v1/emails/{id}` | GET | Get configuration detail |
| `/api/v1/emails` | POST | Create configuration |
| `/api/v1/emails/{id}` | PUT | Update configuration |
| `/api/v1/emails/{id}` | DELETE | Delete configuration |
| `/api/v1/emails/{id}/toggle` | POST | Enable/disable |
| `/api/v1/emails/{id}/test` | POST | Send a test email |
| `/api/v1/emails/{id}/preview` | GET | Preview rendered email |
| `/api/v1/emails/topics` | GET | List available topics |
| `/api/v1/emails/topics/categories` | GET | Topics grouped by category |
| `/api/v1/emails/topics/{topic}/tokens` | GET | List tokens for a topic |
| `/api/v1/emails/topics/{topic}/attachments` | GET | Attachments compatible with a topic |
| `/api/v1/emails/templates` | GET | Discover available `.cshtml` templates |
| `/api/v1/emails/templates/exists` | GET | Check whether a template path resolves |
| `/api/v1/emails/attachments` | GET | List all registered attachment aliases |

## Handler Priority

The `EmailNotificationHandler` runs at priority **2100**, which means it executes after business logic handlers (1000), timeline logging (2000), and upsell email enrichment (2050) but before outbound webhooks (2200). This ordering ensures all data is finalized before the email template is rendered. See [Notification System - Priority Ranges](../notifications/notification-system.md#priority-ranges).

## Related Topics

- [Notification System](../notifications/notification-system.md)
- [Outbound Webhooks](../webhooks/webhooks-overview.md)
- [Background Jobs](../background-jobs/background-jobs.md)
- [Abandoned Cart Recovery](../checkout/abandoned-cart.md)
- [Developer reference - docs/EmailSystem.md](https://github.com/YodasMyDad/Merchello/blob/main/docs/EmailSystem.md) (internal guide, not shipped as documentation)
