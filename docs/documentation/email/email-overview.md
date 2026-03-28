# Email System

Merchello's email system handles all transactional emails -- order confirmations, shipment notifications, abandoned cart recovery, password resets, and more. It is built around three ideas: **topic-based routing**, **MJML templates**, and a **reliable delivery queue** with retry support.

## How It Works

The email system connects internal Merchello notifications to email templates through a topic registry. When something happens in the system (an order is created, a shipment ships, a cart is abandoned), a notification fires. The `EmailNotificationHandler` picks it up, finds all email configurations for that topic, and queues a delivery for each one.

```
Notification fires -> EmailNotificationHandler -> Find configs for topic -> Queue deliveries
```

This means you can have multiple email configurations for the same topic. For example, you might send an order confirmation to the customer and a different notification to your warehouse team -- both triggered by the same `order.created` topic.

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

Topics are registered in the `IEmailTopicRegistry`. Each topic maps to a notification type and lists its available tokens. Here are the built-in topics by category:

### Orders
- `order.created` -- New order placed
- `order.status-changed` -- Order status updated
- `order.cancelled` -- Order cancelled

### Invoices
- `invoice.created` -- Invoice generated
- `invoice.paid` -- Invoice fully paid
- `invoice.refunded` -- Refund processed
- `invoice.deleted` -- Invoice deleted
- `invoice.reminder` -- Payment reminder
- `invoice.overdue` -- Invoice overdue

### Payments
- `payment.created` -- Payment received
- `payment.refunded` -- Payment refunded

### Customers
- `customer.created` -- New customer registered
- `customer.updated` -- Customer profile changed
- `customer.password-reset` -- Password reset requested

### Shipments
- `shipment.created` -- Shipment created
- `shipment.preparing` -- Shipment being prepared
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
- `inventory.low-stock` -- Stock below threshold

### Digital Products
- `digital-product.delivered` -- Download links ready

### Fulfilment
- `fulfilment.supplier-order` -- Order sent to supplier (Supplier Direct)

## MJML Templates

Merchello uses [MJML](https://mjml.io) for email templates. MJML is a markup language that compiles to responsive HTML email. You write simple markup and it generates the complex table-based HTML that email clients need.

Templates are compiled via the `MjmlCompileResult` system and support theme settings (colors, fonts, logo) from the `EmailThemeSettings` configuration.

### Template Locations

Templates are resolved from configured view locations (in order):

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

Emails are not sent immediately. They are queued as `OutboundDelivery` records and processed by the `OutboundDeliveryJob` background service. This means:

- Emails do not block the main request
- Failed emails are automatically retried
- You get a full delivery log in the backoffice

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

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/emails` | GET | List email configurations |
| `/api/v1/emails/{id}` | GET | Get configuration detail |
| `/api/v1/emails` | POST | Create configuration |
| `/api/v1/emails/{id}` | PUT | Update configuration |
| `/api/v1/emails/{id}` | DELETE | Delete configuration |
| `/api/v1/emails/{id}/toggle` | POST | Enable/disable |
| `/api/v1/emails/{id}/test` | POST | Send a test email |
| `/api/v1/emails/{id}/preview` | GET | Preview rendered email |
| `/api/v1/emails/topics` | GET | List available topics |
| `/api/v1/emails/topics/by-category` | GET | Topics grouped by category |

## Handler Priority

The `EmailNotificationHandler` runs at priority **2100**, which means it executes after business logic handlers (1000) and timeline logging (1500-1900), but before outbound webhooks (2200). This ensures all data is finalized before the email template is rendered.

## Related Topics

- [Notification System](../notifications/notification-system.md)
- [Outbound Webhooks](../webhooks/webhooks-overview.md)
- [Background Jobs](../background-jobs/background-jobs.md)
