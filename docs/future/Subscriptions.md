# Subscription System - Architecture

## Prerequisites

This feature builds on top of **Vaulted Payments** (fully implemented - see `docs/VaultedPayments.md`). The following infrastructure already exists and is reused by subscriptions:

- **`SavedPaymentMethod` model & `ISavedPaymentMethodService`** - Storing and managing saved payment methods
- **`GetOrCreateStripeCustomerAsync`** - Helper in `StripePaymentProvider` to find/create Stripe Customer objects
- **`GetOrCreateBraintreeCustomerAsync`** - Helper in `BraintreePaymentProvider` to find/create Braintree Customer objects
- **`PaymentProviderMetadata.SupportsVaultedPayments`** and **`RequiresProviderCustomerId`** - Already on metadata
- **`PaymentProviderSetting.IsVaultingEnabled`** - Per-provider vault toggle
- **Vault methods on `IPaymentProvider`** - `CreateVaultSetupSessionAsync`, `ConfirmVaultSetupAsync`, `ChargeVaultedMethodAsync`, `DeleteVaultedMethodAsync` with defaults in `PaymentProviderBase`
- **Storefront saved methods API** - `StorefrontSavedPaymentMethodsController` for customer-facing management

Subscriptions leverage this infrastructure for provider customer creation, payment method attachment, and off-session billing.

---

## Overview

Provider-managed subscription/recurring payments system for Merchello. Subscription billing is handled by payment gateways (Stripe Billing, PayPal Subscriptions, Braintree) while Merchello stores subscription metadata and syncs state via webhooks.

**Key Concept: Provider-Managed Billing**

Rather than running internal billing jobs, Merchello delegates billing to payment providers:
- **Stripe** → Stripe Billing (Subscriptions API)
- **PayPal** → PayPal Subscriptions API
- **Braintree** → Braintree Recurring Billing

Merchello creates invoices when renewal webhooks are received, not via internal scheduling.

**Benefits:**
- PCI compliance managed by provider
- Automatic retry logic and dunning management
- Customer payment method updates via provider portal or Merchello's saved payment methods UI
- Proven billing infrastructure
- No internal cron job complexity
- Customers with vaulted payment methods can subscribe with one click

## Architecture

| Layer | Components |
|-------|------------|
| **Providers** | `IPaymentProvider` with `SupportsSubscriptions` capability (like express checkout) |
| **Service** | `SubscriptionService` - CRUD, lifecycle, invoice linking |
| **Factory** | `SubscriptionFactory` - Object creation |
| **Storage** | `merchelloSubscriptions`, `merchelloSubscriptionInvoices` |
| **Webhooks** | Extended `PaymentWebhookController` for subscription events |

## Data Model

### Subscription Entity

```csharp
public class Subscription
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; }

    // Product reference (the subscribable product)
    public Guid ProductId { get; set; }
    public Product Product { get; set; }
    public string PlanName { get; set; }  // Display name

    // Provider tracking
    public string PaymentProviderAlias { get; set; }      // "stripe", "paypal"
    public string ProviderSubscriptionId { get; set; }    // Provider's subscription ID
    public string? ProviderCustomerId { get; set; }       // Provider's customer ID
    public string? ProviderPlanId { get; set; }           // Provider's price/plan ID

    // Subscription terms
    public SubscriptionStatus Status { get; set; }
    public BillingInterval BillingInterval { get; set; }
    public int BillingIntervalCount { get; set; }         // e.g., 3 for quarterly

    // Pricing (snapshot at subscription time)
    public decimal Amount { get; set; }
    public string CurrencyCode { get; set; }
    public decimal? AmountInStoreCurrency { get; set; }
    public int Quantity { get; set; }                     // For seat-based subscriptions

    // Trial period
    public bool HasTrial { get; set; }
    public DateTime? TrialEndsAt { get; set; }

    // Lifecycle dates
    public DateTime? CurrentPeriodStart { get; set; }
    public DateTime? CurrentPeriodEnd { get; set; }
    public DateTime? NextBillingDate { get; set; }
    public DateTime? CancelledAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string? CancellationReason { get; set; }

    // Pause support
    public bool IsPaused { get; set; }
    public DateTime? PausedAt { get; set; }
    public DateTime? ResumeAt { get; set; }

    // Timestamps
    public DateTime DateCreated { get; set; }
    public DateTime DateUpdated { get; set; }

    // Navigation
    public virtual ICollection<SubscriptionInvoice>? SubscriptionInvoices { get; set; }

    // Extended data for custom metadata
    public Dictionary<string, object> ExtendedData { get; set; }
}
```

### SubscriptionInvoice (Junction Table)

Links subscriptions to renewal invoices:

```csharp
public class SubscriptionInvoice
{
    public Guid Id { get; set; }
    public Guid SubscriptionId { get; set; }
    public Subscription Subscription { get; set; }
    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; }

    // Billing period this invoice covers
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }

    // Provider invoice reference
    public string? ProviderInvoiceId { get; set; }

    public DateTime DateCreated { get; set; }
}
```

### Enums

```csharp
public enum SubscriptionStatus
{
    Trialing = 10,      // In trial period
    Active = 20,        // Active and billing normally
    PastDue = 30,       // Payment failed, in retry/grace period
    Paused = 40,        // Paused by user/admin
    Cancelled = 50,     // Cancelled but active until period end
    Ended = 60,         // Subscription has ended
    Unpaid = 70         // Payment permanently failed after retries
}

public enum BillingInterval
{
    Daily = 1,
    Weekly = 7,
    Monthly = 30,
    Yearly = 365
}
```

## Entity Relationships

```
Customer (1) ─────► (Many) Subscription
                          │
                          └──► (Many) SubscriptionInvoice ──► (1) Invoice
                                                                   │
                                                                   └──► (Many) Payment

Product (1) ─────► (Many) Subscription
```

## Provider Interface

### IPaymentProvider Extension

Subscription capability is added to the existing `IPaymentProvider` interface (consistent with express checkout pattern). Providers that support subscriptions set `Metadata.SupportsSubscriptions = true` and implement the optional subscription methods.

#### PaymentProviderMetadata Additions

Add subscription capabilities alongside the existing vaulted payments fields:

```csharp
public class PaymentProviderMetadata
{
    // Existing properties...

    // Vaulted payments (already implemented)
    public bool SupportsVaultedPayments { get; init; } = false;
    public bool RequiresProviderCustomerId { get; init; } = false;

    // Subscription capabilities (NEW)
    public bool SupportsSubscriptions { get; init; }
    public bool SupportsPause { get; init; }           // Not all providers support pause
    public bool SupportsQuantityChange { get; init; }  // For seat-based subscriptions
}
```

#### IPaymentProvider Subscription Methods

Add these optional methods to `IPaymentProvider` with default implementations in `PaymentProviderBase`:

```csharp
// In IPaymentProvider - subscription methods (optional, default implementations throw NotSupportedException)

/// <summary>Create a subscription with the provider.</summary>
Task<CreateSubscriptionResult> CreateSubscriptionAsync(
    CreateSubscriptionRequest request,
    CancellationToken cancellationToken = default);

/// <summary>Cancel a subscription.</summary>
Task<SubscriptionActionResult> CancelSubscriptionAsync(
    string providerSubscriptionId,
    bool cancelImmediately = false,
    string? reason = null,
    CancellationToken cancellationToken = default);

/// <summary>Pause a subscription (if supported - check Metadata.SupportsPause).</summary>
Task<SubscriptionActionResult> PauseSubscriptionAsync(
    string providerSubscriptionId,
    DateTime? resumeAt = null,
    CancellationToken cancellationToken = default);

/// <summary>Resume a paused subscription.</summary>
Task<SubscriptionActionResult> ResumeSubscriptionAsync(
    string providerSubscriptionId,
    CancellationToken cancellationToken = default);

/// <summary>Update subscription quantity (for seat-based - check Metadata.SupportsQuantityChange).</summary>
Task<SubscriptionActionResult> UpdateSubscriptionQuantityAsync(
    string providerSubscriptionId,
    int newQuantity,
    CancellationToken cancellationToken = default);

/// <summary>Change subscription plan/price.</summary>
Task<SubscriptionActionResult> ChangeSubscriptionPlanAsync(
    string providerSubscriptionId,
    string newProviderPriceId,
    ProrationBehavior proration = ProrationBehavior.CreateProrations,
    CancellationToken cancellationToken = default);

/// <summary>Get current subscription status from provider.</summary>
Task<ProviderSubscriptionStatus?> GetSubscriptionStatusAsync(
    string providerSubscriptionId,
    CancellationToken cancellationToken = default);

/// <summary>Create a customer portal session for self-service management.</summary>
Task<CustomerPortalResult> CreateCustomerPortalSessionAsync(
    string providerCustomerId,
    string returnUrl,
    CancellationToken cancellationToken = default);
```

#### PaymentProviderBase Default Implementations

`PaymentProviderBase` already has default implementations for the vault methods (`CreateVaultSetupSessionAsync`, `ConfirmVaultSetupAsync`, `ChargeVaultedMethodAsync`, `DeleteVaultedMethodAsync`). Subscription defaults follow the same pattern:

```csharp
public abstract class PaymentProviderBase : IPaymentProvider
{
    // Vaulted payment methods - already implemented (see VaultedPayments.md Phase 2)
    // public virtual Task<VaultSetupResult> CreateVaultSetupSessionAsync(...) => ...
    // public virtual Task<VaultConfirmResult> ConfirmVaultSetupAsync(...) => ...
    // public virtual Task<PaymentResult> ChargeVaultedMethodAsync(...) => ...
    // public virtual Task<bool> DeleteVaultedMethodAsync(...) => ...

    // Subscription methods (NEW) - default to not supported
    public virtual Task<CreateSubscriptionResult> CreateSubscriptionAsync(
        CreateSubscriptionRequest request, CancellationToken ct = default)
        => Task.FromResult(CreateSubscriptionResult.Failed("Subscriptions not supported by this provider"));

    public virtual Task<SubscriptionActionResult> CancelSubscriptionAsync(
        string providerSubscriptionId, bool cancelImmediately = false,
        string? reason = null, CancellationToken ct = default)
        => Task.FromResult(new SubscriptionActionResult { Success = false, ErrorMessage = "Not supported" });

    // ... other methods follow same pattern
}
```

### Request/Result Models

```csharp
public class CreateSubscriptionRequest
{
    public Guid CustomerId { get; init; }
    public string CustomerEmail { get; init; }
    public string? CustomerName { get; init; }

    public Guid ProductId { get; init; }
    public string PlanName { get; init; }
    public string? ProviderPriceId { get; init; }  // Provider's price/plan ID

    public decimal Amount { get; init; }
    public string CurrencyCode { get; init; }

    public BillingInterval BillingInterval { get; init; }
    public int BillingIntervalCount { get; init; }
    public int Quantity { get; init; }

    public int? TrialDays { get; init; }

    // Payment method - one of these should be provided:
    public string? PaymentMethodToken { get; init; }    // Raw token from frontend SDK
    public Guid? SavedPaymentMethodId { get; init; }    // Existing vaulted payment method (from ISavedPaymentMethodService)

    public string? SuccessUrl { get; init; }
    public string? CancelUrl { get; init; }

    public Dictionary<string, string>? Metadata { get; init; }
}

public class CreateSubscriptionResult
{
    public bool Success { get; init; }
    public string? ProviderSubscriptionId { get; init; }
    public string? ProviderCustomerId { get; init; }
    public SubscriptionStatus Status { get; init; }
    public DateTime? CurrentPeriodStart { get; init; }
    public DateTime? CurrentPeriodEnd { get; init; }
    public DateTime? TrialEnd { get; init; }
    public string? ErrorMessage { get; init; }
    public string? RedirectUrl { get; init; }  // For hosted checkout flows
    public string? SessionId { get; init; }

    public static CreateSubscriptionResult Successful(...);
    public static CreateSubscriptionResult Redirect(string url, string sessionId);
    public static CreateSubscriptionResult Failed(string message, string? code = null);
}

public class SubscriptionActionResult
{
    public bool Success { get; init; }
    public SubscriptionStatus? NewStatus { get; init; }
    public string? ErrorMessage { get; init; }
}

public class CustomerPortalResult
{
    public bool Success { get; init; }
    public string? PortalUrl { get; init; }
    public string? ErrorMessage { get; init; }
}
```

## Webhook Events

### Extended WebhookEventType

```csharp
public enum WebhookEventType
{
    // Existing payment events...
    PaymentCompleted,
    PaymentFailed,
    RefundCompleted,
    DisputeOpened,
    DisputeResolved,

    // Subscription events
    SubscriptionCreated = 100,
    SubscriptionUpdated = 101,
    SubscriptionCancelled = 102,
    SubscriptionPaused = 103,
    SubscriptionResumed = 104,
    SubscriptionTrialEnding = 105,
    SubscriptionTrialEnded = 106,
    SubscriptionRenewed = 110,
    SubscriptionPaymentFailed = 111,
    SubscriptionPaymentSucceeded = 112,
    SubscriptionEnded = 120,

    Unknown = 999
}
```

### Stripe Webhook Mapping

| Stripe Event | WebhookEventType |
|--------------|------------------|
| `customer.subscription.created` | SubscriptionCreated |
| `customer.subscription.updated` | SubscriptionUpdated |
| `customer.subscription.deleted` | SubscriptionEnded |
| `customer.subscription.paused` | SubscriptionPaused |
| `customer.subscription.resumed` | SubscriptionResumed |
| `customer.subscription.trial_will_end` | SubscriptionTrialEnding |
| `invoice.paid` (subscription) | SubscriptionRenewed |
| `invoice.payment_failed` (subscription) | SubscriptionPaymentFailed |

### Webhook Processing Flow

```
Stripe sends webhook
    ↓
PaymentWebhookController receives
    ↓
StripePaymentProvider.ProcessWebhookAsync()
    ↓
Returns WebhookProcessingResult with SubscriptionXxx event type
    ↓
Controller routes to SubscriptionService
    ↓
SubscriptionService.UpdateStatusFromProviderAsync() or ProcessRenewalAsync()
    ↓
Publishes notification (e.g., SubscriptionRenewedNotification)
    ↓
WebhookNotificationHandler dispatches external webhook
```

## Notifications

Following existing Merchello notification patterns:

### Before Notifications (Cancelable)

```csharp
public class SubscriptionCreatingNotification(Subscription subscription)
    : MerchelloCancelableNotification<Subscription>(subscription);

public class SubscriptionCancellingNotification(Subscription subscription, string? reason)
    : MerchelloCancelableNotification<Subscription>(subscription)
{
    public string? Reason { get; } = reason;
}

public class SubscriptionPausingNotification(Subscription subscription)
    : MerchelloCancelableNotification<Subscription>(subscription);
```

### After Notifications (Informational)

```csharp
public class SubscriptionCreatedNotification(Subscription subscription)
    : MerchelloNotification
{
    public Subscription Subscription { get; } = subscription;
}

public class SubscriptionCancelledNotification(Subscription subscription, string? reason)
    : MerchelloNotification
{
    public Subscription Subscription { get; } = subscription;
    public string? Reason { get; } = reason;
}

public class SubscriptionRenewedNotification(
    Subscription subscription,
    Invoice invoice,
    Payment payment) : MerchelloNotification
{
    public Subscription Subscription { get; } = subscription;
    public Invoice Invoice { get; } = invoice;
    public Payment Payment { get; } = payment;
}

public class SubscriptionPaymentFailedNotification(
    Subscription subscription,
    string? errorMessage) : MerchelloNotification
{
    public Subscription Subscription { get; } = subscription;
    public string? ErrorMessage { get; } = errorMessage;
    public int FailureCount { get; init; }
}

public class SubscriptionStatusChangedNotification(
    Subscription subscription,
    SubscriptionStatus oldStatus,
    SubscriptionStatus newStatus) : MerchelloNotification
{
    public Subscription Subscription { get; } = subscription;
    public SubscriptionStatus OldStatus { get; } = oldStatus;
    public SubscriptionStatus NewStatus { get; } = newStatus;
}

public class SubscriptionTrialEndingNotification(
    Subscription subscription,
    int daysRemaining) : MerchelloNotification
{
    public Subscription Subscription { get; } = subscription;
    public int DaysRemaining { get; } = daysRemaining;
}
```

## External Webhook Topics

New topics for external integrations (registered in `WebhookTopicRegistry`):

| Topic | Description |
|-------|-------------|
| `subscription.created` | New subscription created |
| `subscription.renewed` | Subscription payment successful |
| `subscription.payment_failed` | Subscription payment failed |
| `subscription.cancelled` | Subscription cancelled |
| `subscription.paused` | Subscription paused |
| `subscription.resumed` | Paused subscription resumed |
| `subscription.ended` | Subscription ended (cancelled period completed or unpaid) |
| `subscription.trial_ending` | Trial ending soon (3 days warning) |

### Payload Envelope

```json
{
  "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "topic": "subscription.renewed",
  "timestamp": "2024-01-15T10:30:00Z",
  "api_version": "2024-01",
  "data": {
    "subscriptionId": "...",
    "customerId": "...",
    "productId": "...",
    "status": "Active",
    "amount": 29.99,
    "currencyCode": "USD",
    "periodStart": "2024-01-15T00:00:00Z",
    "periodEnd": "2024-02-15T00:00:00Z",
    "invoiceId": "..."
  }
}
```

## Service Layer

### ISubscriptionService

```csharp
public interface ISubscriptionService
{
    // Query
    Task<Subscription?> GetSubscriptionAsync(Guid id, CancellationToken ct = default);
    Task<Subscription?> GetByProviderIdAsync(
        string providerAlias,
        string providerSubscriptionId,
        CancellationToken ct = default);
    Task<PagedResult<Subscription>> QuerySubscriptionsAsync(
        SubscriptionQueryParameters parameters,
        CancellationToken ct = default);
    Task<IEnumerable<Subscription>> GetCustomerSubscriptionsAsync(
        Guid customerId,
        CancellationToken ct = default);

    // Lifecycle
    Task<CrudResult<Subscription>> CreateSubscriptionAsync(
        CreateSubscriptionParameters parameters,
        CancellationToken ct = default);
    Task<CrudResult<Subscription>> CancelSubscriptionAsync(
        CancelSubscriptionParameters parameters,
        CancellationToken ct = default);
    Task<CrudResult<Subscription>> PauseSubscriptionAsync(
        Guid subscriptionId,
        DateTime? resumeAt = null,
        CancellationToken ct = default);
    Task<CrudResult<Subscription>> ResumeSubscriptionAsync(
        Guid subscriptionId,
        CancellationToken ct = default);

    // Updates from webhooks
    Task<CrudResult<Subscription>> ProcessRenewalAsync(
        ProcessRenewalParameters parameters,
        CancellationToken ct = default);
    Task<CrudResult<Subscription>> UpdateStatusFromProviderAsync(
        UpdateSubscriptionStatusParameters parameters,
        CancellationToken ct = default);

    // Invoice linking
    Task<SubscriptionInvoice> CreateSubscriptionInvoiceAsync(
        CreateSubscriptionInvoiceParameters parameters,
        CancellationToken ct = default);
    Task<IEnumerable<SubscriptionInvoice>> GetSubscriptionInvoicesAsync(
        Guid subscriptionId,
        CancellationToken ct = default);

    // Sync with provider
    Task SyncSubscriptionWithProviderAsync(
        Guid subscriptionId,
        CancellationToken ct = default);

    // Metrics
    Task<SubscriptionMetrics> GetMetricsAsync(CancellationToken ct = default);
}
```

### SubscriptionMetrics

```csharp
public class SubscriptionMetrics
{
    public int TotalActive { get; init; }
    public int TotalTrialing { get; init; }
    public int TotalPastDue { get; init; }
    public int TotalCancelled { get; init; }
    public decimal MonthlyRecurringRevenue { get; init; }
    public decimal AnnualRecurringRevenue { get; init; }
    public int NewThisMonth { get; init; }
    public int ChurnedThisMonth { get; init; }
}
```

## API Endpoints

### Backoffice API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/subscriptions` | List with filters (status, customer, date range) |
| GET | `/api/v1/subscriptions/{id}` | Get subscription detail |
| GET | `/api/v1/subscriptions/{id}/invoices` | Get subscription invoices |
| POST | `/api/v1/subscriptions/{id}/cancel` | Cancel subscription |
| POST | `/api/v1/subscriptions/{id}/pause` | Pause subscription |
| POST | `/api/v1/subscriptions/{id}/resume` | Resume subscription |
| POST | `/api/v1/subscriptions/{id}/sync` | Sync with provider |
| GET | `/api/v1/subscriptions/metrics` | Dashboard metrics |
| GET | `/api/v1/customers/{id}/subscriptions` | Customer's subscriptions |

### Storefront API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/merchello/checkout/subscription` | Create subscription (accepts `savedPaymentMethodId` or new token) |
| GET | `/api/merchello/my/subscriptions` | Customer's subscriptions |
| POST | `/api/merchello/my/subscriptions/{id}/cancel` | Cancel own subscription |
| GET | `/api/merchello/my/subscriptions/portal` | Get customer portal URL |

> **Saved Payment Methods Integration:** The `POST /checkout/subscription` endpoint accepts either a `savedPaymentMethodId` (referencing a vaulted method from `ISavedPaymentMethodService`) or a raw `paymentMethodToken` from the frontend SDK. When a `savedPaymentMethodId` is provided, the service resolves the `ProviderMethodId` and `ProviderCustomerId` from the `SavedPaymentMethod` record and passes them to the provider. This enables one-click subscription signup for customers with saved payment methods.
>
> **Existing saved methods API:** Customers already manage their saved payment methods via `StorefrontSavedPaymentMethodsController` (`/api/merchello/storefront/payment-methods/*`). The subscription checkout UI should list these as payment options.

## Admin UI

### File Structure

```
src/Merchello/Client/src/subscriptions/
├── components/
│   ├── subscriptions-workspace.element.ts    # Main workspace wrapper
│   ├── subscriptions-list.element.ts         # List with filters
│   ├── subscription-detail.element.ts        # Detail view with tabs
│   ├── subscription-timeline.element.ts      # Renewal history timeline
│   └── subscription-actions.element.ts       # Action buttons component
├── modals/
│   ├── cancel-subscription-modal.element.ts
│   ├── cancel-subscription-modal.token.ts
│   ├── pause-subscription-modal.element.ts
│   └── pause-subscription-modal.token.ts
├── contexts/
│   └── subscriptions-workspace.context.ts
├── types/
│   └── subscription.types.ts
└── manifest.ts
```

### List View

- Filterable by status, customer, date range
- Columns: Customer, Plan, Status, Amount, Next Billing, Created
- Status badges with color coding
- Click to navigate to detail

### Detail View

**Header:**
- Customer info with link
- Status badge
- Quick action buttons (Cancel, Pause/Resume, Sync)

**Tabs:**
- **Details**: Plan info, billing info, dates, provider IDs
- **Invoices**: Table of linked invoices with payment status
- **Timeline**: Visual history of all events (created, renewed, failed, etc.)

### Customer Integration

Add "Subscriptions" tab to customer detail view showing:
- Active subscriptions count
- Table of all customer subscriptions
- Quick actions

## Product Configuration

Subscription products use first-class properties on `ProductRoot` (consistent with `IsDigitalProduct`):

### ProductRoot Model Additions

```csharp
public class ProductRoot
{
    // Existing properties...
    public bool IsDigitalProduct { get; set; }

    // Subscription properties (first-class, visible in UI)
    public bool IsSubscriptionProduct { get; set; }
    public BillingInterval? SubscriptionBillingInterval { get; set; }
    public int? SubscriptionBillingIntervalCount { get; set; }  // e.g., 3 for quarterly
    public int? SubscriptionTrialDays { get; set; }
}
```

### DTOs

```csharp
// ProductRootDetailDto - full editing
public class ProductRootDetailDto
{
    // Existing...
    public bool IsSubscriptionProduct { get; set; }
    public BillingInterval? SubscriptionBillingInterval { get; set; }
    public int? SubscriptionBillingIntervalCount { get; set; }
    public int? SubscriptionTrialDays { get; set; }
}

// ProductListItemDto - badge display
public class ProductListItemDto
{
    // Existing...
    public bool IsSubscriptionProduct { get; set; }
}
```

### Provider-Specific Price IDs

Provider price/plan IDs remain in ExtendedData (they're provider-specific metadata):

```csharp
// Provider-specific price IDs (stored in ExtendedData)
product.ExtendedData["Stripe:PriceId"] = "price_1234567890";
product.ExtendedData["PayPal:PlanId"] = "P-1234567890";
```

### Admin UI Display

Staff can easily identify subscription products via:

1. **Product List**: Badge column showing "Subscription" badge (like stock status badges)
2. **Product Detail**: Badge in header + dedicated subscription settings panel
3. **Validation**: System prevents mixing subscription and regular items in basket

```typescript
// In product-table.element.ts
${product.isSubscriptionProduct
  ? html`<span class="badge badge-subscription">Subscription</span>`
  : nothing}

// In product-detail.element.ts header
${this._product?.isSubscriptionProduct
  ? html`<span class="badge badge-subscription">Subscription</span>`
  : nothing}
```

### Basket Validation

Subscription products must be purchased alone (one subscription per basket):

```csharp
// In AddToBasketAsync
if (product.IsSubscriptionProduct)
{
    if (basket.LineItems.Any())
        return CrudResult<Basket>.Failure("Subscription products must be purchased alone");

    // Mark line item as subscription
    lineItem.ExtendedData["IsSubscription"] = "true";
}

// When adding non-subscription item
if (basket.LineItems.Any(li => li.ExtendedData.ContainsKey("IsSubscription")))
    return CrudResult<Basket>.Failure("Cannot add items to basket containing subscription");
```

## Database Schema

### merchelloSubscriptions

| Column | Type | Description |
|--------|------|-------------|
| Id | uniqueidentifier | Primary key |
| CustomerId | uniqueidentifier | FK to Customer |
| ProductId | uniqueidentifier | FK to Product |
| PlanName | nvarchar(200) | Display name |
| PaymentProviderAlias | nvarchar(50) | Provider identifier |
| ProviderSubscriptionId | nvarchar(200) | Provider's subscription ID |
| ProviderCustomerId | nvarchar(200) | Provider's customer ID |
| ProviderPlanId | nvarchar(200) | Provider's price/plan ID |
| Status | int | SubscriptionStatus enum |
| BillingInterval | int | BillingInterval enum |
| BillingIntervalCount | int | e.g., 3 for quarterly |
| Amount | decimal(18,4) | Subscription amount |
| CurrencyCode | nvarchar(3) | Currency code |
| AmountInStoreCurrency | decimal(18,4) | Store currency equivalent |
| Quantity | int | For seat-based |
| HasTrial | bit | Has trial period |
| TrialEndsAt | datetime2 | Trial end date |
| CurrentPeriodStart | datetime2 | Current billing period start |
| CurrentPeriodEnd | datetime2 | Current billing period end |
| NextBillingDate | datetime2 | Next billing date |
| CancelledAt | datetime2 | Cancellation date |
| EndedAt | datetime2 | End date |
| CancellationReason | nvarchar(1000) | Cancellation reason |
| IsPaused | bit | Is paused |
| PausedAt | datetime2 | Pause date |
| ResumeAt | datetime2 | Scheduled resume date |
| DateCreated | datetime2 | Created timestamp |
| DateUpdated | datetime2 | Updated timestamp |
| ExtendedData | nvarchar(3000) | JSON custom data |

**Indexes:**
- `IX_merchelloSubscriptions_CustomerId`
- `IX_merchelloSubscriptions_Status`
- `IX_merchelloSubscriptions_PaymentProviderAlias`
- `IX_merchelloSubscriptions_ProviderSubscriptionId` (unique within provider)
- `IX_merchelloSubscriptions_NextBillingDate`

### merchelloSubscriptionInvoices

| Column | Type | Description |
|--------|------|-------------|
| Id | uniqueidentifier | Primary key |
| SubscriptionId | uniqueidentifier | FK to Subscription |
| InvoiceId | uniqueidentifier | FK to Invoice |
| PeriodStart | datetime2 | Billing period start |
| PeriodEnd | datetime2 | Billing period end |
| ProviderInvoiceId | nvarchar(200) | Provider's invoice ID |
| DateCreated | datetime2 | Created timestamp |

## Stripe Integration

> **Note:** `GetOrCreateStripeCustomerAsync` already exists in `StripePaymentProvider` from the vaulted payments implementation. It searches by `merchelloCustomerId` metadata, falls back to email, and creates a new Stripe Customer if needed. The subscription implementation reuses this helper directly - no duplication required. Similarly, `GetOrCreateBraintreeCustomerAsync` exists in `BraintreePaymentProvider`.

### Creating Subscriptions

```csharp
public async Task<CreateSubscriptionResult> CreateSubscriptionAsync(
    CreateSubscriptionRequest request,
    CancellationToken cancellationToken = default)
{
    // Reuses existing helper from vaulted payments implementation
    var customer = await GetOrCreateStripeCustomerAsync(
        request.CustomerId,
        request.CustomerEmail,
        request.CustomerName,
        cancellationToken);

    // Create subscription
    var options = new SubscriptionCreateOptions
    {
        Customer = customer.Id,
        Items = [new SubscriptionItemOptions { Price = request.ProviderPriceId }],
        PaymentBehavior = "default_incomplete",
        PaymentSettings = new SubscriptionPaymentSettingsOptions
        {
            SaveDefaultPaymentMethod = "on_subscription"
        },
        Metadata = new Dictionary<string, string>
        {
            ["merchello_customer_id"] = request.CustomerId.ToString(),
            ["merchello_product_id"] = request.ProductId.ToString()
        }
    };

    // Attach saved payment method if provided (from vaulted payments)
    if (!string.IsNullOrEmpty(request.PaymentMethodToken))
    {
        options.DefaultPaymentMethod = request.PaymentMethodToken;
    }

    if (request.TrialDays > 0)
    {
        options.TrialPeriodDays = request.TrialDays;
    }

    var subscription = await _client.Subscriptions.CreateAsync(options, cancellationToken: cancellationToken);

    return CreateSubscriptionResult.Successful(
        subscription.Id,
        customer.Id,
        MapStatus(subscription.Status),
        subscription.CurrentPeriodStart,
        subscription.CurrentPeriodEnd,
        subscription.TrialEnd);
}
```

### Processing Renewal Webhooks

```csharp
// In ProcessWebhookAsync when invoice.paid is received
if (stripeEvent.Type == "invoice.paid")
{
    var invoice = stripeEvent.Data.Object as Stripe.Invoice;

    if (invoice.Subscription != null)
    {
        return WebhookProcessingResult.Successful(
            WebhookEventType.SubscriptionRenewed,
            invoice.PaymentIntent,
            null,  // InvoiceId will be created by SubscriptionService
            invoice.AmountPaid / 100m,
            subscriptionData: new SubscriptionWebhookData
            {
                ProviderSubscriptionId = invoice.Subscription,
                ProviderInvoiceId = invoice.Id,
                PeriodStart = invoice.PeriodStart,
                PeriodEnd = invoice.PeriodEnd
            });
    }
}
```

### Customer Portal

> **Note:** Stripe's customer portal allows customers to manage payment methods and subscriptions directly on Stripe's hosted UI. This overlaps with Merchello's existing saved payment methods management (`StorefrontSavedPaymentMethodsController`). Both approaches are valid:
> - **Merchello saved methods UI** - Consistent UX across all providers, uses `ISavedPaymentMethodService`
> - **Stripe customer portal** - Stripe-hosted, handles subscription changes + payment method updates in one place
>
> When a customer updates their payment method via Stripe's portal, the change is reflected at the Stripe level. Merchello's `SavedPaymentMethod` records should be synced via webhook or on next access. Consider adding a `subscription.payment_method_updated` webhook handler for this.

```csharp
public async Task<CustomerPortalResult> CreateCustomerPortalSessionAsync(
    string providerCustomerId,
    string returnUrl,
    CancellationToken cancellationToken = default)
{
    var options = new SessionCreateOptions
    {
        Customer = providerCustomerId,
        ReturnUrl = returnUrl
    };

    var session = await _billingPortalService.Sessions.CreateAsync(
        options,
        cancellationToken: cancellationToken);

    return new CustomerPortalResult
    {
        Success = true,
        PortalUrl = session.Url
    };
}
```

## Subscription Testing (Admin UI)

### Test Tab in Provider Config

When a payment provider has `Metadata.SupportsSubscriptions = true`, a "Subscriptions" tab is added to `test-provider-modal.element.ts` (consistent with the existing payment test modal pattern).

### Test Tab Features

1. **Connection Test** - Verify subscription API credentials work
2. **Create Test Subscription** - Create real subscription in provider's sandbox mode
   - Select a subscription product from dropdown
   - Use test card (Stripe: 4242 4242 4242 4242, etc.)
   - Creates subscription in provider's test/sandbox environment
   - Subscription marked with `ExtendedData["IsTestSubscription"] = "true"`
3. **Webhook Simulation** - Simulate subscription events
   - `subscription.created`
   - `subscription.renewed`
   - `subscription.payment_failed`
   - `subscription.cancelled`
4. **View Test Subscriptions** - List subscriptions created in test mode
   - Filter by test subscriptions only
   - Quick cancel/cleanup actions

### Test Mode Detection

Providers indicate test/sandbox mode via configuration:
- **Stripe**: API key starts with `sk_test_`
- **PayPal**: Sandbox checkbox in config
- **Braintree**: Environment setting

### API Endpoints for Testing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payment-providers/{id}/test/subscription` | Create test subscription |
| GET | `/payment-providers/{id}/test/subscriptions` | List test subscriptions |
| POST | `/payment-providers/{id}/test/subscription/{subId}/cancel` | Cancel test subscription |
| POST | `/payment-providers/{id}/test/simulate-subscription-webhook` | Simulate subscription webhook |

### Test Subscription Request

```csharp
public class TestSubscriptionRequestDto
{
    public Guid ProductId { get; set; }           // Subscription product to use
    public decimal? Amount { get; set; }          // Override amount (optional)
    public string? TestEmail { get; set; }        // Test customer email
}

public class TestSubscriptionResultDto
{
    public bool Success { get; set; }
    public string? SubscriptionId { get; set; }
    public string? ProviderSubscriptionId { get; set; }
    public SubscriptionStatus? Status { get; set; }
    public string? ErrorMessage { get; set; }
    public string? CustomerPortalUrl { get; set; }  // For managing test subscription
}
```

### Webhook Simulation

```csharp
public class SimulateSubscriptionWebhookDto
{
    public string EventType { get; set; }         // e.g., "subscription.renewed"
    public string? SubscriptionId { get; set; }   // Merchello subscription ID
    public string? CustomPayload { get; set; }    // Custom JSON payload (optional)
}
```

## Testing Checklist

### Provider Integration
- [ ] Subscription creation via Stripe Checkout
- [ ] Subscription creation with payment method token
- [ ] Subscription creation with saved/vaulted payment method (SavedPaymentMethodId)
- [ ] Trial period handling
- [ ] Cancel subscription (at period end)
- [ ] Cancel subscription (immediately)
- [ ] Pause/Resume subscription (if provider supports)
- [ ] Customer portal session creation

### Webhooks
- [ ] Webhook: subscription.created
- [ ] Webhook: invoice.paid (renewal)
- [ ] Webhook: invoice.payment_failed
- [ ] Webhook: customer.subscription.updated (plan change, quantity change)
- [ ] Webhook: customer.subscription.deleted (cancellation)
- [ ] External webhook delivery for subscription events
- [ ] Invoice creation from renewal webhook

### Admin UI - Subscriptions
- [ ] Admin UI: List with filters
- [ ] Admin UI: Detail view
- [ ] Admin UI: Cancel modal
- [ ] Admin UI: Customer subscriptions tab
- [ ] Subscription metrics calculation

### Admin UI - Products
- [ ] Product list: Subscription badge visible
- [ ] Product detail: Subscription badge in header
- [ ] Product detail: Subscription settings panel
- [ ] Basket validation: Reject mixed subscription/regular items

### Admin UI - Test Tab
- [ ] Test tab appears when provider supports subscriptions
- [ ] Create test subscription in sandbox mode
- [ ] View test subscriptions list
- [ ] Cancel test subscription
- [ ] Simulate subscription webhooks

## File Locations

### Core Models
- `src/Merchello.Core/Subscriptions/Models/Subscription.cs`
- `src/Merchello.Core/Subscriptions/Models/SubscriptionInvoice.cs`
- `src/Merchello.Core/Subscriptions/Models/SubscriptionStatus.cs`
- `src/Merchello.Core/Subscriptions/Models/BillingInterval.cs`
- `src/Merchello.Core/Subscriptions/Models/CreateSubscriptionRequest.cs`
- `src/Merchello.Core/Subscriptions/Models/CreateSubscriptionResult.cs`
- `src/Merchello.Core/Subscriptions/Models/SubscriptionActionResult.cs`
- `src/Merchello.Core/Subscriptions/Models/CustomerPortalResult.cs`
- `src/Merchello.Core/Subscriptions/Models/SubscriptionMetrics.cs`

### Payment Provider Extensions (Modified Files - vault methods already present)

- `src/Merchello.Core/Payments/Providers/Interfaces/IPaymentProvider.cs` - Add subscription methods (vault methods already exist)
- `src/Merchello.Core/Payments/Providers/PaymentProviderBase.cs` - Add subscription defaults (vault defaults already exist)
- `src/Merchello.Core/Payments/Models/PaymentProviderMetadata.cs` - Add `SupportsSubscriptions`, `SupportsPause` (vault fields already exist)

### Product Model Extensions (Modified Files)
- `src/Merchello.Core/Products/Models/ProductRoot.cs` - Add `IsSubscriptionProduct`, billing properties
- `src/Merchello.Core/Products/Dtos/ProductRootDetailDto.cs` - Add subscription properties
- `src/Merchello.Core/Products/Dtos/ProductListItemDto.cs` - Add `IsSubscriptionProduct`

### Services
- `src/Merchello.Core/Subscriptions/Services/Interfaces/ISubscriptionService.cs`
- `src/Merchello.Core/Subscriptions/Services/SubscriptionService.cs`
- `src/Merchello.Core/Subscriptions/Services/Parameters/*.cs`

### Factory
- `src/Merchello.Core/Subscriptions/Factories/SubscriptionFactory.cs`

### Notifications
- `src/Merchello.Core/Subscriptions/Notifications/SubscriptionCreatingNotification.cs`
- `src/Merchello.Core/Subscriptions/Notifications/SubscriptionCreatedNotification.cs`
- `src/Merchello.Core/Subscriptions/Notifications/SubscriptionCancellingNotification.cs`
- `src/Merchello.Core/Subscriptions/Notifications/SubscriptionCancelledNotification.cs`
- `src/Merchello.Core/Subscriptions/Notifications/SubscriptionRenewedNotification.cs`
- `src/Merchello.Core/Subscriptions/Notifications/SubscriptionPaymentFailedNotification.cs`
- `src/Merchello.Core/Subscriptions/Notifications/SubscriptionStatusChangedNotification.cs`
- `src/Merchello.Core/Subscriptions/Notifications/SubscriptionTrialEndingNotification.cs`

### Database Mapping
- `src/Merchello.Core/Subscriptions/Mapping/SubscriptionDbMapping.cs`
- `src/Merchello.Core/Subscriptions/Mapping/SubscriptionInvoiceDbMapping.cs`

### DTOs
- `src/Merchello.Core/Subscriptions/Dtos/SubscriptionDto.cs`
- `src/Merchello.Core/Subscriptions/Dtos/SubscriptionListItemDto.cs`
- `src/Merchello.Core/Subscriptions/Dtos/SubscriptionDetailDto.cs`
- `src/Merchello.Core/Subscriptions/Dtos/CancelSubscriptionDto.cs`
- `src/Merchello.Core/Subscriptions/Dtos/PauseSubscriptionDto.cs`

### Controllers
- `src/Merchello/Controllers/SubscriptionsApiController.cs`

### Admin UI - Subscriptions Workspace
- `src/Merchello/Client/src/subscriptions/manifest.ts`
- `src/Merchello/Client/src/subscriptions/contexts/subscriptions-workspace.context.ts`
- `src/Merchello/Client/src/subscriptions/components/subscriptions-list.element.ts`
- `src/Merchello/Client/src/subscriptions/components/subscription-detail.element.ts`
- `src/Merchello/Client/src/subscriptions/components/subscription-timeline.element.ts`
- `src/Merchello/Client/src/subscriptions/modals/cancel-subscription-modal.element.ts`
- `src/Merchello/Client/src/subscriptions/modals/cancel-subscription-modal.token.ts`
- `src/Merchello/Client/src/subscriptions/types/subscription.types.ts`

### Admin UI - Modified Files
- `src/Merchello/Client/src/products/components/product-table.element.ts` - Add subscription badge
- `src/Merchello/Client/src/products/components/product-detail.element.ts` - Add subscription badge + settings panel
- `src/Merchello/Client/src/products/types/product.types.ts` - Add `isSubscriptionProduct`
- `src/Merchello/Client/src/payment-providers/modals/test-provider-modal.element.ts` - Add Subscriptions test tab
- `src/Merchello/Client/src/shared/styles/badge.styles.ts` - Add `.badge-subscription` style
