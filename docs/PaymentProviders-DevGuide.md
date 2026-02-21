# Payment Provider Development Guide (Code-Verified)

Last verified: February 20, 2026.

This guide is based on traced runtime code paths, not just architecture notes. It is intended to be handed to an LLM or engineer as the implementation source of truth for new Merchello payment providers.

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

## Checkout Flows In Real Code

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

### Express Checkout

- Endpoints:
  - `GET /api/merchello/checkout/express-methods`
  - `GET /api/merchello/checkout/express-config`
  - `POST /api/merchello/checkout/express`
- Provider method called: `ProcessExpressCheckoutAsync`.
- Orchestration records payment via `RecordPaymentAsync`.
- If provider omits transaction ID, deterministic fallback ID is generated for idempotent retries.

### Widget Create/Capture Pattern

- Endpoints:
  - `POST /api/merchello/checkout/{providerAlias}/create-order`
  - `POST /api/merchello/checkout/{providerAlias}/capture-order`
- Useful for button-driven providers.

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

## Adapter Contract And Static Asset Rules

For HostedFields/Widget methods, return adapter info in `PaymentSessionResult`:

- `AdapterUrl`
- `ProviderAlias`
- `MethodAlias`
- `JavaScriptSdkUrl`
- `SdkConfiguration`

Built-in checkout runtime paths must stay stable:

- `/App_Plugins/Merchello/js/checkout/*`

Third-party provider adapters should be served from a Razor Class Library:

- `/_content/{AssemblyName}/adapters/{file}.js`

Unified adapter registry API:

- `window.MerchelloPaymentAdapters`
- `window.MerchelloExpressAdapters`
- helper: `src/Merchello/Client/public/js/checkout/adapters/adapter-interface.js`

## Backoffice Provider APIs You Should Use

Controller: `src/Merchello/Controllers/PaymentProvidersApiController.cs`

Key routes (relative to backoffice API base route):

- `GET payment-providers/available`
- `GET payment-providers`
- `POST payment-providers`
- `PUT payment-providers/{id}/toggle`
- `GET payment-providers/{id}/methods`
- `PUT payment-providers/{id}/methods/{alias}`
- `PUT payment-providers/{id}/methods/reorder`
- `GET payment-providers/checkout-preview`

Testing routes:

- `POST payment-providers/{id}/test`
- `POST payment-providers/{id}/test/process-payment`
- `GET payment-providers/{id}/test/express-config`
- `GET payment-providers/{id}/test/webhook-events`
- `POST payment-providers/{id}/test/simulate-webhook`
- vault test endpoints also exist

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

- provider discovered by `ExtensionManager`
- settings can be created/updated via `PaymentProvidersApiController`
- checkout methods appear correctly with dedupe behavior
- standard payment flow works end-to-end
- express flow works if advertised
- webhook validation rejects invalid signatures
- webhook processing is idempotent
- refund/capture behavior aligns with metadata capabilities
- vault flows work when enabled
- backoffice provider test endpoints work

## External References Used In This Audit

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
