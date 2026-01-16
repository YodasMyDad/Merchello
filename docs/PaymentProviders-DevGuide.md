# Payment Provider Development Guide

Guide for third-party developers creating custom payment providers.

> **Note:** Merchello includes built-in providers for Purchase Order, Stripe, PayPal, and Braintree. The examples in this guide demonstrate how to build similar integrations for other gateways (Square, Adyen, etc.).

## Quick Start

1. Create .NET Class Library project
2. Reference `Merchello.Core` NuGet package
3. Implement `IPaymentProvider` or extend `PaymentProviderBase`
4. Define payment methods via `GetAvailablePaymentMethods()`
5. Package as NuGet
6. Install - Merchello auto-discovers via assembly scanning

## Key Concepts

### Provider vs Method

- **Provider** = Payment gateway (Stripe, Braintree) - holds API credentials
- **Method** = Checkout option (Cards, Apple Pay, PayPal) - customer-facing

Each provider declares available methods. Each method has its own integration type.

### Integration Types

| Type | Value | Use When |
|------|-------|----------|
| `Redirect` | 0 | Customer sent to external payment page |
| `HostedFields` | 10 | PCI-compliant iframes on your checkout |
| `Widget` | 20 | Provider's embedded UI component (Apple Pay, PayPal) |
| `DirectForm` | 30 | Custom form fields (PO, manual) |

### Express Checkout

Methods with `IsExpressCheckout = true`:
- Appear at start of checkout (before address entry)
- Collect customer data from provider (email, shipping address)
- Skip checkout form, go straight to confirmation
- Examples: Apple Pay, Google Pay, PayPal Express

### Method Types & Deduplication

When multiple providers offer the same payment method (e.g., Stripe and Braintree both offer Apple Pay), Merchello automatically deduplicates at checkout - only one button appears.

**Set `MethodType` on each method:**
```csharp
new PaymentMethodDefinition
{
    Alias = "applepay",
    DisplayName = "Apple Pay",
    MethodType = PaymentMethodTypes.ApplePay,  // Required for deduplication
    IntegrationType = PaymentIntegrationType.Widget,
    IsExpressCheckout = true,
    DefaultSortOrder = 0
}
```

**Well-Known Method Types** (from `PaymentMethodTypes` class):
| Constant | Value | Use For |
|----------|-------|---------|
| `Cards` | `"cards"` | Credit/Debit card entry |
| `ApplePay` | `"apple-pay"` | Apple Pay |
| `GooglePay` | `"google-pay"` | Google Pay |
| `AmazonPay` | `"amazon-pay"` | Amazon Pay |
| `PayPal` | `"paypal"` | PayPal |
| `Link` | `"link"` | Stripe Link |
| `BuyNowPayLater` | `"bnpl"` | Klarna, Afterpay, etc. |
| `BankTransfer` | `"bank-transfer"` | Direct bank transfer |
| `Venmo` | `"venmo"` | Venmo (US only) |
| `Manual` | `"manual"` | Offline/manual payment |
| `null` | - | Not deduplicated (use for custom/regional methods) |

**Custom Method Types:**
Third-party providers can use any string value. Methods with matching `MethodType` values are deduplicated; unique or null values are never deduplicated:
```csharp
MethodType = "my-custom-wallet"  // Won't be deduplicated
MethodType = null                 // Won't be deduplicated
```

**Deduplication Rules:**
- Methods grouped by `MethodType`
- Only method with **lowest SortOrder** shown per type
- Methods with `null` or `Custom` type are NOT deduplicated
- Admin controls priority via sort order in backoffice

---

## Example 1: Stripe (Multiple Methods)

```csharp
public class StripePaymentProvider(ICurrencyService currencyService) : PaymentProviderBase
{
    private StripeClient? _client;
    private string? _webhookSecret;

    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "stripe",
        DisplayName = "Stripe",
        Icon = "icon-credit-card",
        Description = "Accept payments via Stripe",
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        SupportsAuthAndCapture = true,
        RequiresWebhook = true
    };

    // Define payment methods this provider supports
    public override IReadOnlyList<PaymentMethodDefinition> GetAvailablePaymentMethods() =>
    [
        new PaymentMethodDefinition
        {
            Alias = "cards",
            DisplayName = "Credit/Debit Card",
            Icon = "icon-credit-card",
            Description = "Pay with Visa, Mastercard, American Express",
            MethodType = PaymentMethodTypes.Cards,
            IntegrationType = PaymentIntegrationType.Redirect,
            IsExpressCheckout = false,
            DefaultSortOrder = 10
        },
        new PaymentMethodDefinition
        {
            Alias = "applepay",
            DisplayName = "Apple Pay",
            Icon = "icon-apple",
            Description = "Fast, secure checkout with Apple Pay",
            MethodType = PaymentMethodTypes.ApplePay,
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 0
        },
        new PaymentMethodDefinition
        {
            Alias = "googlepay",
            DisplayName = "Google Pay",
            Icon = "icon-google",
            Description = "Fast, secure checkout with Google Pay",
            MethodType = PaymentMethodTypes.GooglePay,
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 1
        }
    ];

    public override ValueTask<IEnumerable<PaymentProviderConfigurationField>>
        GetConfigurationFieldsAsync(CancellationToken ct = default)
    {
        return ValueTask.FromResult<IEnumerable<PaymentProviderConfigurationField>>(
        [
            new() { Key = "secretKey", Label = "Secret Key", FieldType = ConfigurationFieldType.Password, IsSensitive = true, IsRequired = true },
            new() { Key = "publishableKey", Label = "Publishable Key", FieldType = ConfigurationFieldType.Text, IsRequired = true },
            new() { Key = "webhookSecret", Label = "Webhook Signing Secret", FieldType = ConfigurationFieldType.Password, IsSensitive = true, IsRequired = true }
        ]);
    }

    public override async Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request, CancellationToken ct = default)
    {
        // Session creation based on method alias
        var session = await _client!.Checkout.Sessions.CreateAsync(new SessionCreateOptions
        {
            PaymentMethodTypes = ["card"],
            LineItems = [/* ... */],
            Mode = "payment",
            SuccessUrl = request.ReturnUrl,
            CancelUrl = request.CancelUrl,
            Metadata = new Dictionary<string, string> { ["invoiceId"] = request.InvoiceId.ToString() }
        }, cancellationToken: ct);

        return PaymentSessionResult.Redirect(session.Url, session.Id);
    }

    public override Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request, CancellationToken ct = default)
    {
        // Redirect providers confirm via webhook - return pending
        return Task.FromResult(PaymentResult.Pending(request.SessionId ?? "", request.Amount ?? 0));
    }

    // Express checkout processing for Apple Pay / Google Pay
    public override async Task<ExpressCheckoutResult> ProcessExpressCheckoutAsync(
        ExpressCheckoutRequest request, CancellationToken ct = default)
    {
        var paymentIntent = await _client!.PaymentIntents.CreateAsync(new PaymentIntentCreateOptions
        {
            Amount = currencyService.ToMinorUnits(request.Amount, request.Currency),
            Currency = request.Currency.ToLower(),
            PaymentMethod = request.PaymentToken,
            Confirm = true
        }, cancellationToken: ct);

        return paymentIntent.Status == "succeeded"
            ? ExpressCheckoutResult.Completed(paymentIntent.Id, request.Amount)
            : ExpressCheckoutResult.Failed($"Payment failed: {paymentIntent.Status}");
    }

    public override Task<bool> ValidateWebhookAsync(
        string payload, IDictionary<string, string> headers, CancellationToken ct = default)
    {
        try
        {
            EventUtility.ConstructEvent(payload, headers.GetValueOrDefault("Stripe-Signature"), _webhookSecret);
            return Task.FromResult(true);
        }
        catch { return Task.FromResult(false); }
    }

    public override Task<WebhookProcessingResult> ProcessWebhookAsync(
        string payload, IDictionary<string, string> headers, CancellationToken ct = default)
    {
        var stripeEvent = EventUtility.ConstructEvent(payload, headers.GetValueOrDefault("Stripe-Signature"), _webhookSecret);

        if (stripeEvent.Type == "checkout.session.completed")
        {
            var session = stripeEvent.Data.Object as Session;
            return Task.FromResult(WebhookProcessingResult.Successful(
                WebhookEventType.PaymentCompleted,
                session.PaymentIntentId,
                Guid.Parse(session.Metadata["invoiceId"]),
                session.AmountTotal / 100m));
        }

        return Task.FromResult(WebhookProcessingResult.Successful(WebhookEventType.Unknown, "unhandled"));
    }
}
```

---

## Example 2: Braintree (Multiple Integration Types)

This example shows a provider with multiple integration types: Hosted Fields for cards, Widget for express checkout (PayPal, Venmo), and Widget for local payment methods (iDEAL, SEPA).

```csharp
public class BraintreePaymentProvider : PaymentProviderBase
{
    private BraintreeGateway? _gateway;

    // Local payment methods that use the local payment SDK
    private static readonly HashSet<string> LocalPaymentAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        "ideal", "bancontact", "sepa", "eps", "p24"
    };

    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "braintree",
        DisplayName = "Braintree",
        Icon = "icon-credit-card",
        Description = "Accept payments via Braintree",
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        SupportsAuthAndCapture = true,
        RequiresWebhook = true  // Required for local payment webhooks
    };

    public override IReadOnlyList<PaymentMethodDefinition> GetAvailablePaymentMethods() =>
    [
        // Cards - Hosted Fields integration
        new PaymentMethodDefinition
        {
            Alias = "cards",
            DisplayName = "Credit/Debit Card",
            MethodType = PaymentMethodTypes.Cards,
            IntegrationType = PaymentIntegrationType.HostedFields,
            IsExpressCheckout = false,
            DefaultSortOrder = 10
        },
        // Express checkout methods - Widget integration
        new PaymentMethodDefinition
        {
            Alias = "paypal",
            DisplayName = "PayPal",
            MethodType = PaymentMethodTypes.PayPal,
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 0
        },
        new PaymentMethodDefinition
        {
            Alias = "venmo",
            DisplayName = "Venmo",
            MethodType = null,  // Braintree-exclusive, no deduplication
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 3
        },
        // Local payment methods (EU) - Widget integration with redirect flow
        // Use MethodType.Custom because they are region-specific and should NOT deduplicate
        new PaymentMethodDefinition
        {
            Alias = "ideal",
            DisplayName = "iDEAL",
            Description = "Pay with iDEAL (Netherlands)",
            MethodType = null,  // Region-specific, no deduplication
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = false,
            DefaultSortOrder = 20
        },
        new PaymentMethodDefinition
        {
            Alias = "sepa",
            DisplayName = "SEPA Direct Debit",
            Description = "Pay with SEPA Direct Debit (EU)",
            MethodType = null,  // Region-specific, no deduplication
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = false,
            DefaultSortOrder = 22
        }
        // ... other methods (bancontact, eps, p24)
    ];

    public override async Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request, CancellationToken ct = default)
    {
        var clientToken = await _gateway!.ClientToken.GenerateAsync();
        var methodAlias = request.MethodAlias ?? "cards";

        // Route to appropriate session type based on method
        if (LocalPaymentAliases.Contains(methodAlias))
        {
            return CreateLocalPaymentSession(clientToken, request, methodAlias);
        }

        // Default: Cards with Hosted Fields
        return PaymentSessionResult.HostedFields(
            providerAlias: "braintree",
            methodAlias: methodAlias,
            adapterUrl: "/js/checkout/adapters/braintree-payment-adapter.js",
            jsSdkUrl: "https://js.braintreegateway.com/web/3.134.0/js/client.min.js",
            sdkConfig: new Dictionary<string, object>
            {
                ["hostedFieldsSdkUrl"] = "https://js.braintreegateway.com/web/3.134.0/js/hosted-fields.min.js",
                ["threeDSecureEnabled"] = true,
                ["amount"] = request.Amount,
                ["currency"] = request.Currency
            },
            clientToken: clientToken,
            sessionId: request.InvoiceId.ToString());
    }

    // Separate session for local payment methods
    private PaymentSessionResult CreateLocalPaymentSession(
        string clientToken, PaymentRequest request, string methodAlias)
    {
        return PaymentSessionResult.Widget(
            providerAlias: "braintree",
            methodAlias: methodAlias,
            adapterUrl: "/js/checkout/adapters/braintree-local-payment-adapter.js",
            jsSdkUrl: "https://js.braintreegateway.com/web/3.134.0/js/client.min.js",
            sdkConfig: new Dictionary<string, object>
            {
                ["localPaymentSdkUrl"] = "https://js.braintreegateway.com/web/3.134.0/js/local-payment.min.js",
                ["amount"] = request.Amount,
                ["currency"] = request.Currency,
                ["returnUrl"] = request.ReturnUrl,
                ["cancelUrl"] = request.CancelUrl
            },
            clientToken: clientToken,
            sessionId: request.InvoiceId.ToString());
    }

    public override async Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request, CancellationToken ct = default)
    {
        var result = await _gateway!.Transaction.SaleAsync(new TransactionRequest
        {
            Amount = request.Amount,
            PaymentMethodNonce = request.PaymentMethodToken,
            Options = new TransactionOptionsRequest { SubmitForSettlement = true }
        });

        return result.IsSuccess()
            ? PaymentResult.Completed(result.Target.Id, result.Target.Amount)
            : PaymentResult.Failed(result.Message);
    }
}
```

**Key Points:**
- Use `MethodType.Custom` for provider-exclusive methods (Venmo is Braintree-only)
- Use `MethodType.Custom` for region-specific methods (iDEAL, Bancontact, etc.) - they should NOT deduplicate because each serves different countries
- Use `MethodType.BankTransfer` only if you want ONE bank transfer option to show (e.g., if you have multiple providers offering generic "bank transfer")
- Route to different adapters based on method alias in `CreatePaymentSessionAsync`
- Local payments require `returnUrl` and `cancelUrl` for redirect flows
- Local payments require webhooks for payment confirmation

---

## Example 3: Purchase Order (DirectForm)

```csharp
public class ManualPaymentProvider(IInvoiceService invoiceService) : PaymentProviderBase
{
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "manual",
        DisplayName = "Purchase Order",
        Icon = "icon-document",
        Description = "Pay using a purchase order number",
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        RequiresWebhook = false
    };

    public override IReadOnlyList<PaymentMethodDefinition> GetAvailablePaymentMethods() =>
    [
        new PaymentMethodDefinition
        {
            Alias = "purchaseorder",
            DisplayName = "Purchase Order",
            Icon = "icon-document",
            Description = "Enter your purchase order number to complete the order",
            MethodType = PaymentMethodTypes.Manual,
            IntegrationType = PaymentIntegrationType.DirectForm,
            IsExpressCheckout = false,
            DefaultSortOrder = 50,
            ShowInCheckoutByDefault = true
        }
    ];

    public override Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request, CancellationToken ct = default)
    {
        return Task.FromResult(PaymentSessionResult.DirectForm(
            formFields:
            [
                new()
                {
                    Key = "purchaseOrderNumber",
                    Label = "Purchase Order Number",
                    Description = "Enter your company's purchase order number",
                    FieldType = CheckoutFieldType.Text,
                    IsRequired = true,
                    Placeholder = "e.g., PO-12345",
                    ValidationMessage = "Purchase order number is required"
                }
            ],
            sessionId: Guid.NewGuid().ToString()));
    }

    public override async Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request, CancellationToken ct = default)
    {
        var formData = request.FormData ?? [];
        var poNumber = formData.GetValueOrDefault("purchaseOrderNumber", "").Trim();

        // Validate PO number
        if (string.IsNullOrWhiteSpace(poNumber))
            return PaymentResult.Failed("Purchase order number is required.");

        // Save PO to invoice
        await invoiceService.UpdatePurchaseOrderAsync(request.InvoiceId, poNumber, ct);

        var transactionId = $"po_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}";
        return PaymentResult.Completed(transactionId, request.Amount ?? 0);
    }
}
```

---

## Frontend Integration

### Standard Payment Flow

```typescript
async function initiatePayment(invoiceId: string, providerAlias: string, methodAlias: string) {
  const response = await fetch(`/api/merchello/checkout/${invoiceId}/pay`, {
    method: 'POST',
    body: JSON.stringify({
      providerAlias,
      methodAlias,
      returnUrl: `${window.location.origin}/checkout/return`,
      cancelUrl: `${window.location.origin}/checkout/cancel`
    })
  });

  const session = await response.json();
  if (!session.success) { showError(session.errorMessage); return; }

  switch (session.integrationType) {
    case 0: // Redirect
      window.location.href = session.redirectUrl;
      break;
    case 10: // HostedFields
      await setupHostedFields(session);
      break;
    case 20: // Widget
      await setupWidget(session);
      break;
    case 30: // DirectForm
      renderForm(session.formFields);
      break;
  }
}
```

### Express Checkout Flow

```typescript
async function loadExpressCheckoutButtons(basketId: string) {
  const methods = await fetch('/api/merchello/checkout/express-methods').then(r => r.json());

  for (const method of methods) {
    if (method.methodAlias === 'applepay') {
      setupApplePayButton(method, basketId);
    } else if (method.methodAlias === 'googlepay') {
      setupGooglePayButton(method, basketId);
    }
  }
}

async function onApplePayAuthorized(payment: ApplePayPayment, basketId: string) {
  const response = await fetch('/api/merchello/checkout/express', {
    method: 'POST',
    body: JSON.stringify({
      basketId,
      providerAlias: 'stripe',
      methodAlias: 'applepay',
      paymentToken: payment.token.paymentData,
      customerData: {
        email: payment.shippingContact.emailAddress,
        fullName: `${payment.shippingContact.givenName} ${payment.shippingContact.familyName}`,
        shippingAddress: {
          line1: payment.shippingContact.addressLines[0],
          city: payment.shippingContact.locality,
          region: payment.shippingContact.administrativeArea,
          postalCode: payment.shippingContact.postalCode,
          countryCode: payment.shippingContact.countryCode
        }
      }
    })
  });

  const result = await response.json();
  if (result.success) {
    window.location.href = result.redirectUrl; // Confirmation page
  }
}
```

### Widget Payment Flow (Create-Order/Capture Pattern)

Some payment providers (PayPal, Klarna, Afterpay, etc.) use a widget-based flow where:
1. Customer clicks a button in the provider's widget
2. Provider shows its own UI (popup/modal)
3. Customer approves the payment
4. Widget calls back to capture the payment

Merchello provides generic endpoints for this pattern that any third-party provider can use:

```typescript
// In your payment adapter's createOrder callback
async function createOrder(session) {
  const response = await fetch(`/api/merchello/checkout/${session.providerAlias}/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: session.sessionId,
      methodAlias: session.methodAlias  // Optional: specific method within provider
    })
  });

  const result = await response.json();
  if (!result.success) throw new Error(result.errorMessage);
  return result.orderId;  // Return to provider SDK
}

// In your payment adapter's onApprove callback
async function captureOrder(session, orderId) {
  const response = await fetch(`/api/merchello/checkout/${session.providerAlias}/capture-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: orderId,
      sessionId: session.sessionId,
      invoiceId: session.invoiceId
    })
  });

  const result = await response.json();
  if (result.success && result.redirectUrl) {
    window.location.href = result.redirectUrl;
  }
  return result;
}
```

**Widget Flow Endpoints:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/merchello/checkout/{providerAlias}/create-order` | Create order when customer initiates payment |
| POST | `/api/merchello/checkout/{providerAlias}/capture-order` | Capture payment after customer approval |

These endpoints are provider-agnostic - any payment provider can implement the widget pattern by:
1. Setting `IntegrationType = PaymentIntegrationType.Widget` on the payment method
2. Creating a JavaScript adapter that registers with `window.MerchelloPaymentAdapters`
3. Using the generic create-order/capture-order endpoints in the adapter callbacks

---

## Fraud/Risk Score Support

Payment providers can return fraud/risk scores from their fraud detection systems (e.g., Stripe Radar, Signifyd).

### Returning Risk Scores from Webhooks

```csharp
return WebhookProcessingResult.Successful(
    eventType: WebhookEventType.PaymentCompleted,
    transactionId: paymentIntent.Id,
    invoiceId: invoiceId,
    amount: amount,
    riskScore: 65m,              // 0-100 scale, higher = higher risk
    riskScoreSource: "stripe-radar"
);
```

### Risk Score Scale

| Score Range | Risk Level | UI Display |
|-------------|------------|------------|
| 0-24 | Minimal | Green |
| 25-49 | Low | Yellow |
| 50-74 | Medium | Orange |
| 75-100 | High | Red |

---

## Webhook Testing Templates

Providers can implement webhook testing to allow admins to simulate webhook events from the backoffice without external tools like Stripe CLI or PayPal webhooks simulator.

### Interface Methods

Override these methods in your provider to enable webhook simulation:

```csharp
// Return available webhook events for this provider
public override ValueTask<IReadOnlyList<WebhookEventTemplate>> GetWebhookEventTemplatesAsync(
    CancellationToken cancellationToken = default)
{
    var templates = new List<WebhookEventTemplate>
    {
        new()
        {
            EventType = "payment.completed",           // Provider-specific event type
            DisplayName = "Payment Completed",          // Shown in UI dropdown
            Description = "Fired when payment succeeds", // Helpful description
            Category = WebhookEventCategory.Payment,    // For UI grouping
            MerchelloEventType = WebhookEventType.PaymentCompleted
        },
        new()
        {
            EventType = "payment.refunded",
            DisplayName = "Payment Refunded",
            Description = "Fired when a refund is processed",
            Category = WebhookEventCategory.Refund,
            MerchelloEventType = WebhookEventType.RefundCompleted
        }
        // Add more events...
    };

    return ValueTask.FromResult<IReadOnlyList<WebhookEventTemplate>>(templates);
}

// Generate realistic test payload for a given event
public override ValueTask<(string Payload, IDictionary<string, string> Headers)>
    GenerateTestWebhookPayloadAsync(
        TestWebhookParameters parameters,
        CancellationToken cancellationToken = default)
{
    // Support custom payload for advanced testing
    if (!string.IsNullOrWhiteSpace(parameters.CustomPayload))
    {
        return ValueTask.FromResult<(string, IDictionary<string, string>)>((
            parameters.CustomPayload,
            new Dictionary<string, string> { ["Content-Type"] = "application/json" }));
    }

    // Generate provider-specific payload based on event type
    var payload = parameters.EventType switch
    {
        "payment.completed" => GeneratePaymentCompletedPayload(parameters),
        "payment.refunded" => GenerateRefundPayload(parameters),
        _ => "{}"
    };

    var headers = new Dictionary<string, string>
    {
        ["Content-Type"] = "application/json",
        ["X-MyProvider-Signature"] = "test_signature"
    };

    return ValueTask.FromResult<(string, IDictionary<string, string>)>((payload, headers));
}
```

### WebhookEventCategory Enum

| Category | Use For |
|----------|---------|
| `Payment` | Payment success/failure events |
| `Refund` | Refund processed events |
| `Dispute` | Chargeback/dispute events |
| `Other` | Other event types |

### Best Practices

1. **Match real formats** - Generated payloads should match your provider's actual webhook format
2. **Include all fields** - Include fields your `ProcessWebhookAsync` method expects
3. **Use realistic IDs** - Generate realistic-looking transaction IDs
4. **Document events** - Provide clear descriptions to help admins understand each event

---

## Creating Payment Adapters

When your payment method uses `HostedFields` or `Widget` integration types, you must provide a JavaScript adapter that handles SDK initialization and payment flow.

### Project Type: Razor Class Library (RCL)

**Important:** Third-party payment providers that include JavaScript adapters **must be created as Razor Class Libraries (RCL)**, not plain class libraries. This is because:

1. Plain class libraries cannot serve static files
2. RCLs serve static files from `/_content/{AssemblyName}/` path
3. The adapter URL must point to a valid, servable JavaScript file

**Create an RCL project:**
```bash
dotnet new razorclasslib -n MyCompany.Merchello.MyProvider
```

### Adapter Location

Place adapters in your RCL's `wwwroot/` folder:

```
MyCompany.Merchello.MyProvider/
├── wwwroot/
│   └── adapters/
│       └── myprovider-payment-adapter.js
└── MyProviderPaymentProvider.cs
```

Reference using the `/_content/{AssemblyName}/` pattern:

```csharp
// The assembly name determines the URL path
private const string MyProviderAdapterUrl = "/_content/MyCompany.Merchello.MyProvider/adapters/myprovider-payment-adapter.js";
```

**Built-in providers** (Stripe, Braintree, PayPal) use relative paths (served from wwwroot):
```csharp
// Built-in adapter URLs (relative paths)
"/js/checkout/adapters/stripe-payment-adapter.js"
"/js/checkout/adapters/stripe-card-elements-adapter.js"  // Individual card fields
"/js/checkout/adapters/braintree-payment-adapter.js"
"/js/checkout/adapters/paypal-unified-adapter.js"  // Handles both standard and express
```

### Adapter Structure

Adapters use a unified interface that supports both standard and express checkout. Use `adapter-interface.js` helpers for registration.

```javascript
/**
 * MyProvider Payment Adapter
 */
import { registerAdapter, createAdapterConfig } from './adapter-interface.js';

let currentSession = null;

const myProviderAdapter = {
    // Adapter configuration - declares capabilities
    config: createAdapterConfig('MyProvider', {
        supportsStandard: true,   // Can handle standard checkout
        supportsExpress: false    // Set true if supporting express checkout
    }),

    /**
     * Render the payment UI
     * @param {HTMLElement} container - Container to render into
     * @param {Object} sessionOrConfig - PaymentSessionResult (standard) or ExpressConfig (express)
     * @param {Object} context - { isExpress, session?, checkout?, method? }
     */
    async render(container, sessionOrConfig, context) {
        currentSession = sessionOrConfig;
        const config = sessionOrConfig.sdkConfiguration || {};

        // Wait for SDK to be available (loaded via session.javaScriptSdkUrl)
        if (typeof MyProviderSDK === 'undefined') {
            throw new Error('MyProvider SDK not loaded');
        }

        // Create container structure
        container.innerHTML = `
            <div class="myprovider-wrapper">
                <div id="myprovider-element"></div>
                <div id="myprovider-errors" class="text-red-600 text-sm mt-2 hidden"></div>
            </div>
        `;

        // Initialize SDK and render payment element
        await MyProviderSDK.init(config.publicKey);
        await MyProviderSDK.mount('#myprovider-element');
    },

    /**
     * Submit the payment (for form-based flows)
     * @param {string} sessionId - Session ID
     * @param {Object} data - Additional data
     * @returns {Promise<Object>} Payment result
     */
    async submit(sessionId, data = {}) {
        try {
            // Get payment token from SDK
            const token = await MyProviderSDK.createToken();

            // Submit to server
            const response = await fetch('/api/merchello/checkout/process-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: data.invoiceId,
                    providerAlias: currentSession.providerAlias,
                    methodAlias: currentSession.methodAlias,
                    paymentMethodToken: token
                })
            });

            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Get payment token without submitting (for backoffice testing)
     * @returns {Promise<Object>} Token result
     */
    async tokenize() {
        try {
            const token = await MyProviderSDK.createToken();
            return { success: true, nonce: token };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Clean up when switching methods
     * @param {string} sessionId - Optional session ID
     */
    teardown(sessionId) {
        MyProviderSDK?.unmount();
        currentSession = null;
    },

    /**
     * Extract customer data from provider response (for express checkout)
     * Only needed if supportsExpress is true
     */
    extractCustomerData(data, context) {
        return {
            email: data.email,
            fullName: data.name,
            shippingAddress: data.shippingAddress
        };
    }
};

// Register the adapter (auto-registers for standard and express based on config)
registerAdapter('myprovider', myProviderAdapter);
```

### Provider Session Creation

Return adapter configuration from `CreatePaymentSessionAsync()`:

```csharp
public override async Task<PaymentSessionResult> CreatePaymentSessionAsync(
    PaymentRequest request, CancellationToken ct = default)
{
    // Create session with your payment gateway
    var gatewaySession = await _client.CreateSessionAsync(...);

    // Return session with adapter URL (using RCL path pattern)
    return PaymentSessionResult.HostedFields(
        providerAlias: Metadata.Alias,
        methodAlias: request.MethodAlias ?? "cards",
        adapterUrl: "/_content/MyCompany.Merchello.MyProvider/adapters/myprovider-payment-adapter.js",
        jsSdkUrl: "https://cdn.myprovider.com/sdk.js",
        sdkConfig: new Dictionary<string, object>
        {
            ["publicKey"] = _publicKey,
            ["sessionId"] = gatewaySession.Id
        },
        clientToken: gatewaySession.ClientToken,
        sessionId: gatewaySession.Id);
}
```

### Method Icons and Regional Availability

Provide SVG icons and optionally specify regional availability for your payment methods:

```csharp
private const string CardIconSvg = """<svg class="w-8 h-5" viewBox="0 0 32 20"...>...</svg>""";
private const string CheckoutCardIconSvg = """<svg class="w-6 h-6" viewBox="0 0 24 24"...>...</svg>""";

public override IReadOnlyList<PaymentMethodDefinition> GetAvailablePaymentMethods() =>
[
    new PaymentMethodDefinition
    {
        Alias = "cards",
        DisplayName = "Credit/Debit Card",
        IconHtml = CardIconSvg,              // Admin UI icon
        CheckoutIconHtml = CheckoutCardIconSvg, // Customer checkout icon (optional)
        MethodType = PaymentMethodTypes.Cards,
        IntegrationType = PaymentIntegrationType.HostedFields,
        // ...
    },
    new PaymentMethodDefinition
    {
        Alias = "ideal",
        DisplayName = "iDEAL",
        MethodType = null,  // Region-specific, no deduplication
        IntegrationType = PaymentIntegrationType.Widget,
        // Specify regional availability
        SupportedRegions =
        [
            new PaymentMethodRegion { Code = "NL", Name = "Netherlands" }
        ]
    }
];
```

**Icon Properties:**
- `IconHtml` - SVG markup for admin/backoffice UI
- `CheckoutIconHtml` - Separate SVG for customer checkout (optional, falls back to IconHtml)
- `CheckoutStyle` - Optional inline styles for checkout appearance

### Widget Adapters (PayPal-style)

For Widget integration types where the provider button handles the entire flow:

```javascript
const paypalAdapter = {
    async render(container, session, checkout) {
        // PayPal buttons handle their own submission
        await paypal.Buttons({
            createOrder: async () => { /* create order */ },
            onApprove: async (data) => {
                // Capture and redirect
                const result = await captureOrder(data.orderID);
                if (result.redirectUrl) {
                    window.location.href = result.redirectUrl;
                }
            }
        }).render(container);
    },

    async submit(invoiceId, options) {
        // Widget handles submission via button click
        return { success: false, error: 'Use PayPal button to complete payment' };
    },

    async tokenize() {
        // Widget/button flows don't support standalone tokenization
        return { success: false, error: 'Use the payment button', isButtonFlow: true };
    },

    teardown() { /* cleanup */ }
};
```

---

## Notes

### Security & Discovery
- Sensitive config values (API keys) should be encrypted at rest
- Webhook endpoints are public (no auth) - validate signatures
- Consider rate limiting webhooks
- Providers auto-discovered via assembly scanning - no DI registration needed

### Payment Processing
- Use `IdempotencyKey` in `ProcessPaymentRequest` to prevent duplicate payments (valid 24 hours)
- Express checkout methods collect customer data from the provider
- Risk scores are nullable - many payments won't have fraud data
- `PaymentResult` includes optional settlement data (`SettlementCurrency`, `SettlementAmount`, `SettlementExchangeRate`)
- Use `SkipPaymentRecording = true` in `PaymentResult` for methods like Purchase Order where payment is received later

### Adapters
- Adapters are loaded dynamically - no checkout code changes needed for new providers
- Implement `tokenize()` in adapters to enable Payment Form testing in backoffice
- Widget flow endpoints (`/{providerAlias}/create-order`, `/{providerAlias}/capture-order`) work with any provider
- Express checkout buttons use CSS classes based on method type (e.g., `express-button-applepay`)

### UI & Icons
- Set `IconHtml` for admin UI and `CheckoutIconHtml` for customer checkout
- Use `SupportedRegions` to indicate regional availability (shown in backoffice)
- Unknown method types fall back to `express-button-default` CSS class

### Testing
- Backoffice test modal has 4 tabs: Session, Payment Form, Express Checkout, Webhooks
- Implement `GetWebhookEventTemplatesAsync()` and `GenerateTestWebhookPayloadAsync()` for webhook simulation

### Payment Links
- Set `SupportsPaymentLinks = true` in `PaymentProviderMetadata` if your provider supports payment links
- Implement `CreatePaymentLinkAsync()` and `DeactivatePaymentLinkAsync()`
- Payment links allow admins to generate shareable URLs for invoice payment
