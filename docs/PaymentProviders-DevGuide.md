# Payment Provider Development Guide

Guide for third-party developers creating custom payment providers.

## Quick Start

1. Create .NET Class Library project
2. Reference `Merchello.Core`
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

## Example 2: Braintree (HostedFields + PayPal)

```csharp
public class BraintreePaymentProvider : PaymentProviderBase
{
    private BraintreeGateway? _gateway;

    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "braintree",
        DisplayName = "Braintree",
        Icon = "icon-credit-card",
        Description = "Accept payments via Braintree",
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        SupportsAuthAndCapture = true,
        RequiresWebhook = false
    };

    public override IReadOnlyList<PaymentMethodDefinition> GetAvailablePaymentMethods() =>
    [
        new PaymentMethodDefinition
        {
            Alias = "cards",
            DisplayName = "Credit/Debit Card",
            Icon = "icon-credit-card",
            Description = "Pay with credit or debit card",
            IntegrationType = PaymentIntegrationType.HostedFields,
            IsExpressCheckout = false,
            DefaultSortOrder = 10
        },
        new PaymentMethodDefinition
        {
            Alias = "paypal",
            DisplayName = "PayPal",
            Icon = "icon-paypal",
            Description = "Pay with your PayPal account",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 0
        }
    ];

    public override async Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request, CancellationToken ct = default)
    {
        var clientToken = await _gateway!.ClientToken.GenerateAsync();

        return PaymentSessionResult.HostedFields(
            clientToken: clientToken,
            jsSdkUrl: "https://js.braintreegateway.com/web/3.x/js/client.min.js",
            sdkConfig: new Dictionary<string, object>
            {
                ["hostedFieldsUrl"] = "https://js.braintreegateway.com/web/3.x/js/hosted-fields.min.js",
                ["fields"] = new
                {
                    number = new { selector = "#card-number", placeholder = "Card Number" },
                    cvv = new { selector = "#cvv", placeholder = "CVV" },
                    expirationDate = new { selector = "#expiry", placeholder = "MM/YY" }
                }
            },
            sessionId: Guid.NewGuid().ToString());
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

---

## Example 3: Manual Payment (DirectForm)

```csharp
public class ManualPaymentProvider : PaymentProviderBase
{
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "manual",
        DisplayName = "Manual Payment",
        Icon = "icon-wallet",
        Description = "Record offline payments",
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        RequiresWebhook = false
    };

    public override IReadOnlyList<PaymentMethodDefinition> GetAvailablePaymentMethods() =>
    [
        new PaymentMethodDefinition
        {
            Alias = "manual",
            DisplayName = "Manual Payment",
            Icon = "icon-wallet",
            Description = "Record cash, check, or bank transfer payments",
            IntegrationType = PaymentIntegrationType.DirectForm,
            IsExpressCheckout = false,
            DefaultSortOrder = 100
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
                    Key = "paymentMethod",
                    Label = "Payment Method",
                    FieldType = CheckoutFieldType.Select,
                    IsRequired = true,
                    Options =
                    [
                        new SelectOption { Value = "cash", Label = "Cash" },
                        new SelectOption { Value = "check", Label = "Check" },
                        new SelectOption { Value = "bank_transfer", Label = "Bank Transfer" }
                    ]
                },
                new() { Key = "reference", Label = "Reference Number", FieldType = CheckoutFieldType.Text },
                new() { Key = "notes", Label = "Notes", FieldType = CheckoutFieldType.Textarea }
            ],
            sessionId: Guid.NewGuid().ToString()));
    }

    public override Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request, CancellationToken ct = default)
    {
        var formData = request.FormData ?? [];
        var transactionId = $"manual_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}";
        return Task.FromResult(PaymentResult.Completed(transactionId, request.Amount ?? 0));
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

## Notes

- Sensitive config values (API keys) should be encrypted at rest
- Webhook endpoints are public (no auth) - validate signatures
- Consider rate limiting webhooks
- Use idempotency keys to prevent duplicate payments
- Providers auto-discovered via assembly scanning - no DI registration needed
- Express checkout methods collect customer data from the provider
- Risk scores are nullable - many payments won't have fraud data
