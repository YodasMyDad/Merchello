# Payment Provider Development Guide (Code-Verified)

Last verified: February 28, 2026.

This is the single source of truth for Merchello payment provider architecture and implementation. It is based on traced runtime code paths and is intended to be handed to an LLM or engineer as the implementation reference for new Merchello payment providers.

## Scope And Code Paths Verified

Primary execution flow traced:

- `src/Merchello/Controllers/CheckoutPaymentsApiController.cs`
- `src/Merchello/Services/CheckoutPaymentsOrchestrationService.cs`
- `src/Merchello.Core/Payments/Services/PaymentService.cs`
- `src/Merchello.Core/Payments/Providers/PaymentProviderManager.cs`
- `src/Merchello.Core/Payments/Providers/Interfaces/IPaymentProvider.cs`
- `src/Merchello.Core/Payments/Providers/PaymentProviderBase.cs`
- `src/Merchello/Controllers/PaymentWebhookController.cs`
- `src/Merchello/Controllers/PaymentProvidersApiController.cs`

Reference provider audited in detail:

- `src/Merchello.Core/Payments/Providers/Braintree/BraintreePaymentProvider.cs`

## Architecture You Must Follow

Merchello uses strict layering:

- Controllers: HTTP only
- Orchestration services: checkout flow orchestration and ownership checks
- `PaymentService`: core payment orchestration and recording
- Providers: gateway-specific logic only
- `PaymentProviderManager`: discovery/configuration/method dedupe

Core request flow:

```text
CheckoutPaymentsApiController
  -> CheckoutPaymentsOrchestrationService
    -> PaymentService
      -> IPaymentProviderManager.GetProviderAsync(...)
        -> IPaymentProvider implementation
```

Do not bypass this flow.

## Built-In Providers In Current Code

Providers currently present in `src/Merchello.Core/Payments/Providers/*`:

- `manual` (Manual Payment + Purchase Order)
- `stripe`
- `paypal`
- `braintree`
- `worldpay`
- `amazonpay`

If docs/examples only list a subset, they are outdated.

## Provider Contract

Implement `IPaymentProvider`, preferably via `PaymentProviderBase`.

Required members:

1. `Metadata`
2. `GetAvailablePaymentMethods()`
3. `CreatePaymentSessionAsync(...)`
4. `ProcessPaymentAsync(...)`

Optional members (defaulted in `PaymentProviderBase`):

- config: `GetConfigurationFieldsAsync`, `ConfigureAsync`
- express: `GetExpressCheckoutClientConfigAsync`, `ProcessExpressCheckoutAsync`
- capture/refund: `CapturePaymentAsync`, `RefundPaymentAsync`
- webhooks: `ValidateWebhookAsync`, `ProcessWebhookAsync`
- webhook simulation: `GetWebhookEventTemplatesAsync`, `GenerateTestWebhookPayloadAsync`
- payment links: `CreatePaymentLinkAsync`, `DeactivatePaymentLinkAsync`
- vault: `CreateVaultSetupSessionAsync`, `ConfirmVaultSetupAsync`, `ChargeVaultedMethodAsync`, `DeleteVaultedMethodAsync`

Minimal skeleton:

```csharp
public sealed class MyGatewayPaymentProvider(ILogger<MyGatewayPaymentProvider> logger) : PaymentProviderBase
{
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "mygateway",
        DisplayName = "My Gateway",
        SupportsRefunds = true,
        RequiresWebhook = true
    };

    public override IReadOnlyList<PaymentMethodDefinition> GetAvailablePaymentMethods() =>
    [
        new PaymentMethodDefinition
        {
            Alias = "cards",
            DisplayName = "Credit/Debit Card",
            MethodType = PaymentMethodTypes.Cards,
            IntegrationType = PaymentIntegrationType.HostedFields,
            IsExpressCheckout = false,
            DefaultSortOrder = 10
        }
    ];

    public override async ValueTask ConfigureAsync(
        PaymentProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        await base.ConfigureAsync(configuration, cancellationToken);
        // Read config values and initialize SDK client(s)
    }

    public override Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request,
        CancellationToken cancellationToken = default) => throw new NotImplementedException();

    public override Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default) => throw new NotImplementedException();
}
```

## Payment Method Definitions And Deduplication

Each provider can expose many methods via `PaymentMethodDefinition`.

Critical fields:

- `Alias`
- `DisplayName`
- `IntegrationType` (`Redirect`, `HostedFields`, `Widget`, `DirectForm`)
- `IsExpressCheckout`
- `DefaultSortOrder`
- `MethodType` for dedupe
- `IconHtml` — custom SVG icon for checkout display (no hard-coded icon mappings)

Use `PaymentMethodTypes` constants for shared methods:

- `cards`
- `apple-pay`
- `google-pay`
- `amazon-pay`
- `paypal`
- `link`
- `bnpl`
- `bank-transfer`
- `venmo`
- `manual`

Deduplication behavior from `PaymentProviderManager`:

1. Dedupes by `MethodType` and lowest `SortOrder`.
2. Methods with `MethodType == null` are never deduped.
3. Redirect methods are never deduped.
4. Express and standard lists are deduped separately.

## Integration Types

| Type | Value | Examples | Flow |
|------|-------|----------|------|
| `Redirect` | 0 | Stripe Checkout | Customer → external page |
| `HostedFields` | 10 | Braintree Hosted Fields | iframes on checkout |
| `Widget` | 20 | Apple Pay, Google Pay, PayPal | Embedded provider UI |
| `DirectForm` | 30 | Manual Payment | Custom form fields |

Integration type is per-method, not per-provider.

## Checkout Flows In Real Code

### Standard Payment Flow

```
1. GET /checkout/payment-methods → Returns enabled methods
2. CreatePaymentSessionAsync(methodAlias) → Returns RedirectUrl/ClientToken/FormFields
3. Customer interaction (based on IntegrationType)
4. ProcessPaymentAsync() → Process result
5. (Optional) Webhook confirms async payments
```

### Standard Session Creation

- Endpoint: `POST /api/merchello/checkout/pay` or `POST /api/merchello/checkout/{invoiceId}/pay`
- Orchestration verifies ownership and provider enablement.
- `PaymentService.CreatePaymentSessionAsync` rate-limits to 10 per minute per invoice.
- For non-DirectForm methods, session creation loads invoice amount/currency.

### DirectForm Special Case

DirectForm has a hard rule:

- Session creation does not require invoice and returns form fields.
- Invoice creation is deferred until direct form submit.
- This prevents ghost orders.

Implementation points:

- `PaymentService.CreatePaymentSessionAsync`: DirectForm branch
- `CheckoutPaymentsOrchestrationService.ProcessDirectPaymentAsync`: creates/reuses invoice after form validation

### Standard Process Payment

- Endpoint: `POST /api/merchello/checkout/process-payment`
- Expects `paymentMethodToken` for HostedFields and most Widget paths.
- Calls `PaymentService.ProcessPaymentAsync`.
- If provider returns `SkipPaymentRecording = true`, payment is accepted but not recorded.

### Express Checkout Flow

```
1. GET /checkout/express-methods → Returns express methods
2. Customer clicks express button (Apple Pay, etc.)
3. Provider handles auth, collects customer data
4. POST /checkout/express → ProcessExpressCheckoutAsync()
5. Order created with provider-returned data
6. Redirect to confirmation
```

- Provider method called: `ProcessExpressCheckoutAsync`.
- Orchestration records payment via `RecordPaymentAsync`.
- If provider omits transaction ID, deterministic fallback ID is generated for idempotent retries.

### Widget Create/Capture Pattern

- Endpoints:
  - `POST /api/merchello/checkout/{providerAlias}/create-order`
  - `POST /api/merchello/checkout/{providerAlias}/capture-order`
- Useful for button-driven providers.
- These generic endpoints work with any provider implementing the widget payment pattern (create → approve → capture).

## Payment And Webhook Persistence Rules

All dedupe/uniqueness must be preserved.

DB constraints in `src/Merchello.Core/Accounting/Mapping/PaymentDbMapping.cs`:

- unique `TransactionId` (filtered non-null)
- unique `IdempotencyKey` (filtered non-null)
- unique `WebhookEventId` (filtered non-null)

Idempotency behavior:

- In-flight markers: 5 minutes (`PaymentIdempotencyService`)
- Durable dedupe: payment table unique indexes

Webhook security behavior:

- endpoint: `POST /umbraco/merchello/webhooks/payments/{providerAlias}`
- rate limit: 60/min/provider/IP (`WebhookSecurityService`)
- in-flight webhook marker: 5 minutes
- durable dedupe: `Payment.WebhookEventId`

Important webhook recording rule:

- `PaymentWebhookController` only records `PaymentCompleted` when webhook result includes:
  - `InvoiceId`
  - `TransactionId`
  - `Amount`

## Refunds

- Stored as `Payment` records with negative `Amount`
- `PaymentType` enum: `Payment`, `Refund`, `PartialRefund`
- `ParentPaymentId` links refund to original payment
- Invoice payment status (`InvoicePaymentStatus`: `Unpaid`, `AwaitingPayment`, `PartiallyPaid`, `Paid`, `Refunded`, `PartiallyRefunded`) is calculated from Payment records

## Key Models Reference

| Model | Purpose |
|-------|---------|
| `PaymentMethodDefinition` | Defines a payment method with integration type, regions, icons |
| `PaymentMethodSetting` | Persisted method settings (enabled, sort order, display override) |
| `PaymentMethodTypes` | String constants for deduplication (Cards, ApplePay, etc.) |
| `PaymentSessionResult` | Session creation response (redirect URL, adapter URL, SDK config) |
| `PaymentResult` | Payment processing result with status, settlement data, risk score |
| `ProcessPaymentRequest` | Standard payment processing request with idempotency support |
| `ExpressCheckoutRequest` | Express checkout request with customer data |
| `ExpressCheckoutResult` | Express checkout processing result |
| `ExpressCheckoutClientConfig` | Client SDK configuration for express checkout buttons |
| `PaymentIntegrationType` | How method integrates with checkout UI |
| `PaymentLinkRequest` | Request to create a shareable payment link |
| `PaymentLinkResult` | Payment link creation result with URL |
| `PaymentCaptureResult` | Result of capturing an authorized payment |
| `WebhookEventTemplate` | Template for simulating webhook events |
| `TestWebhookParameters` | Parameters for generating test webhook payloads |

## Adapter Contract And Static Asset Rules

For HostedFields/Widget methods, return adapter info in `PaymentSessionResult`:

- `AdapterUrl`
- `ProviderAlias`
- `MethodAlias`
- `JavaScriptSdkUrl`
- `SdkConfiguration`

Use factory methods on `PaymentSessionResult` to create properly configured sessions:

| Method | Integration Type | Use When |
|--------|-----------------|----------|
| `Redirect(url, sessionId)` | Redirect | External payment page |
| `HostedFields(...)` | HostedFields | Inline card fields with adapter |
| `Widget(...)` | Widget | Embedded provider UI with adapter |
| `DirectForm(formFields, sessionId)` | DirectForm | Custom form fields |

Built-in checkout runtime paths must stay stable:

- `/App_Plugins/Merchello/js/checkout/*`

Third-party provider adapters should be served from a Razor Class Library (RCL):

- `/_content/{AssemblyName}/adapters/{file}.js`

Third-party payment providers that include JavaScript adapters **must be RCLs**, not plain class libraries. RCLs serve static files from `/_content/{AssemblyName}/` path.

### Adapter Interface

Adapters use a unified interface supporting both standard and express checkout. Adapters register with `window.MerchelloPaymentAdapters` (standard) and `window.MerchelloExpressAdapters` (express):

```javascript
window.MerchelloPaymentAdapters['provider-alias'] = {
    // Adapter configuration
    config: {
        name: 'Provider Name',
        supportsStandard: true,  // Can handle standard checkout
        supportsExpress: false   // Can handle express checkout
    },

    // Render payment UI into container
    // context: { isExpress, session?, checkout?, method? }
    async render(container, sessionOrConfig, context) { },

    // Submit payment - called when user clicks Pay (for form-based flows)
    // Returns: { success: boolean, error?: string, transactionId?: string }
    async submit(sessionId, data) { },

    // Get payment token without submitting (for backoffice testing)
    // Returns: { success: boolean, nonce?: string, error?: string, isButtonFlow?: boolean }
    async tokenize() { },

    // Cleanup when switching methods
    teardown(sessionId) { },

    // Extract customer data from provider response (for express checkout)
    extractCustomerData(data, context) { }
};
```

Registry functions (from `src/Merchello/Client/public/js/checkout/adapters/adapter-interface.js`):
- `registerAdapter(name, adapter)` — registers for both standard and express based on config
- `getAdapter(name, forExpress)` — gets adapter by name
- `hasAdapter(name, forExpress)` — checks if registered
- `unregisterAdapter(name)` — removes adapter

### Built-in Adapters

| Provider | Adapter URL | Purpose |
|----------|-------------|---------|
| Stripe | `/App_Plugins/Merchello/js/checkout/adapters/stripe-payment-adapter.js` | Cards (Payment Element) |
| Stripe Card Elements | `/App_Plugins/Merchello/js/checkout/adapters/stripe-card-elements-adapter.js` | Cards (Individual fields) |
| Stripe Express | `/App_Plugins/Merchello/js/checkout/adapters/stripe-express-adapter.js` | Apple Pay, Google Pay, Link |
| Braintree | `/App_Plugins/Merchello/js/checkout/adapters/braintree-payment-adapter.js` | Cards (Hosted Fields) |
| Braintree Express | `/App_Plugins/Merchello/js/checkout/adapters/braintree-express-adapter.js` | PayPal, Apple Pay, Google Pay, Venmo |
| Braintree Local | `/App_Plugins/Merchello/js/checkout/adapters/braintree-local-payment-adapter.js` | iDEAL, Bancontact, SEPA, EPS, P24 |
| PayPal | `/App_Plugins/Merchello/js/checkout/adapters/paypal-unified-adapter.js` | PayPal, Pay Later (standard + express) |

## API Endpoints

### Checkout (Public)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/merchello/checkout/payment-methods` | Get standard payment methods |
| GET | `/api/merchello/checkout/express-methods` | Get express checkout methods |
| GET | `/api/merchello/checkout/express-config` | Get express checkout SDK config |
| POST | `/api/merchello/checkout/pay` | Create invoice from basket and start payment |
| POST | `/api/merchello/checkout/{invoiceId}/pay` | Create payment session for existing invoice |
| POST | `/api/merchello/checkout/process-payment` | Process HostedFields payment (nonce/token) |
| POST | `/api/merchello/checkout/process-direct-payment` | Process DirectForm payment (form data) |
| POST | `/api/merchello/checkout/express` | Complete express checkout |
| POST | `/api/merchello/checkout/express-payment-intent` | Create express payment intent (Stripe) |
| POST | `/api/merchello/checkout/{providerAlias}/create-order` | Create widget order (PayPal-style flow) |
| POST | `/api/merchello/checkout/{providerAlias}/capture-order` | Capture widget order after approval |
| GET | `/api/merchello/checkout/return` | Handle return from payment gateway |
| GET | `/api/merchello/checkout/cancel` | Handle cancel from payment gateway |
| GET | `/api/merchello/checkout/payment-options` | Get providers + saved methods |
| POST | `/api/merchello/checkout/process-saved-payment` | Pay with saved method |

### Backoffice (Admin)

Controller: `src/Merchello/Controllers/PaymentProvidersApiController.cs`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/payment-providers/available` | All discovered providers |
| GET | `/api/v1/payment-providers` | All configured settings |
| POST | `/api/v1/payment-providers` | Create provider config |
| PUT | `/api/v1/payment-providers/{id}/toggle` | Toggle provider enabled/disabled |
| GET | `/api/v1/payment-providers/{id}/methods` | Methods for a provider |
| PUT | `/api/v1/payment-providers/{id}/methods/{alias}` | Enable/disable method |
| PUT | `/api/v1/payment-providers/{id}/methods/reorder` | Reorder methods |
| GET | `/api/v1/payment-providers/checkout-preview` | Preview checkout method list |

### Backoffice Testing

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/payment-providers/{id}/test` | Create test payment session |
| POST | `/api/v1/payment-providers/{id}/test/process-payment` | Process test payment |
| GET | `/api/v1/payment-providers/{id}/test/express-config` | Get express checkout config |
| GET | `/api/v1/payment-providers/{id}/test/webhook-events` | Get available webhook templates |
| POST | `/api/v1/payment-providers/{id}/test/simulate-webhook` | Simulate webhook event |

Vault test endpoints also exist for testing saved payment method flows.

## Braintree Reference Implementation

Braintree is currently the broadest built-in provider reference:

- multiple method types
- HostedFields + Widget + Express
- refunds, capture, webhook validation/processing
- vaulting support
- webhook simulation support

Implemented methods:

- cards (`HostedFields`)
- paypal (`Widget`, express)
- applepay (`Widget`, express)
- googlepay (`Widget`, express)
- venmo (`Widget`, express)
- ideal (`Widget`)
- bancontact (`Widget`)
- sepa (`Widget`)
- eps (`Widget`)
- p24 (`Widget`)

Webhook events currently handled in processing:

- `transaction_settled`
- `transaction_settlement_declined`
- `dispute_opened`
- `dispute_lost`
- `dispute_won`
- `local_payment_completed`
- `local_payment_reversed`
- `local_payment_expired`
- `local_payment_funded`

### Version Status (Verified February 20, 2026)

From current project file (`src/Merchello.Core/Merchello.Core.csproj`):

- `Braintree` NuGet: `5.39.0`
- `Stripe.net`: `50.3.0`
- `PayPalServerSDK`: `2.2.0`
- `Amazon.Pay.API.SDK`: `2.7.4`

Registry checks on February 20, 2026:

- Braintree NuGet latest stable: `5.39.0` (project is current)
- Braintree Web SDK latest on npm: `3.136.0`
- Braintree CDN component URLs for `3.136.0` resolve successfully
- `3.137.0` client SDK URL returns 404

### Braintree Reference Notes

- `SEPA` now follows the same Braintree local-payment nonce flow as other local methods in `braintree-local-payment-adapter.js` (it posts `paymentMethodToken` to `/api/merchello/checkout/process-payment`).
- Webhook simulation templates and test-payload generation include all handled local-payment events: `local_payment_funded`, `local_payment_completed`, `local_payment_reversed`, `local_payment_expired`.
- Braintree can be used as the canonical in-repo reference for cards, express, local methods, webhooks, and vault behavior.

## Vaulted Payments (Saved Payment Methods)

Vaulted payments allow customers to save their payment methods for faster future checkouts and support off-session payments (subscriptions, upsells, repeat purchases).

### Overview

Key features:
- Customers can save cards, PayPal accounts, and bank accounts
- Off-session payments without requiring CVV at charge time
- Provider-level customer management (Stripe Customer, Braintree Customer, PayPal Vault)
- Consent tracking for PCI/GDPR compliance
- Admin management through backoffice

How it works:
1. Customer opts to save payment method during checkout
2. Provider creates a vaulted payment method token
3. Token stored in Merchello (never raw card data)
4. Customer can pay with saved method in future checkouts
5. Admin can charge saved methods for repeat orders, upsells, etc.

### Provider Metadata Extensions

```csharp
public class PaymentProviderMetadata
{
    // ... existing properties ...

    /// <summary>
    /// Whether this provider supports saving payment methods for future use.
    /// </summary>
    public bool SupportsVaultedPayments { get; init; }

    /// <summary>
    /// Whether the provider requires creating a provider-level customer first.
    /// e.g., Stripe requires a Stripe Customer, PayPal requires a vault setup.
    /// </summary>
    public bool RequiresProviderCustomerId { get; init; }
}
```

### Provider Interface Extensions

Vault methods in `IPaymentProvider`:

```csharp
Task<VaultSetupResult> CreateVaultSetupSessionAsync(
    VaultSetupRequest request,
    CancellationToken cancellationToken = default);

Task<VaultConfirmResult> ConfirmVaultSetupAsync(
    VaultConfirmRequest request,
    CancellationToken cancellationToken = default);

Task<PaymentResult> ChargeVaultedMethodAsync(
    ChargeVaultedMethodRequest request,
    CancellationToken cancellationToken = default);

Task<bool> DeleteVaultedMethodAsync(
    string providerMethodId,
    string? providerCustomerId,
    CancellationToken cancellationToken = default);
```

### Vault Service Layer

`ISavedPaymentMethodService`:
- `GetCustomerPaymentMethodsAsync(customerId)` — get all for customer
- `GetPaymentMethodAsync(id)` — get by ID
- `CreateSetupSessionAsync(params)` — start vault setup flow
- `ConfirmSetupAsync(params)` — complete vault setup
- `SaveFromCheckoutAsync(params)` — save during regular checkout
- `SetDefaultAsync(id)` — set as default
- `DeleteAsync(id)` — delete (also deletes from provider)
- `ChargeAsync(params)` — charge saved method off-session

### Vault API Endpoints

**Checkout (Public)**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/merchello/checkout/payment-options` | Get providers + saved methods |
| POST | `/api/merchello/checkout/process-saved-payment` | Pay with saved method |

**Storefront (Customer Account)**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/merchello/storefront/payment-methods` | List saved methods |
| POST | `/api/merchello/storefront/payment-methods/setup` | Create vault setup session |
| POST | `/api/merchello/storefront/payment-methods/confirm` | Confirm vault setup |
| POST | `/api/merchello/storefront/payment-methods/{id}/set-default` | Set default |
| DELETE | `/api/merchello/storefront/payment-methods/{id}` | Delete saved method |
| GET | `/api/merchello/storefront/payment-methods/providers` | Get vault-enabled providers |

**Backoffice (Admin)**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/customers/{customerId}/saved-payment-methods` | List customer methods |
| GET | `/api/v1/saved-payment-methods/{id}` | Get method details |
| POST | `/api/v1/saved-payment-methods/{id}/set-default` | Set as default |
| DELETE | `/api/v1/saved-payment-methods/{id}` | Delete method |

### Vault Provider Implementations

- **Stripe:** Uses SetupIntents API for vaulting. Creates/reuses Stripe Customer by email. Supports cards (all brands), Link.
- **Braintree:** Uses client tokens + PaymentMethod.Create. Creates/reuses Braintree Customer by email. Supports cards, PayPal.
- **PayPal:** Uses Vault API v3 (setup-tokens, payment-tokens). Creates vault customer per merchant reference. Supports PayPal accounts.

### Checkout Flow with Saved Methods

```
1. GET /checkout/payment-options
   → Returns providers[] and savedPaymentMethods[]

2a. New Payment Method:
    → Standard payment flow + optional "Save for future"
    → ProcessPaymentRequest.SavePaymentMethod = true

2b. Saved Payment Method:
    → Customer selects saved method
    → POST /checkout/process-saved-payment
    → { invoiceId, savedPaymentMethodId, idempotencyKey? }
    → Off-session charge via provider
    → Record payment via RecordPaymentAsync (deterministic fallback transaction ID when provider omits one)
```

### Vault Security

- Never store raw card data — only provider tokens
- Tokens are provider-specific and expire/rotate automatically
- Consent tracking required for compliance
- Customer ownership verified on all operations
- Provider-side deletion when removing from Merchello
- Saved-payment requests are idempotent-capable (`IdempotencyKey`) and must be persisted to the payments ledger before success is returned
- Post-purchase upsell API endpoints require confirmation-token cookie authorization scoped to invoice ID

## Database Schema

**merchelloProviderConfigurations** (payment rows only)
- Base provider columns: `Id`, `ProviderKey`, `DisplayName`, `IsEnabled`, `SortOrder`, `SettingsJson`, `CreateDate`, `UpdateDate`
- Payment-specific columns: `IsTestMode`, `IsVaultingEnabled`, `MethodSettingsJson`
- Discriminator: `ProviderType = "payment"`
- Code aliases: `PaymentProviderSetting.ProviderAlias` maps to `ProviderKey`; `PaymentProviderSetting.Configuration` maps to `SettingsJson`

**merchelloSavedPaymentMethods**
- `Id` (Guid PK), `CustomerId` (FK), `ProviderAlias`, `ProviderMethodId` (token), `ProviderCustomerId`
- `MethodType` (Card, PayPal, BankAccount, Other), `CardBrand`, `Last4`, `ExpiryMonth`, `ExpiryYear`
- `BillingName`, `BillingEmail`, `DisplayLabel`, `IsDefault`, `IsVerified`
- `ConsentDateUtc`, `ConsentIpAddress` — compliance tracking
- Unique constraint: `(CustomerId, ProviderAlias, ProviderMethodId)`

**merchelloPayments**
- Transaction records and refund lineage: `PaymentProviderAlias`, `PaymentType`, `RefundReason`, `ParentPaymentId`
- Idempotency/deduplication columns: `IdempotencyKey`, `WebhookEventId`, unique `TransactionId`

## File Structure

```
src/Merchello.Core/Payments/
├── Providers/
│   ├── BuiltIn/
│   │   └── ManualPaymentProvider.cs      # Built-in, auto-enabled on startup
│   ├── Stripe/
│   │   └── StripePaymentProvider.cs
│   ├── PayPal/
│   │   └── PayPalPaymentProvider.cs
│   ├── Braintree/
│   │   └── BraintreePaymentProvider.cs
│   ├── IPaymentProvider.cs
│   ├── PaymentProviderBase.cs
│   ├── PaymentProviderMetadata.cs
│   ├── PaymentProviderConfigurationField.cs
│   ├── PaymentProviderConfiguration.cs
│   ├── IPaymentProviderManager.cs
│   ├── PaymentProviderManager.cs
│   └── RegisteredPaymentProvider.cs
├── Models/
│   ├── PaymentMethodDefinition.cs
│   ├── PaymentMethodTypes.cs
│   ├── PaymentMethodSetting.cs
│   ├── PaymentMethodRegion.cs
│   ├── PaymentMethodCheckoutStyle.cs
│   ├── ExpressCheckoutRequest.cs
│   ├── ExpressCheckoutResult.cs
│   ├── ExpressCheckoutCustomerData.cs
│   ├── ExpressCheckoutAddress.cs
│   ├── ExpressCheckoutClientConfig.cs
│   ├── PaymentType.cs
│   ├── PaymentIntegrationType.cs
│   ├── InvoicePaymentStatus.cs
│   ├── PaymentProviderSetting.cs
│   ├── PaymentRequest.cs
│   ├── PaymentSessionResult.cs
│   ├── ProcessPaymentRequest.cs
│   ├── PaymentResult.cs
│   ├── PaymentCaptureResult.cs
│   ├── PaymentLinkRequest.cs
│   ├── PaymentLinkResult.cs
│   ├── CheckoutFormField.cs
│   ├── RefundRequest.cs
│   ├── RefundResult.cs
│   ├── WebhookProcessingResult.cs
│   ├── WebhookEventTemplate.cs
│   └── TestWebhookParameters.cs
├── Services/
│   ├── Interfaces/IPaymentService.cs
│   └── PaymentService.cs
├── Handlers/
│   └── EnsureBuiltInPaymentProvidersHandler.cs
├── Dtos/
│   └── PaymentMethodDto.cs
└── ../Shared/Providers/
    └── ProviderConfigurationDbMapping.cs

src/Merchello/Controllers/
├── PaymentProvidersApiController.cs
├── PaymentsApiController.cs
├── PaymentWebhookController.cs
└── CheckoutPaymentsApiController.cs
```

## LLM Prompt Checklist For New Provider Generation

When asking an LLM to generate a new provider, include these must-follow rules:

1. Extend `PaymentProviderBase` and implement the 4 required members.
2. Use `PaymentMethodDefinition` per checkout option, not one provider-level method.
3. Set `MethodType` for shared methods to enable dedupe.
4. Return `PaymentSessionResult` via factory methods (`Redirect`, `HostedFields`, `Widget`, `DirectForm`).
5. Do not put payment status math in controllers; rely on `PaymentService`.
6. Preserve idempotency and webhook dedupe behavior.
7. If supporting webhooks, implement both signature validation and payload processing.
8. If supporting vault, set metadata flags and implement all vault methods.
9. For adapters, use stable built-in paths or RCL `_content` paths.
10. Include unit tests for method definitions, session creation, webhook mapping, and failure modes.

## Quick Validation Checklist Before Shipping A New Provider

- [ ] Provider discovered by `ExtensionManager`
- [ ] Settings can be created/updated via `PaymentProvidersApiController`
- [ ] Checkout methods appear correctly with dedupe behavior
- [ ] Standard payment flow works end-to-end
- [ ] Express flow works if advertised
- [ ] Webhook validation rejects invalid signatures
- [ ] Webhook processing is idempotent
- [ ] Refund/capture behavior aligns with metadata capabilities
- [ ] Vault flows work when enabled
- [ ] Backoffice provider test endpoints work

## Testing Checklist

- [ ] Provider discovery finds all `IPaymentProvider` implementations
- [ ] Provider configuration saves/loads correctly
- [ ] Payment session creation returns correct data per integration type
- [ ] Redirect flow works end-to-end
- [ ] Express checkout flow works
- [ ] Webhook signature validation
- [ ] Webhook processing updates status
- [ ] Refunds create negative payment records
- [ ] Partial refunds calculate correctly
- [ ] Invoice payment status calculates correctly
- [ ] Manual payment recording works
- [ ] Provider enable/disable/ordering works
- [ ] Method enable/disable/ordering works
- [ ] Backoffice test modal with 4 tabs (Session, Payment Form, Express, Webhooks)
- [ ] Webhook simulation generates provider-specific payloads
- [ ] Payment adapters support tokenize() for backoffice testing
- [ ] Widget flow endpoints work with any provider
- [ ] Express checkout fallback transaction IDs are deterministic when providers omit a transaction ID
- [ ] Saved payment flow records payment and returns the recorded transaction ID
- [ ] Post-purchase add-to-order fails closed when charge succeeds but payment recording fails

## External References

- Braintree webhook parsing and form payload (`bt_signature`, `bt_payload`):
  - https://developer.paypal.com/braintree/docs/guides/webhooks/parse/dotnet/
- Braintree webhook kinds (including local payment kinds):
  - https://developer.paypal.com/braintree/docs/reference/general/webhooks/notification-kinds/net/
- Braintree local payment methods server-side behavior:
  - https://developer.paypal.com/braintree/docs/guides/local-payment-methods/server-side/dotnet/
- Braintree NuGet package:
  - https://www.nuget.org/packages/Braintree
- npm package for Braintree Web SDK:
  - https://www.npmjs.com/package/braintree-web
