# Payment Provider System - Architecture

## Overview

Pluggable payment provider system with built-in providers (Manual Payment, Stripe, PayPal, Braintree) and support for third-party providers as NuGet packages. All providers are auto-discovered and configurable via backoffice.

**Key Concept: Provider → Methods**

Each payment provider (gateway) can offer multiple payment methods:
- **Stripe** → Cards, Apple Pay, Google Pay, Link
- **Braintree** → Cards, PayPal, Apple Pay, Google Pay, Venmo, iDEAL, Bancontact, SEPA, EPS, P24
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
| `PaymentMethodType` | Category/type of method for deduplication (Cards, ApplePay, etc.) |
| `PaymentSessionResult` | Session creation response (redirect URL, adapter URL, SDK config) |
| `ProcessPaymentRequest` | Standard payment processing request |
| `ExpressCheckoutRequest` | Express checkout request with customer data |
| `ExpressCheckoutResult` | Express checkout processing result |
| `PaymentIntegrationType` | How method integrates with checkout UI |
| `WebhookEventTemplate` | Template for simulating webhook events |
| `TestWebhookParameters` | Parameters for generating test webhook payloads |

## Payment Adapter Architecture

The checkout uses a **dynamic adapter pattern** to support any payment provider without hard-coded provider logic. This ensures the checkout is truly pluggable - new providers work automatically without modifying checkout code.

### How It Works

```
Provider.CreatePaymentSessionAsync()
    ↓
PaymentSessionResult (includes adapterUrl, providerAlias, methodAlias)
    ↓
payment.js loads adapter dynamically
    ↓
window.MerchelloPaymentAdapters[providerAlias].render()
    ↓
User completes payment
    ↓
adapter.submit() → POST /api/merchello/checkout/process-payment
```

### PaymentSessionResult Adapter Properties

| Property | Purpose |
|----------|---------|
| `AdapterUrl` | URL to the JavaScript adapter file |
| `ProviderAlias` | Provider identifier for adapter lookup |
| `MethodAlias` | Method identifier passed to adapter |
| `JsSdkUrl` | URL to provider's SDK (Stripe.js, Braintree, etc.) |
| `SdkConfiguration` | Provider-specific SDK configuration |
| `ClientSecret` or `ClientToken` | Authentication token for SDK |

### Factory Methods

Use these factory methods on `PaymentSessionResult` to create properly configured sessions:

| Method | Integration Type | Use When |
|--------|-----------------|----------|
| `Redirect(url, sessionId)` | Redirect | External payment page |
| `HostedFields(...)` | HostedFields | Inline card fields with adapter |
| `Widget(...)` | Widget | Embedded provider UI with adapter |
| `DirectForm(formFields, sessionId)` | DirectForm | Custom form fields |

### Adapter Interface

Adapters register with `window.MerchelloPaymentAdapters` and must implement:

```javascript
window.MerchelloPaymentAdapters['provider-alias'] = {
    // Render payment UI into container
    async render(container, session, checkout) { },

    // Submit payment - called when user clicks Pay
    // Returns: { success: boolean, error?: string, transactionId?: string }
    async submit(invoiceId, options) { },

    // Get payment token without submitting (for backoffice testing)
    // Returns: { success: boolean, nonce?: string, error?: string, isButtonFlow?: boolean }
    async tokenize() { },

    // Cleanup when switching methods
    teardown() { }
};
```

### Built-in Adapters

| Provider | Adapter URL | Purpose |
|----------|-------------|---------|
| Stripe | `/_content/Merchello/js/checkout/adapters/stripe-payment-adapter.js` | Cards (Elements) |
| Stripe Express | `/_content/Merchello/js/checkout/adapters/stripe-express-adapter.js` | Apple Pay, Google Pay, Link |
| Braintree | `/_content/Merchello/js/checkout/adapters/braintree-payment-adapter.js` | Cards (Hosted Fields) |
| Braintree Express | `/_content/Merchello/js/checkout/adapters/braintree-express-adapter.js` | PayPal, Apple Pay, Google Pay, Venmo |
| Braintree Local | `/_content/Merchello/js/checkout/adapters/braintree-local-payment-adapter.js` | iDEAL, Bancontact, SEPA, EPS, P24 |
| PayPal | `/_content/Merchello/js/checkout/adapters/paypal-unified-adapter.js` | PayPal, Pay Later (standard + express) |

### RCL Requirement for Third-Party Providers

Third-party payment providers that include JavaScript adapters **must be Razor Class Libraries (RCL)**, not plain class libraries. RCLs serve static files from `/_content/{AssemblyName}/` path.

```csharp
// Third-party provider adapter URL pattern
"/_content/MyCompany.Merchello.MyProvider/adapters/myprovider-payment-adapter.js"
```

### Method Icons

Providers return `IconHtml` in `PaymentMethodDefinition` to provide custom SVG icons for each payment method. The checkout displays these icons without any hard-coded icon mappings.

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

### Built-in Providers

#### Manual Payment
- Location: `Providers/BuiltIn/ManualPaymentProvider.cs`
- Auto-enabled on every startup via `EnsureBuiltInPaymentProvidersHandler`
- Offers two methods:
  - **Manual Payment** (`manual`): Hidden from checkout, for backoffice recording of cash, check, bank transfer
  - **Purchase Order** (`purchaseorder`): Visible in checkout, customer enters PO number which is saved to `Invoice.PurchaseOrder`

#### Stripe
- Location: `Providers/Stripe/StripePaymentProvider.cs`
- NuGet: `Stripe.net`
- Methods: Cards (Redirect or Hosted Fields), Apple Pay, Google Pay, Link
- Supports refunds, partial refunds, auth-and-capture

#### PayPal
- Location: `Providers/PayPal/PayPalPaymentProvider.cs`
- NuGet: `PayPalServerSDK` (v1.1.1+)
- Methods: PayPal (Widget, Express Checkout), Pay Later (Widget)
- Configuration: Client ID, Client Secret, Webhook ID, optional Brand Name
- Webhook endpoint: `/umbraco/merchello/webhooks/payments/paypal`
- Required webhook events:
  - `CHECKOUT.ORDER.APPROVED`
  - `PAYMENT.CAPTURE.COMPLETED`
  - `PAYMENT.CAPTURE.DENIED`
  - `PAYMENT.CAPTURE.REFUNDED`
- Supports refunds, partial refunds, auth-and-capture
- Pay Later available in US, UK, AU, FR, DE, ES, IT

#### Braintree
- Location: `Providers/Braintree/BraintreePaymentProvider.cs`
- NuGet: `Braintree` (v5.38.0+)
- Methods:
  - Cards (Hosted Fields with 3D Secure 2)
  - PayPal, Apple Pay, Google Pay, Venmo (Express Checkout)
  - iDEAL, Bancontact, SEPA, EPS, P24 (Local Payment Methods - EU)
- Configuration: Merchant ID, Public Key, Private Key, Environment, optional Merchant Account ID
- Webhook endpoint: `/umbraco/merchello/webhooks/payments/braintree`
- Required webhook events:
  - `transaction_settled`, `transaction_settlement_declined`
  - `dispute_opened`, `dispute_won`, `dispute_lost`
  - `local_payment_completed`, `local_payment_reversed`, `local_payment_expired`
- Supports refunds, partial refunds, auth-and-capture
- Local payment methods require PayPal business account linked to Braintree

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

### Method Type & Deduplication

When multiple providers offer the same payment method (e.g., Stripe and Braintree both offering Apple Pay), only one should appear at checkout to avoid duplicate buttons.

**PaymentMethodTypes Class** (string constants for extensibility):
```csharp
public static class PaymentMethodTypes
{
    public const string Cards = "cards";           // Credit/Debit cards
    public const string ApplePay = "apple-pay";    // Apple Pay
    public const string GooglePay = "google-pay";  // Google Pay
    public const string AmazonPay = "amazon-pay";  // Amazon Pay
    public const string PayPal = "paypal";         // PayPal
    public const string Link = "link";             // Stripe Link
    public const string BuyNowPayLater = "bnpl";   // Klarna, Afterpay, etc.
    public const string BankTransfer = "bank-transfer"; // Direct bank transfer
    public const string Venmo = "venmo";           // Venmo (US only)
    public const string Manual = "manual";         // Offline payment
}
// Third-party providers can use any string - only matching types are deduplicated
```

**Deduplication Rules:**
- Each `PaymentMethodDefinition` declares its `MethodType` (string)
- At checkout, methods are grouped by `MethodType`
- For each type, only the method with the **lowest SortOrder** is shown
- Methods with `null` or unique string values are NOT deduplicated

**Admin Controls Priority:**
- Enable/disable specific methods per provider
- Adjust method sort order (lower = higher priority)

**Example:** If both Stripe and Braintree have Apple Pay enabled:
- Stripe Apple Pay: SortOrder = 5 → **Shown** (lower)
- Braintree Apple Pay: SortOrder = 10 → Hidden

### Refunds
- Stored as `Payment` records with negative `Amount`
- `PaymentType` enum: `Payment`, `Refund`, `PartialRefund`
- `ParentPaymentId` links refund to original

### Webhooks
- Custom `PaymentWebhookController` at `/umbraco/merchello/webhooks/payments/{alias}`
- Each provider validates own signatures
- Idempotency via `TransactionId` uniqueness

### Webhook Testing (Backoffice)
Providers can implement webhook testing to allow admins to simulate webhook events without external tools:
- `GetWebhookEventTemplatesAsync()` - Returns available events (payment completed, refunded, dispute, etc.)
- `GenerateTestWebhookPayloadAsync()` - Generates provider-specific test payloads
- Built-in providers (Stripe, Braintree, PayPal) include comprehensive templates
- Test modal in backoffice allows selecting event type and simulating webhook processing

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
- `Id` (Guid), `PaymentProviderSettingId` (FK), `MethodAlias`, `DisplayNameOverride`, `IsEnabled`, `ShowInCheckout` (bool?), `SortOrder`, timestamps
- Unique index on `(PaymentProviderSettingId, MethodAlias)`
- `ShowInCheckout`: If null, uses provider's `ShowInCheckoutByDefault` value. False for backoffice-only methods like Manual Payment.

**merchelloPayments** (additions)
- `PaymentProviderAlias`, `PaymentMethodAlias`, `PaymentType` (enum), `RefundReason`, `ParentPaymentId` (Guid?)

## File Structure

```
src/Merchello.Core/Payments/
├── Providers/
│   ├── BuiltIn/
│   │   └── ManualPaymentProvider.cs      # Built-in, auto-enabled on startup
│   ├── Stripe/
│   │   └── StripePaymentProvider.cs      # Built-in Stripe provider
│   ├── PayPal/
│   │   └── PayPalPaymentProvider.cs      # Built-in PayPal provider
│   ├── Braintree/
│   │   └── BraintreePaymentProvider.cs   # Built-in Braintree provider
│   ├── IPaymentProvider.cs
│   ├── PaymentProviderBase.cs
│   ├── PaymentProviderMetadata.cs
│   ├── PaymentProviderConfigurationField.cs
│   ├── PaymentProviderConfiguration.cs
│   ├── IPaymentProviderManager.cs
│   ├── PaymentProviderManager.cs
│   └── RegisteredPaymentProvider.cs
├── Models/
│   ├── PaymentMethodDefinition.cs          # Method definition with MethodType
│   ├── PaymentMethodTypes.cs               # String constants for deduplication
│   ├── PaymentMethodSetting.cs             # Persisted method settings
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
│   ├── WebhookProcessingResult.cs
│   ├── WebhookEventTemplate.cs            # Webhook test templates
│   └── TestWebhookParameters.cs           # Test webhook parameters
├── Services/
│   ├── Interfaces/IPaymentService.cs
│   └── PaymentService.cs
├── Handlers/
│   └── EnsureBuiltInPaymentProvidersHandler.cs  # Startup handler
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
| POST | `/api/merchello/checkout/{providerAlias}/create-order` | Create widget order (PayPal-style flow) |
| POST | `/api/merchello/checkout/{providerAlias}/capture-order` | Capture widget order after approval |

**Widget Flow Note:** The `create-order` and `capture-order` endpoints support any provider implementing the widget payment pattern (create → approve → capture). Third-party providers can use these generic endpoints by passing their provider alias in the URL.

### Backoffice (Admin)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/payment-providers/available` | All discovered providers |
| GET | `/api/v1/payment-providers` | All configured settings |
| GET | `/api/v1/payment-providers/{id}/methods` | Methods for a provider |
| PUT | `/api/v1/payment-providers/{id}/methods/{alias}` | Enable/disable method |

### Backoffice Testing
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/payment-providers/{id}/test` | Create test payment session |
| POST | `/api/v1/payment-providers/{id}/test/process-payment` | Process test payment |
| GET | `/api/v1/payment-providers/{id}/test/express-config` | Get express checkout config |
| GET | `/api/v1/payment-providers/{id}/test/webhook-events` | Get available webhook templates |
| POST | `/api/v1/payment-providers/{id}/test/simulate-webhook` | Simulate webhook event |

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
- [x] Backoffice test modal with 4 tabs (Session, Payment Form, Express, Webhooks)
- [x] Webhook simulation generates provider-specific payloads
- [x] Payment adapters support tokenize() for backoffice testing
- [x] Widget flow endpoints work with any provider (genericized from PayPal-specific)
