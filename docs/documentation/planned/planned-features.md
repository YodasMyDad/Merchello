# Planned Features

Merchello includes database tables and entity models for several features that are not yet fully implemented. These are scaffolded and ready for development but do not yet have service layers, API endpoints, or backoffice UI.

This page documents what exists, what the intended functionality is, and what you should know if you are planning to contribute to or extend these features.

> **Note:** These features have database tables created via EF Core migrations. The models are mapped and registered in `MerchelloDbContext`. What is missing is the service layer, API controllers, and backoffice UI.

---

## Gift Cards

**Status:** Database tables and models exist. No services, API, or UI.

Gift cards support both digital and physical card types, with balance tracking and a full transaction history.

### Models

**GiftCard** -- the main entity:

| Property | Type | Description |
|---|---|---|
| `Code` | `string` | Unique gift card code |
| `Pin` | `string?` | Optional PIN for additional security |
| `CardType` | `GiftCardType` | Digital, Physical, or StoreCredit |
| `InitialBalance` | `decimal` | Original loaded amount |
| `CurrentBalance` | `decimal` | Remaining balance |
| `CurrencyCode` | `string` | Currency of the balance |
| `Status` | `GiftCardStatus` | Current status |
| `IsReloadable` | `bool` | Whether additional funds can be added |
| `PurchasedByCustomerId` | `Guid?` | Who bought it |
| `IssuedToCustomerId` | `Guid?` | Who it was issued to |
| `RecipientEmail` | `string?` | Email for digital delivery |
| `RecipientName` | `string?` | Recipient name |
| `PersonalMessage` | `string?` | Gift message |
| `SourceInvoiceId` | `Guid?` | Invoice from which the card was purchased |
| `ActivationDate` | `DateTime?` | When the card becomes usable |
| `ExpirationDate` | `DateTime?` | When the card expires |
| `PhysicalCardNumber` | `string?` | For physical cards |
| `BatchNumber` | `string?` | For bulk card generation |

**GiftCardStatus:**

| Value | Meaning |
|---|---|
| `Inactive` | Created but not yet activated |
| `Active` | Ready to use |
| `Depleted` | Balance is zero |
| `Expired` | Past expiration date |
| `Suspended` | Temporarily disabled (e.g., suspected fraud) |
| `Cancelled` | Permanently disabled |

**GiftCardType:**

| Value | Description |
|---|---|
| `Digital` | Delivered via email with a code |
| `Physical` | A physical card with printed code |
| `StoreCredit` | Store credit issued as a gift card (e.g., for returns) |

**GiftCardTransaction** -- tracks all balance changes:

| Property | Type | Description |
|---|---|---|
| `TransactionType` | `GiftCardTransactionType` | What happened |
| `Amount` | `decimal` | Transaction amount |
| `BalanceAfter` | `decimal` | Balance after this transaction |
| `InvoiceId` | `Guid?` | Related invoice (for redemption) |
| `PaymentId` | `Guid?` | Related payment |
| `ReturnId` | `Guid?` | Related return (for refund-to-card) |
| `Description` | `string?` | Human-readable description |
| `PerformedBy` | `string?` | Who performed the action |

**GiftCardTransactionType:**

`Activation`, `Redemption`, `Reload`, `Refund`, `Adjustment`, `Expiration`, `Transfer`, `Cancellation`

### Intended Functionality

- Purchase gift cards as products during checkout
- Email digital gift cards to recipients
- Redeem gift cards as a payment method
- Reload cards with additional funds
- Issue store credit as gift cards (e.g., for returns)
- Manage gift cards in the backoffice (balance lookup, adjustment, suspension)

---

## Subscriptions

**Status:** Database tables and models exist. No services, API, or UI.

Subscriptions link recurring billing to payment providers (Stripe, Braintree, etc.) and track billing cycles.

### Models

**Subscription** -- the main entity:

| Property | Type | Description |
|---|---|---|
| `CustomerId` | `Guid` | The subscribing customer |
| `ProductId` | `Guid` | The subscription product |
| `PlanName` | `string` | Display name of the plan |
| `PaymentProviderAlias` | `string` | Which payment provider handles billing |
| `ProviderSubscriptionId` | `string` | Provider's subscription ID |
| `ProviderCustomerId` | `string?` | Provider's customer ID |
| `ProviderPlanId` | `string?` | Provider's plan ID |
| `Status` | `SubscriptionStatus` | Current status |
| `BillingInterval` | `BillingInterval` | How often billing occurs |
| `BillingIntervalCount` | `int` | Number of intervals between billings |
| `Amount` | `decimal` | Billing amount per cycle |
| `CurrencyCode` | `string` | Currency |
| `Quantity` | `int` | Quantity of the subscription product |
| `HasTrial` | `bool` | Whether a trial period applies |
| `TrialEndsAt` | `DateTime?` | When the trial ends |
| `CurrentPeriodStart` | `DateTime?` | Start of current billing period |
| `CurrentPeriodEnd` | `DateTime?` | End of current billing period |
| `NextBillingDate` | `DateTime?` | Next charge date |
| `IsPaused` | `bool` | Whether the subscription is paused |
| `PausedAt` | `DateTime?` | When pausing started |
| `ResumeAt` | `DateTime?` | When to automatically resume |

**SubscriptionStatus:**

| Value | Meaning |
|---|---|
| `Trialing` | In free trial period |
| `Active` | Actively billing |
| `PastDue` | Payment failed, grace period |
| `Paused` | Temporarily paused |
| `Cancelled` | Cancelled but may still be active until period end |
| `Ended` | Fully terminated |
| `Unpaid` | Payment failed and grace period expired |

**BillingInterval:**

`Daily` (1), `Weekly` (7), `Monthly` (30), `Yearly` (365)

**SubscriptionInvoice** -- links subscription billing cycles to Merchello invoices:

| Property | Type | Description |
|---|---|---|
| `SubscriptionId` | `Guid` | The subscription |
| `InvoiceId` | `Guid` | The Merchello invoice |
| `PeriodStart` | `DateTime` | Billing period start |
| `PeriodEnd` | `DateTime` | Billing period end |
| `ProviderInvoiceId` | `string?` | Provider's invoice ID |

### Intended Functionality

- Create subscription products in the catalogue
- Sync subscription lifecycle with payment providers
- Track billing history via SubscriptionInvoice records
- Handle trial periods, pauses, and cancellations
- Webhook-driven status updates from payment providers

---

## Returns / RMA

**Status:** Database tables and models exist. No services, API, or UI.

A full returns management workflow with line-item tracking, condition assessment, and restocking.

### Models

**Return** -- the main entity:

| Property | Type | Description |
|---|---|---|
| `InvoiceId` | `Guid` | The original invoice |
| `OrderId` | `Guid?` | The specific order being returned |
| `CustomerId` | `Guid` | The customer requesting the return |
| `RmaNumber` | `string` | Unique RMA tracking number |
| `Status` | `ReturnStatus` | Current workflow status |
| `ReturnType` | `ReturnType` | How the customer wants to be made whole |
| `CustomerNotes` | `string` | Customer's reason description |
| `StaffNotes` | `string?` | Internal staff notes |
| `ApprovedBy` | `string?` | Who approved the return |
| `RejectionReason` | `string?` | Why it was rejected |
| `TrackingNumber` | `string?` | Return shipment tracking |
| `Carrier` | `string?` | Return shipment carrier |
| `RefundAmount` | `decimal` | Amount to refund |
| `RestockingFee` | `decimal` | Restocking fee deducted |
| `RefundPaymentId` | `Guid?` | The refund payment record |
| `GiftCardId` | `Guid?` | Gift card if refunded as store credit |

**ReturnStatus** -- the workflow stages:

`Requested` -> `Pending` -> `Approved` / `Rejected` -> `InTransit` -> `Received` -> `Processing` -> `Completed` / `Cancelled`

**ReturnType:**

| Value | Description |
|---|---|
| `Refund` | Refund to original payment method |
| `Exchange` | Exchange for a different product |
| `StoreCredit` | Issue store credit (gift card) |

**ReturnLineItem** -- individual items being returned:

| Property | Type | Description |
|---|---|---|
| `OriginalLineItemId` | `Guid` | References the original order line item |
| `QuantityRequested` | `int` | How many the customer wants to return |
| `QuantityReceived` | `int` | How many were actually received |
| `QuantityRestocked` | `int` | How many were returned to inventory |
| `Condition` | `ReturnLineItemCondition` | Condition assessment |
| `ShouldRestock` | `bool` | Whether to put items back in stock |
| `ReturnReasonId` | `Guid` | Why it is being returned |

**ReturnLineItemCondition:**

`Unknown`, `New`, `LikeNew`, `Used`, `Damaged`, `Defective`

**ReturnReason** -- configurable return reasons:

| Property | Type | Description |
|---|---|---|
| `Name` | `string` | Reason name (e.g., "Wrong size") |
| `Description` | `string?` | Optional explanation |
| `RequiresCustomerComment` | `bool` | Whether a comment is required when selecting this reason |
| `IsActive` | `bool` | Whether this reason is currently available |
| `SortOrder` | `int` | Display order |

### Intended Functionality

- Customer-initiated return requests via storefront portal
- Staff approval/rejection workflow in backoffice
- Return shipment tracking
- Condition assessment on receipt
- Automatic restocking of returned inventory
- Refund processing (original payment, store credit, or exchange)
- Configurable return reasons and restocking fees

---

## Product Search

**Status:** Database table and model exist. No services, API, or UI.

A pluggable product search provider system for integrating with external search services (e.g., Algolia, Elasticsearch, Meilisearch).

### Model

**SearchProviderSetting:**

| Property | Type | Description |
|---|---|---|
| `ProviderKey` | `string` | Unique key identifying the search provider |
| `IsActive` | `bool` | Whether this provider is currently active |
| `SettingsJson` | `string?` | Provider-specific configuration as JSON |

### Intended Functionality

- Pluggable search provider system via `ExtensionManager`
- Provider-specific settings stored as JSON
- Only one active provider at a time
- Index product data to external search services
- Query external search for storefront product search/filtering

---

## Audit Trail

**Status:** Database table exists. The model and mapping are in place.

An audit trail for tracking all significant actions in the system.

### What Exists

The `AuditTrailEntry` entity and its `DbSet` are registered in `MerchelloDbContext`. The audit trail is designed to capture who performed what action, when, and on which entity.

### Intended Functionality

- Automatic audit logging for all create/update/delete operations
- Searchable audit history in the backoffice
- Filterable by entity type, user, and date range
- Useful for compliance and debugging

---

## Customer Portal

The customer portal is a planned storefront feature that would give logged-in customers access to:

- Order history and order detail
- Return requests (using the RMA system above)
- Saved addresses management
- Subscription management
- Gift card balances
- Download links for digital purchases

The building blocks for this are already in place (customer addresses, download links, etc.), but the portal views and controllers have not been built yet.

---

## Contributing

If you are interested in implementing any of these features, the database schema and models are already defined. The next steps would typically be:

1. Create a service class with `IEFCoreScopeProvider<MerchelloDbContext>` for data access
2. Create a factory class for entity creation
3. Create DTOs for the API layer
4. Create an API controller
5. Create backoffice UI components (TypeScript/Lit)
6. Create storefront views/controllers where applicable
