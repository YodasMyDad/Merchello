# Payment Provider Development Guide

Guide for third-party developers creating custom payment providers.

## Quick Start

1. Create .NET Class Library project
2. Reference `Merchello.Core`
3. Implement `IPaymentProvider` or extend `PaymentProviderBase`
4. Package as NuGet
5. Install - Merchello auto-discovers via assembly scanning

## Integration Types

| Type | Value | Use When |
|------|-------|----------|
| `Redirect` | 0 | Customer sent to external payment page |
| `HostedFields` | 10 | PCI-compliant iframes on your checkout |
| `Widget` | 20 | Provider's embedded UI component |
| `DirectForm` | 30 | Custom form fields (PO, manual) |

---

## Example 1: Stripe (Redirect)

```csharp
public class StripePaymentProvider : PaymentProviderBase
{
    private string? _secretKey;
    private string? _webhookSecret;

    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "stripe",
        DisplayName = "Stripe",
        Icon = "icon-credit-card",
        Description = "Accept payments via Stripe Checkout",
        IntegrationType = PaymentIntegrationType.Redirect,
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        SupportsAuthAndCapture = true,
        RequiresWebhook = true
    };

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

    public override ValueTask ConfigureAsync(PaymentProviderConfiguration? config, CancellationToken ct = default)
    {
        _secretKey = config?.GetValue("secretKey");
        _webhookSecret = config?.GetValue("webhookSecret");
        return ValueTask.CompletedTask;
    }

    public override async Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request, CancellationToken ct = default)
    {
        var session = await _stripeClient.Checkout.Sessions.CreateAsync(new SessionCreateOptions
        {
            PaymentMethodTypes = ["card"],
            LineItems =
            [
                new()
                {
                    PriceData = new()
                    {
                        Currency = request.Currency.ToLower(),
                        UnitAmount = (long)(request.Amount * 100),
                        ProductData = new() { Name = request.Description ?? "Payment" }
                    },
                    Quantity = 1
                }
            ],
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

## Example 2: Braintree (HostedFields)

```csharp
public class BraintreePaymentProvider : PaymentProviderBase
{
    private BraintreeGateway? _gateway;

    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "braintree",
        DisplayName = "Braintree",
        Icon = "icon-credit-card",
        Description = "Accept payments via Braintree Hosted Fields",
        IntegrationType = PaymentIntegrationType.HostedFields,
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        SupportsAuthAndCapture = true,
        RequiresWebhook = false
    };

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
                },
                ["styles"] = new { input = new { fontSize = "16px" } }
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

## Example 3: Klarna (Widget)

```csharp
public class KlarnaPaymentProvider : PaymentProviderBase
{
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "klarna",
        DisplayName = "Klarna",
        Icon = "icon-klarna",
        Description = "Buy now, pay later with Klarna",
        IntegrationType = PaymentIntegrationType.Widget,
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        RequiresWebhook = true
    };

    public override async Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request, CancellationToken ct = default)
    {
        var session = await _klarnaClient.CreatePaymentSessionAsync(new
        {
            purchase_country = "GB",
            purchase_currency = request.Currency,
            order_amount = (int)(request.Amount * 100)
        });

        return PaymentSessionResult.Widget(
            clientToken: session.ClientToken,
            jsSdkUrl: "https://x.klarnacdn.net/kp/lib/v1/api.js",
            sdkConfig: new Dictionary<string, object>
            {
                ["container"] = "#klarna-payments-container",
                ["paymentMethodCategories"] = session.PaymentMethodCategories
            },
            sessionId: session.SessionId);
    }

    public override async Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request, CancellationToken ct = default)
    {
        // AuthorizationToken from Klarna.Payments.authorize()
        var order = await _klarnaClient.CreateOrderAsync(request.AuthorizationToken, new { });
        return PaymentResult.Completed(order.OrderId, order.OrderAmount / 100m);
    }
}
```

---

## Example 4: Purchase Order (DirectForm)

```csharp
public class PurchaseOrderPaymentProvider : PaymentProviderBase
{
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "purchase-order",
        DisplayName = "Purchase Order",
        Icon = "icon-document",
        Description = "Pay by Purchase Order (B2B)",
        IntegrationType = PaymentIntegrationType.DirectForm,
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        RequiresWebhook = false
    };

    public override Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request, CancellationToken ct = default)
    {
        return Task.FromResult(PaymentSessionResult.DirectForm(
            formFields:
            [
                new()
                {
                    Key = "poNumber",
                    Label = "Purchase Order Number",
                    FieldType = CheckoutFieldType.Text,
                    IsRequired = true,
                    ValidationPattern = @"^PO-\d{5,}$",
                    ValidationMessage = "PO number must be in format PO-XXXXX",
                    Placeholder = "PO-12345"
                },
                new() { Key = "companyName", Label = "Company Name", FieldType = CheckoutFieldType.Text, IsRequired = true },
                new() { Key = "authorizedBy", Label = "Authorized By", FieldType = CheckoutFieldType.Text, IsRequired = true },
                new() { Key = "notes", Label = "Additional Notes", FieldType = CheckoutFieldType.Textarea, IsRequired = false }
            ],
            sessionId: Guid.NewGuid().ToString()));
    }

    public override Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request, CancellationToken ct = default)
    {
        var formData = request.FormData ?? [];
        var poNumber = formData.GetValueOrDefault("poNumber", "");

        if (!Regex.IsMatch(poNumber, @"^PO-\d{5,}$"))
            return Task.FromResult(PaymentResult.Failed("Invalid PO number format"));

        var transactionId = $"po_{poNumber}_{DateTime.UtcNow:yyyyMMddHHmmss}";
        return Task.FromResult(PaymentResult.Completed(transactionId, request.Amount ?? 0));
    }
}
```

---

## Frontend Integration

```typescript
async function initiatePayment(invoiceId: string, providerAlias: string) {
  const response = await fetch(`/api/merchello/checkout/${invoiceId}/pay`, {
    method: 'POST',
    body: JSON.stringify({
      providerAlias,
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

async function setupHostedFields(session) {
  await loadScript(session.javaScriptSdkUrl);
  const client = await braintree.client.create({ authorization: session.clientToken });
  const hostedFields = await braintree.hostedFields.create({ client, ...session.sdkConfiguration });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { nonce } = await hostedFields.tokenize();
    await fetch(`/api/merchello/checkout/process`, {
      method: 'POST',
      body: JSON.stringify({ invoiceId, providerAlias: 'braintree', sessionId: session.sessionId, paymentMethodToken: nonce })
    });
  });
}

function renderForm(formFields) {
  formFields.forEach(field => container.appendChild(createFormField(field)));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(formFields.map(f => [f.key, document.getElementById(f.key).value]));
    await fetch(`/api/merchello/checkout/process`, {
      method: 'POST',
      body: JSON.stringify({ invoiceId, providerAlias: 'manual', sessionId: session.sessionId, formData })
    });
  });
}
```

## Fraud/Risk Score Support

Payment providers can return fraud/risk scores from their fraud detection systems (e.g., Stripe Radar, Signifyd). Merchello stores these scores at the payment level and aggregates to the invoice level using MAX (highest risk bubbles up).

### Returning Risk Scores from Webhooks

The `WebhookProcessingResult.Successful()` method accepts optional risk score parameters:

```csharp
return WebhookProcessingResult.Successful(
    eventType: WebhookEventType.PaymentCompleted,
    transactionId: paymentIntent.Id,
    invoiceId: invoiceId,
    amount: amount,
    riskScore: 65m,        // 0-100 scale, higher = higher risk
    riskScoreSource: "stripe-radar"  // identifier for the fraud system
);
```

### Risk Score Scale

| Score Range | Risk Level | UI Display |
|-------------|------------|------------|
| 0-24 | Minimal | Green |
| 25-49 | Low | Yellow |
| 50-74 | Medium | Orange |
| 75-100 | High | Red |

### Stripe Radar Example

Stripe provides fraud data via the Charge's `outcome` object:
- `risk_level`: Always available ("normal", "elevated", "highest")
- `risk_score`: Numeric 0-99, requires Radar for Fraud Teams subscription

Map Stripe's data to Merchello's 0-100 scale:

```csharp
private static decimal? MapStripeRiskScore(long? riskScore, string? riskLevel)
{
    // Use actual score if available (Radar for Fraud Teams)
    if (riskScore.HasValue)
        return riskScore.Value;

    // Otherwise map risk_level to approximate scores
    return riskLevel?.ToLowerInvariant() switch
    {
        "normal" => 10m,
        "elevated" => 60m,
        "highest" => 90m,
        _ => null
    };
}

// In webhook handler, extract from charge outcome
var charge = await chargeService.GetAsync(chargeId);
var riskScore = MapStripeRiskScore(charge.Outcome?.RiskScore, charge.Outcome?.RiskLevel);
```

### PaymentResult Risk Scores

For providers that process payments directly (not via webhook), return risk data in `PaymentResult`:

```csharp
return PaymentResult.Completed(
    transactionId: txnId,
    amount: amount,
    riskScore: 45m,
    riskScoreSource: "provider-fraud-system"
);
```

---

## Notes

- Sensitive config values (API keys) should be encrypted at rest
- Webhook endpoints are public (no auth) - validate signatures
- Consider rate limiting webhooks
- Use idempotency keys to prevent duplicate payments
- Providers auto-discovered via assembly scanning - no DI registration needed
- Risk scores are nullable - many payments won't have fraud data (manual payments, providers without fraud detection)
