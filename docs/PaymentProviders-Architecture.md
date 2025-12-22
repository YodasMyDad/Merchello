# Payment Provider System - Architecture

## Overview

Pluggable payment provider system allowing third-party providers (Stripe, PayPal, Braintree, etc.) as NuGet packages, auto-discovered and configurable via backoffice.

**Key Concept: Provider → Methods**

Each payment provider (gateway) can offer multiple payment methods:
- **Stripe** → Cards, Apple Pay, Google Pay
- **Braintree** → Cards, PayPal, Apple Pay, Venmo
- **PayPal** → PayPal, Pay Later

Methods can be individually enabled/disabled and have different integration types.

## Architecture

| Layer | Components |
|-------|------------|
| **Providers** | `IPaymentProvider` implementations (NuGet packages) |
| **Methods** | `PaymentMethodDefinition` - checkout options per provider |
| **Manager** | `PaymentProviderManager` - discovery via `ExtensionManager`, config loading, lifecycle |
| **Service** | `PaymentService` - orchestrates payments, refunds, status |
| **Storage** | `merchelloPaymentProviders` (provider config), `merchelloPaymentMethods` (method settings), `merchelloPayments` (transactions) |

## Key Interfaces

| Interface/Class | Purpose |
|-----------------|---------|
| `IPaymentProvider` | Provider contract - defines gateway capabilities |
| `PaymentProviderBase` | Base class with default implementations |
| `PaymentProviderMetadata` | Immutable provider metadata (alias, refunds, webhooks) |
| `PaymentMethodDefinition` | Defines a checkout option (integration type, express checkout) |
| `IPaymentProviderManager` | Discovery, configuration, method management |
| `IPaymentService` | Payment orchestration, refunds, status |

## Key Models

| Model | Purpose |
|-------|---------|
| `PaymentMethodDefinition` | Defines a payment method a provider supports |
| `PaymentMethodSetting` | Persisted method settings (enabled, sort order) |
| `PaymentSessionResult` | Session creation response (redirect URL, SDK config) |
| `ProcessPaymentRequest` | Standard payment processing request |
| `ExpressCheckoutRequest` | Express checkout request with customer data |
| `ExpressCheckoutResult` | Express checkout processing result |
| `PaymentIntegrationType` | How method integrates with checkout UI |

## Design Decisions

### Provider → Methods Architecture

```
PaymentProvider (Stripe)
├── Metadata (alias, refunds, webhooks)
├── Configuration (API keys)
└── PaymentMethods[]
    ├── Cards (enabled, sortOrder: 10)
    ├── Apple Pay (enabled, sortOrder: 0, isExpressCheckout: true)
    └── Google Pay (disabled)
```

- **Provider** = Gateway (Stripe, Braintree) - holds credentials, handles API calls
- **Method** = Customer-facing option (Cards, Apple Pay) - has its own integration type
- **Express Checkout** = Methods that appear at start of checkout, collect customer data from provider

### Provider Discovery
- Uses `ExtensionManager` for assembly scanning (same as `IShippingProvider`)
- Providers define immutable `Alias` on class
- Methods declared via `GetAvailablePaymentMethods()`
- Auto-discovered - no manual DI registration

### Method Settings
- Created on-demand when enabling/disabling methods
- If no setting exists, method is enabled by default
- Allows custom display name override
- Independent sort order per method

### Configuration Storage
- Provider settings (API keys, secrets) stored as JSON in `Configuration` column
- Method settings stored in separate `merchelloPaymentMethods` table
- Each provider defines config fields via `GetConfigurationFieldsAsync()`

### Express Checkout
- Methods with `IsExpressCheckout = true` appear at start of checkout
- Customer clicks → Provider handles auth → Returns payment token + customer data
- Order created immediately, skip to confirmation
- Processed via `ProcessExpressCheckoutAsync()`

### Refunds
- Stored as `Payment` records with negative `Amount`
- `PaymentType` enum: `Payment`, `Refund`, `PartialRefund`
- `ParentPaymentId` links refund to original

### Webhooks
- Custom `PaymentWebhookController` at `/umbraco/merchello/webhooks/payments/{alias}`
- Each provider validates own signatures
- Idempotency via `TransactionId` uniqueness

### Invoice Status
- `InvoicePaymentStatus`: `Unpaid`, `AwaitingPayment`, `PartiallyPaid`, `Paid`, `Refunded`, `PartiallyRefunded`
- Calculated from Payment records

## Integration Types

| Type | Value | Examples | Flow |
|------|-------|----------|------|
| `Redirect` | 0 | Stripe Checkout | Customer → external page |
| `HostedFields` | 10 | Braintree Hosted Fields | iframes on checkout |
| `Widget` | 20 | Apple Pay, Google Pay, PayPal | Embedded provider UI |
| `DirectForm` | 30 | Manual Payment | Custom form fields |

**Note:** Integration type is now per-method, not per-provider.

## Session Flow

### Standard Payment Flow
```
1. GET /checkout/payment-methods → Returns enabled methods
2. CreatePaymentSessionAsync(methodAlias) → Returns RedirectUrl/ClientToken/FormFields
3. Customer interaction (based on IntegrationType)
4. ProcessPaymentAsync() → Process result
5. (Optional) Webhook confirms async payments
```

### Express Checkout Flow
```
1. GET /checkout/express-methods → Returns express methods
2. Customer clicks express button (Apple Pay, etc.)
3. Provider handles auth, collects customer data
4. POST /checkout/express → ProcessExpressCheckoutAsync()
5. Order created with provider-returned data
6. Redirect to confirmation
```

## Database Schema

**merchelloPaymentProviders**
- `Id` (Guid), `ProviderAlias`, `DisplayName`, `IsEnabled`, `IsTestMode`, `Configuration` (JSON), `SortOrder`, timestamps

**merchelloPaymentMethods**
- `Id` (Guid), `PaymentProviderSettingId` (FK), `MethodAlias`, `DisplayNameOverride`, `IsEnabled`, `SortOrder`, timestamps
- Unique index on `(PaymentProviderSettingId, MethodAlias)`

**merchelloPayments** (additions)
- `PaymentProviderAlias`, `PaymentMethodAlias`, `PaymentType` (enum), `RefundReason`, `ParentPaymentId` (Guid?)

## File Structure

```
src/Merchello.Core/Payments/
├── Providers/
│   ├── IPaymentProvider.cs
│   ├── PaymentProviderBase.cs
│   ├── PaymentProviderMetadata.cs
│   ├── PaymentProviderConfigurationField.cs
│   ├── PaymentProviderConfiguration.cs
│   ├── IPaymentProviderManager.cs
│   ├── PaymentProviderManager.cs
│   ├── RegisteredPaymentProvider.cs
│   └── ManualPaymentProvider.cs
├── Models/
│   ├── PaymentMethodDefinition.cs          # NEW
│   ├── PaymentMethodSetting.cs             # NEW
│   ├── ExpressCheckoutRequest.cs           # NEW
│   ├── ExpressCheckoutResult.cs            # NEW
│   ├── ExpressCheckoutCustomerData.cs      # NEW
│   ├── ExpressCheckoutAddress.cs           # NEW
│   ├── PaymentType.cs
│   ├── PaymentIntegrationType.cs
│   ├── InvoicePaymentStatus.cs
│   ├── PaymentProviderSetting.cs
│   ├── PaymentRequest.cs
│   ├── PaymentSessionResult.cs
│   ├── ProcessPaymentRequest.cs
│   ├── PaymentResult.cs
│   ├── CheckoutFormField.cs
│   ├── RefundRequest.cs
│   ├── RefundResult.cs
│   └── WebhookProcessingResult.cs
├── Services/
│   ├── Interfaces/IPaymentService.cs
│   └── PaymentService.cs
├── Dtos/
│   └── PaymentMethodDto.cs
└── Mapping/
    ├── PaymentProviderSettingDbMapping.cs
    └── PaymentMethodSettingDbMapping.cs    # NEW

src/Merchello/Controllers/
├── PaymentProvidersApiController.cs
├── PaymentsApiController.cs
├── PaymentWebhookController.cs
└── CheckoutPaymentsApiController.cs
```

## API Endpoints

### Checkout (Public)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/merchello/checkout/express-methods` | Get express checkout methods |
| GET | `/api/merchello/checkout/payment-methods` | Get standard payment methods |
| POST | `/api/merchello/checkout/{invoiceId}/pay` | Create payment session |
| POST | `/api/merchello/checkout/express` | Complete express checkout |

### Backoffice (Admin)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/payment-providers/available` | All discovered providers |
| GET | `/api/v1/payment-providers` | All configured settings |
| GET | `/api/v1/payment-providers/{id}/methods` | Methods for a provider |
| PUT | `/api/v1/payment-providers/{id}/methods/{alias}` | Enable/disable method |

## Testing Checklist

- [x] Provider discovery finds all `IPaymentProvider` implementations
- [x] Provider configuration saves/loads correctly
- [x] Payment session creation returns correct data per integration type
- [x] Redirect flow works end-to-end
- [ ] Express checkout flow works
- [ ] Webhook signature validation
- [ ] Webhook processing updates status
- [x] Refunds create negative payment records
- [x] Partial refunds calculate correctly
- [x] Invoice payment status calculates correctly
- [x] Manual payment recording works
- [x] Provider enable/disable/ordering works
- [ ] Method enable/disable/ordering works
