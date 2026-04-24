# Abandoned Cart Recovery

Industry data shows 60-80% of shopping carts are abandoned. Merchello's abandoned cart recovery system helps you reclaim 5-15% of that lost revenue through automatic detection, recovery emails, and restoration links.

**What it is:** An opt-in system that snapshots in-flight checkouts, detects abandonment after an inactivity threshold, sends up to three recovery emails on a configurable schedule, and restores the basket when the customer clicks a recovery link.

**Why you use it:** You do not have to write any tracking code — the existing checkout services update abandoned-checkout records automatically. You enable it by registering `IAbandonedCheckoutService` (configured in `Startup.cs`) and configuring the recovery email topics.

Source: [AbandonedCheckoutDetectionJob.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Checkout/Services/AbandonedCheckoutDetectionJob.cs), [AbandonedCheckoutSettings.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Checkout/AbandonedCheckoutSettings.cs), [CheckoutAbandonedNotificationBase.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Notifications/CheckoutNotifications/CheckoutAbandonedNotificationBase.cs).

## How It Works

Abandoned cart tracking is built into the checkout -- no extra code required. The system automatically tracks activity through existing checkout operations:

```
Customer enters email at checkout  -->  AbandonedCheckout record created
         |
Customer selects shipping          -->  LastActivityUtc updated
         |
Customer leaves without paying...
         |
Background job detects (1 hour)    -->  Status: Abandoned
         |
Recovery email #1 sent             -->  Contains recovery link
         |
Recovery email #2 (24h later)
         |
Recovery email #3 (48h later)
         |
Customer clicks link               -->  Basket restored, status: Recovered
         |
Customer completes purchase        -->  Status: Converted
```

> **Note:** If the customer completes their purchase at any point, subsequent recovery emails are automatically cancelled.

---

## Lifecycle States

Each abandoned checkout moves through these states:

| Status | Value | Description |
|--------|-------|-------------|
| `Active` | 0 | Checkout is in progress -- customer is still shopping |
| `Abandoned` | 10 | No activity for the configured threshold (default: 1 hour) |
| `Recovered` | 20 | Customer returned via a recovery link |
| `Converted` | 30 | Customer completed their purchase after recovery |
| `Expired` | 40 | Recovery window has passed (default: 30 days) |

---

## Configuration

Configure abandoned cart behavior in `appsettings.json`. Both key paths are bound in `Startup.cs` so either works, with `Merchello:Checkout:AbandonedCart` taking precedence when both are present:

```json
{
  "Merchello": {
    "AbandonedCheckout": {
      "AbandonmentThresholdHours": 1.0,
      "RecoveryExpiryDays": 30,
      "CheckIntervalMinutes": 15,
      "RecoveryUrlBase": "/checkout/recover",
      "FirstEmailDelayHours": 1,
      "ReminderEmailDelayHours": 24,
      "FinalEmailDelayHours": 48,
      "MaxRecoveryEmails": 3
    }
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `AbandonmentThresholdHours` | `1.0` | Hours of inactivity before a checkout is marked as abandoned |
| `RecoveryExpiryDays` | `30` | Days until recovery tokens expire |
| `CheckIntervalMinutes` | `15` | How often the background job runs |
| `RecoveryUrlBase` | `/checkout/recover` | Base URL for recovery links |
| `FirstEmailDelayHours` | `1` | Hours after abandonment to send the first email |
| `ReminderEmailDelayHours` | `24` | Hours after the first email to send the reminder |
| `FinalEmailDelayHours` | `48` | Hours after the reminder to send the final email |
| `MaxRecoveryEmails` | `3` | Maximum recovery emails per checkout |

---

## Recovery Email Sequence

The system sends up to three recovery emails on a configurable schedule:

### Email 1: Initial Recovery (1 hour after abandonment)
- Notification: `CheckoutAbandonedFirstNotification`
- Topic: `checkout.abandoned.first`
- Typical subject: "You left something behind!"

### Email 2: Reminder (24 hours after email 1)
- Notification: `CheckoutAbandonedReminderNotification`
- Topic: `checkout.abandoned.reminder`
- Typical subject: "Still thinking it over? Your cart is waiting"

### Email 3: Final Notice (48 hours after email 2)
- Notification: `CheckoutAbandonedFinalNotification`
- Topic: `checkout.abandoned.final`
- Typical subject: "Last chance -- your cart expires soon"

---

## Setting Up Recovery Emails

You have three options for sending recovery emails:

### Option A: Email Builder (Recommended)

The simplest approach -- configure emails in the Merchello backoffice:

1. Navigate to **Settings > Email** in the backoffice
2. Create email configurations for each topic:
   - `checkout.abandoned.first` -- First recovery email
   - `checkout.abandoned.reminder` -- Reminder email
   - `checkout.abandoned.final` -- Final notice
3. Use Razor templates with the notification properties
4. Enable all three configurations

The system handles delivery automatically via the outbound delivery infrastructure.

### Option B: Custom Notification Handler

For advanced requirements (A/B testing, third-party ESP integration):

```csharp
[NotificationHandlerPriority(1500)]
public class MyRecoveryEmailHandler(
    ILogger<MyRecoveryEmailHandler> logger)
    : INotificationAsyncHandler<CheckoutAbandonedFirstNotification>
{
    public async Task HandleAsync(
        CheckoutAbandonedFirstNotification notification,
        CancellationToken ct)
    {
        // Send via your preferred service
        // notification.CustomerEmail
        // notification.RecoveryLink
        // notification.FormattedTotal
        // notification.EmailSequenceNumber
    }
}
```

### Option C: Webhooks

Subscribe to webhook topics to trigger external platforms (Klaviyo, Mailchimp, etc.):

| Topic | When |
|-------|------|
| `checkout.abandoned.first` | First recovery email is due |
| `checkout.abandoned.reminder` | Reminder email is due |
| `checkout.abandoned.final` | Final email is due |
| `checkout.recovered` | Customer returned via recovery link |
| `checkout.converted` | Recovered checkout completed purchase |

---

## Notification Properties

All recovery email notifications inherit from [`CheckoutAbandonedNotificationBase`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Notifications/CheckoutNotifications/CheckoutAbandonedNotificationBase.cs):

| Property | Type | Description |
|----------|------|-------------|
| `AbandonedCheckoutId` | `Guid` | ID of the abandoned checkout record |
| `BasketId` | `Guid?` | ID of the abandoned basket |
| `CustomerEmail` | `string?` | Customer's email address |
| `CustomerName` | `string?` | Customer's name |
| `BasketTotal` | `decimal` | Total value of the abandoned basket (in basket currency) |
| `CurrencyCode` | `string?` | Currency code (e.g., "USD") |
| `CurrencySymbol` | `string?` | Currency symbol (e.g., "$") |
| `FormattedTotal` | `string` | Pre-formatted total with currency symbol |
| `RecoveryLink` | `string?` | Link to restore the basket |
| `EmailSequenceNumber` | `int` | Which email in the sequence (1, 2, or 3) |
| `ItemCount` | `int` | Number of items in the abandoned basket |

---

## Basket Restoration

When a customer clicks a recovery link (`/checkout/recover/{token}`), the system:

1. Validates the recovery token (not expired, not already used)
2. Restores the basket from the abandoned checkout record
3. Sets the basket cookie on the customer's browser
4. Marks the abandoned checkout as `Recovered`
5. Redirects to the checkout page

> **Note:** If the customer has a different basket in progress, the recovered basket replaces it. The previous basket is deleted.

---

## Backoffice API (Admin)

The backoffice provides endpoints for managing abandoned checkouts:

### List Abandoned Checkouts

```
GET /umbraco/api/v1/abandoned-checkouts
    ?page=1&pageSize=50&status=Abandoned&search=&orderBy=DateAbandoned&descending=true
```

### Get Checkout Detail

```
GET /umbraco/api/v1/abandoned-checkouts/{id}
```

Returns full details including line items, addresses, and recovery link.

### Get Recovery Statistics

```
GET /umbraco/api/v1/abandoned-checkouts/stats?fromDate=...&toDate=...
```

**Response:**

```json
{
  "totalAbandoned": 150,
  "totalRecovered": 25,
  "totalConverted": 18,
  "recoveryRate": 16.67,
  "conversionRate": 12.00,
  "totalValueAbandoned": 15000.00,
  "totalValueRecovered": 2500.00
}
```

### Resend Recovery Email

```
POST /umbraco/api/v1/abandoned-checkouts/{id}/resend-email
```

Manually triggers a recovery email. Only works for checkouts in `Abandoned` status with an email address.

### Regenerate Recovery Link

```
POST /umbraco/api/v1/abandoned-checkouts/{id}/regenerate-link
```

Generates a fresh recovery link (useful if the original has expired).

---

## Automatic Tracking Integration

The system tracks checkout activity through existing checkout service methods. You don't need to add any tracking code:

| Checkout Action | What Happens |
|-----------------|--------------|
| Customer saves addresses (with email) | Creates `AbandonedCheckout` record |
| Customer selects shipping | Updates `LastActivityUtc` |
| Customer applies discount code | Updates `LastActivityUtc` |
| Customer updates line item quantity | Updates `LastActivityUtc` |
| Customer completes purchase | Marks as `Converted` |

---

## Background Job

The `AbandonedCheckoutDetectionJob` runs three tasks on each interval:

1. **Detect abandonment** -- marks checkouts as abandoned after the inactivity threshold
2. **Send recovery emails** -- fires notifications for emails in the sequence that are due
3. **Expire old recoveries** -- cleans up expired recovery tokens

The job runs every 15 minutes by default (configurable via `CheckIntervalMinutes`).

> **Tip:** The minimum check interval is 5 minutes to avoid excessive database queries.
