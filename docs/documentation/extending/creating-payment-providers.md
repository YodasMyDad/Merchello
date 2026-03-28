# Creating Custom Payment Providers

Payment providers are how Merchello connects to payment gateways like Stripe, PayPal, Braintree, and more. This guide walks you through building your own.

## Quick Overview

To create a payment provider, you need to:

1. Create a class that extends `PaymentProviderBase`
2. Implement the 4 required members: `Metadata`, `GetAvailablePaymentMethods()`, `CreatePaymentSessionAsync()`, `ProcessPaymentAsync()`
3. Optionally add webhooks, refunds, express checkout, vaulted payments, and payment links

Merchello discovers your provider automatically through assembly scanning (see [Extension Manager](extension-manager.md)).

## Minimal Example

Here's the simplest possible payment provider:

```csharp
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Shared.Providers;

public class AcmePaymentProvider : PaymentProviderBase
{
    // 1. Define metadata
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "acme",                    // Unique, immutable identifier
        DisplayName = "Acme Payments",     // Shown in backoffice
        Description = "Accept payments via Acme gateway",
        Icon = "icon-credit-card",
        SupportsRefunds = false,
        RequiresWebhook = false
    };

    // 2. Define payment methods
    public override IReadOnlyList<PaymentMethodDefinition> GetAvailablePaymentMethods() =>
    [
        new PaymentMethodDefinition
        {
            Alias = "card",
            DisplayName = "Credit Card",
            IntegrationType = PaymentIntegrationType.Redirect,
            IsExpressCheckout = false,
            DefaultSortOrder = 10,
            ShowInCheckoutByDefault = true
        }
    ];

    // 3. Create payment session
    public override Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        // Call your gateway's API to create a session
        var redirectUrl = $"https://pay.acme.com/checkout?amount={request.Amount}&currency={request.CurrencyCode}";

        return Task.FromResult(new PaymentSessionResult
        {
            Success = true,
            SessionId = Guid.NewGuid().ToString("N"),
            IntegrationType = PaymentIntegrationType.Redirect,
            RedirectUrl = redirectUrl
        });
    }

    // 4. Process the payment result
    public override Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        // Verify the payment with your gateway
        return Task.FromResult(new PaymentResult
        {
            Success = true,
            TransactionId = request.FormData?["transactionId"] ?? "",
            Status = PaymentResultStatus.Completed,
            Amount = request.Amount
        });
    }
}
```

## Step-by-Step Breakdown

### Step 1: Define Metadata

The `PaymentProviderMetadata` tells Merchello about your provider's capabilities:

```csharp
public override PaymentProviderMetadata Metadata => new()
{
    Alias = "myprovider",              // Required. Must be unique. Never change this.
    DisplayName = "My Provider",        // Required. Shown in backoffice UI.
    Icon = "icon-credit-card",          // Optional. Umbraco icon class.
    IconHtml = "<svg>...</svg>",        // Optional. Custom SVG, takes precedence over Icon.
    Description = "...",                // Optional. Shown in provider list.
    SupportsRefunds = true,             // Can this provider process refunds?
    SupportsPartialRefunds = true,      // Can it refund less than the full amount?
    SupportsAuthAndCapture = false,     // Does it support authorize-then-capture?
    RequiresWebhook = true,             // Does it need webhook configuration?
    SupportsPaymentLinks = false,       // Can it generate shareable payment URLs?
    SupportsVaultedPayments = false,    // Can customers save payment methods?
    RequiresProviderCustomerId = false, // Does vaulting need a provider customer ID?
    SetupInstructions = "## Setup\n..." // Optional. Markdown shown in backoffice.
};
```

> **Note:** The `Alias` is immutable and used for routing, storage, and webhook URLs. Choose it carefully and never change it after deployment. The webhook endpoint is automatically set to `/umbraco/merchello/webhooks/payments/{alias}`.

### Step 2: Define Payment Methods

A single provider can offer multiple payment methods. Each method has its own integration type:

```csharp
public override IReadOnlyList<PaymentMethodDefinition> GetAvailablePaymentMethods() =>
[
    new PaymentMethodDefinition
    {
        Alias = "card",                                    // Unique within this provider
        DisplayName = "Credit Card",
        IntegrationType = PaymentIntegrationType.HostedFields, // How the UI works
        IsExpressCheckout = false,
        DefaultSortOrder = 10,
        ShowInCheckoutByDefault = true,
        MethodType = PaymentMethodTypes.Standard
    },
    new PaymentMethodDefinition
    {
        Alias = "applepay",
        DisplayName = "Apple Pay",
        IntegrationType = PaymentIntegrationType.HostedFields,
        IsExpressCheckout = true,       // Express checkout = payment + address in one step
        DefaultSortOrder = 5,
        ShowInCheckoutByDefault = true
    }
];
```

**Integration types** determine how the frontend renders the payment UI:

| Type | Description | Example |
|---|---|---|
| `Redirect` | Customer is redirected to external payment page | PayPal redirect, Stripe Checkout |
| `HostedFields` | Payment fields render as iframes on the checkout page | Stripe Elements, Braintree Hosted Fields |
| `Widget` | Provider's embedded UI component loads on the checkout page | PayPal Buttons, Klarna widget |
| `DirectForm` | Simple HTML form fields | Manual payment, purchase orders |

### Step 3: Configuration Fields

If your provider needs API keys or other settings, define configuration fields:

```csharp
public override ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
    CancellationToken cancellationToken = default)
{
    return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
    [
        new ProviderConfigurationField
        {
            Key = "secretKey",
            Label = "Secret Key",
            Description = "Your API secret key",
            FieldType = ConfigurationFieldType.Password,
            IsRequired = true,
            IsSensitive = true,      // Masked in the UI
            Placeholder = "sk_live_..."
        },
        new ProviderConfigurationField
        {
            Key = "publishableKey",
            Label = "Publishable Key",
            FieldType = ConfigurationFieldType.Text,
            IsRequired = true,
            Placeholder = "pk_live_..."
        },
        new ProviderConfigurationField
        {
            Key = "captureMode",
            Label = "Payment Capture",
            FieldType = ConfigurationFieldType.Select,
            IsRequired = true,
            DefaultValue = "automatic",
            Options =
            [
                new SelectOption { Value = "automatic", Label = "Capture immediately" },
                new SelectOption { Value = "manual", Label = "Authorize only (capture later)" }
            ]
        }
    ]);
}
```

**Available field types:**

| Type | Renders as |
|---|---|
| `Text` | Single-line text input |
| `Password` | Masked text input |
| `Textarea` | Multi-line text input |
| `Checkbox` | Boolean toggle |
| `Select` | Dropdown |
| `Url` | URL input with validation |
| `Number` | Numeric input |
| `Currency` | Decimal input |
| `Percentage` | 0-100 input |

### Step 4: Access Configuration

Configuration is automatically loaded via `ConfigureAsync()`. The base class stores it in `Configuration`:

```csharp
public override ValueTask ConfigureAsync(
    PaymentProviderConfiguration? configuration,
    CancellationToken cancellationToken = default)
{
    // Base class stores Configuration automatically
    // You can do additional setup here if needed
    return base.ConfigureAsync(configuration, cancellationToken);
}
```

Then access values anywhere in your provider:

```csharp
var secretKey = Configuration?.GetValue("secretKey");
var isTestMode = Configuration?.IsTestMode ?? true;
var captureMode = Configuration?.GetValue("captureMode", "automatic");
var maxRetries = Configuration?.GetInt("maxRetries", 3);
var enableLogging = Configuration?.GetBool("enableLogging", false);
```

### Step 5: Webhooks

Most real payment providers need webhooks to receive asynchronous payment confirmations:

```csharp
public override async Task<bool> ValidateWebhookAsync(
    string payload,
    IDictionary<string, string> headers,
    CancellationToken cancellationToken = default)
{
    // Verify the webhook signature from your gateway
    var signature = headers.GetValueOrDefault("X-Acme-Signature", "");
    var secret = Configuration?.GetValue("webhookSecret") ?? "";
    return VerifySignature(payload, signature, secret);
}

public override async Task<WebhookProcessingResult> ProcessWebhookAsync(
    string payload,
    IDictionary<string, string> headers,
    CancellationToken cancellationToken = default)
{
    // Parse the webhook payload and return the result
    var webhookEvent = JsonSerializer.Deserialize<AcmeWebhookEvent>(payload);

    return new WebhookProcessingResult
    {
        Success = true,
        TransactionId = webhookEvent.TransactionId,
        PaymentStatus = MapStatus(webhookEvent.Status),
        Amount = webhookEvent.Amount,
        WebhookEventId = webhookEvent.EventId  // For deduplication
    };
}
```

> **Warning:** Always validate webhook signatures. Never trust unvalidated webhook payloads. Merchello calls `ValidateWebhookAsync()` before `ProcessWebhookAsync()`.

### Step 6: Refunds

```csharp
public override async Task<RefundResult> RefundPaymentAsync(
    RefundRequest request,
    CancellationToken cancellationToken = default)
{
    // Call your gateway's refund API
    var result = await _client.RefundAsync(request.TransactionId, request.Amount);

    return new RefundResult
    {
        Success = result.Succeeded,
        RefundTransactionId = result.RefundId,
        AmountRefunded = request.Amount,
        ErrorMessage = result.Succeeded ? null : result.ErrorMessage
    };
}
```

### Step 7: Express Checkout (Optional)

Express checkout (Apple Pay, Google Pay) combines payment and address capture in one step:

```csharp
public override Task<ExpressCheckoutClientConfig?> GetExpressCheckoutClientConfigAsync(
    string methodAlias,
    decimal amount,
    string currency,
    CancellationToken cancellationToken = default)
{
    if (methodAlias != "applepay") return Task.FromResult<ExpressCheckoutClientConfig?>(null);

    return Task.FromResult<ExpressCheckoutClientConfig?>(new ExpressCheckoutClientConfig
    {
        SdkUrl = "https://js.acme.com/sdk.js",
        ClientConfig = new Dictionary<string, object>
        {
            ["publishableKey"] = Configuration?.GetValue("publishableKey") ?? "",
            ["amount"] = amount,
            ["currency"] = currency
        }
    });
}

public override async Task<ExpressCheckoutResult> ProcessExpressCheckoutAsync(
    ExpressCheckoutRequest request,
    CancellationToken cancellationToken = default)
{
    // Process the express checkout token from the client-side SDK
    // The result includes both payment confirmation AND customer address
    return new ExpressCheckoutResult { /* ... */ };
}
```

### Step 8: Vaulted Payments (Optional)

Let customers save payment methods for future use:

```csharp
public override async Task<VaultSetupResult> CreateVaultSetupSessionAsync(
    VaultSetupRequest request,
    CancellationToken cancellationToken = default)
{
    // Create a setup session with your gateway (no charge)
    return new VaultSetupResult { /* clientSecret, redirectUrl, etc. */ };
}

public override async Task<PaymentResult> ChargeVaultedMethodAsync(
    ChargeVaultedMethodRequest request,
    CancellationToken cancellationToken = default)
{
    // Charge a previously saved payment method (off-session, no CVV)
    return new PaymentResult { /* ... */ };
}
```

### Step 9: Payment Links (Optional)

Generate shareable URLs for invoice payment:

```csharp
public override async Task<PaymentLinkResult> CreatePaymentLinkAsync(
    PaymentLinkRequest request,
    CancellationToken cancellationToken = default)
{
    // Create a payment link with your gateway
    return new PaymentLinkResult
    {
        Success = true,
        PaymentUrl = "https://pay.acme.com/link/abc123",
        ProviderLinkId = "abc123",
        ExpiresAt = DateTime.UtcNow.AddDays(7)
    };
}
```

## Using Constructor Injection

Your provider can inject any registered service:

```csharp
public class AcmePaymentProvider(
    ICurrencyService currencyService,
    IHttpClientFactory httpClientFactory,
    ILogger<AcmePaymentProvider> logger) : PaymentProviderBase
{
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();

    // Use injected services in your methods
}
```

## Testing Your Provider

After creating your provider:

1. Reference your project/NuGet from the web project
2. Start the application -- Merchello discovers it automatically
3. Go to **Settings > Payment Providers** in the backoffice
4. Your provider appears in the list
5. Configure it with your API credentials
6. Enable it and test a checkout

> **Tip:** Use `Configuration.IsTestMode` to switch between sandbox and production credentials. The backoffice has a test mode toggle per provider.

## Built-in Providers for Reference

Study these built-in providers for real-world patterns:

| Provider | Location | Notes |
|---|---|---|
| Manual Payment | `Payments/Providers/BuiltIn/ManualPaymentProvider.cs` | Simplest example, `DirectForm` integration |
| Stripe | `Payments/Providers/Stripe/StripePaymentProvider.cs` | Full-featured: webhooks, refunds, auth/capture, vaulting, payment links |
| PayPal | `Payments/Providers/PayPal/PayPalPaymentProvider.cs` | Redirect flow |
| Braintree | `Payments/Providers/Braintree/BraintreePaymentProvider.cs` | SDK embed flow |
