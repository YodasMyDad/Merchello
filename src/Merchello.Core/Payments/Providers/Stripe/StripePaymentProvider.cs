using Merchello.Core.Payments.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Stripe;
using Stripe.Checkout;

namespace Merchello.Core.Payments.Providers.Stripe;

/// <summary>
/// Stripe payment provider using Stripe Checkout (redirect flow).
/// Supports payments, refunds, partial refunds, and authorization/capture.
/// </summary>
/// <remarks>
/// Configuration required:
/// - secretKey: Stripe Secret Key (sk_test_* or sk_live_*)
/// - publishableKey: Stripe Publishable Key (pk_test_* or pk_live_*)
/// - webhookSecret: Stripe Webhook Signing Secret (whsec_*)
///
/// Webhook endpoint: /umbraco/merchello/webhooks/payments/stripe
/// Required webhook events: checkout.session.completed, payment_intent.succeeded,
/// payment_intent.payment_failed, charge.refunded, charge.dispute.created
/// </remarks>
public class StripePaymentProvider(ICurrencyService currencyService) : PaymentProviderBase
{
    private StripeClient? _client;
    private string? _webhookSecret;
    private string? _publishableKey;
    private readonly ICurrencyService _currencyService = currencyService;

    /// <summary>
    /// Stripe.js SDK URL for frontend integration.
    /// Uses Stripe's named versioning system (Clover is current as of Dec 2025).
    /// See: https://docs.stripe.com/sdks/stripejs-versioning
    /// </summary>
    private const string StripeJsSdkUrl = "https://js.stripe.com/clover/stripe.js";

    /// <summary>
    /// URL to the Stripe payment adapter script.
    /// </summary>
    private const string StripePaymentAdapterUrl = "/js/checkout/adapters/stripe-payment-adapter.js";

    /// <summary>
    /// SVG icon for card payments.
    /// </summary>
    private const string CardIconSvg = """<svg class="w-8 h-5" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="30" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><rect x="1" y="5" width="30" height="4" fill="currentColor" opacity="0.3"/><rect x="4" y="12" width="8" height="2" rx="1" fill="currentColor" opacity="0.5"/></svg>""";

    /// <summary>
    /// SVG icon for Apple Pay.
    /// </summary>
    private const string ApplePayIconSvg = """<svg class="w-12 h-5" viewBox="0 0 50 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.6 2.7C10.2 2 10.7 1 10.5 0C9.6 0.1 8.5 0.6 7.9 1.3C7.3 1.9 6.7 2.9 6.9 3.9C7.9 4 8.9 3.5 9.6 2.7ZM10.5 4.1C9 4 7.7 4.9 7 4.9C6.2 4.9 5.1 4.1 3.8 4.2C2.2 4.2 0.8 5 0 6.3C-1.5 9 0.1 12.9 1.6 15.1C2.3 16.2 3.2 17.5 4.4 17.4C5.6 17.4 6 16.6 7.4 16.6C8.8 16.6 9.2 17.4 10.5 17.4C11.7 17.4 12.5 16.2 13.2 15.1C14 13.9 14.4 12.7 14.4 12.6C14.4 12.6 11.8 11.6 11.8 8.7C11.8 6.2 13.8 5 13.9 5C12.7 3.2 10.8 4.1 10.5 4.1Z" fill="currentColor"/><path d="M21.2 1.3C24.6 1.3 27 3.7 27 7.1C27 10.6 24.5 13 21 13H17.7V17.3H14.8V1.3H21.2ZM17.7 10.5H20.4C22.7 10.5 24 9.2 24 7.1C24 5 22.7 3.7 20.4 3.7H17.7V10.5Z" fill="currentColor"/><path d="M28.1 14C28.1 11.8 29.8 10.4 32.8 10.3L36.2 10.1V9.2C36.2 7.8 35.2 6.9 33.5 6.9C32 6.9 31 7.6 30.8 8.7H28.2C28.3 6.2 30.5 4.6 33.6 4.6C36.8 4.6 38.9 6.2 38.9 8.9V17.3H36.3V15.2H36.2C35.5 16.6 33.8 17.5 32.1 17.5C29.6 17.5 28.1 16.1 28.1 14ZM36.2 12.8V11.9L33.2 12.1C31.6 12.2 30.8 12.9 30.8 13.9C30.8 14.9 31.7 15.6 33 15.6C34.8 15.6 36.2 14.4 36.2 12.8Z" fill="currentColor"/><path d="M41.2 21V18.8C41.4 18.8 41.8 18.9 42.1 18.9C43.2 18.9 43.9 18.4 44.2 17.4L44.4 16.7L39.5 4.8H42.5L45.8 14.4H45.9L49.2 4.8H52.1L47 17.6C46 20.4 44.7 21.2 42.3 21.2C42 21 41.5 21 41.2 21Z" fill="currentColor"/></svg>""";

    /// <summary>
    /// SVG icon for Google Pay.
    /// </summary>
    private const string GooglePayIconSvg = """<svg class="w-12 h-5" viewBox="0 0 50 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.8 10.5V16.3H22V1.5H27C28.4 1.5 29.6 2 30.5 2.9C31.5 3.8 32 4.9 32 6.2C32 7.6 31.5 8.7 30.5 9.6C29.6 10.5 28.4 10.5 27 10.5H23.8ZM23.8 3.2V8.8H27C27.9 8.8 28.6 8.5 29.1 7.9C29.7 7.3 30 6.8 30 6C30 5.3 29.7 4.7 29.1 4.1C28.5 3.5 27.8 3.2 27 3.2H23.8Z" fill="#5F6368"/><path d="M37 6.3C38.5 6.3 39.7 6.7 40.6 7.6C41.5 8.5 42 9.6 42 11V16.3H40.2V14.9H40.1C39.2 16.1 38 16.5 36.7 16.5C35.5 16.5 34.5 16.2 33.7 15.5C32.9 14.8 32.5 13.9 32.5 12.9C32.5 11.8 32.9 10.9 33.8 10.2C34.7 9.5 35.8 9.2 37.2 9.2C38.4 9.2 39.4 9.4 40.1 9.9V9.5C40.1 8.7 39.8 8.1 39.2 7.5C38.6 6.9 37.9 6.6 37.1 6.6C35.9 6.6 35 7.1 34.4 8L32.8 7C33.7 5.9 35.1 6.3 37 6.3ZM34.4 12.9C34.4 13.5 34.7 14 35.2 14.3C35.7 14.7 36.3 14.9 37 14.9C37.9 14.9 38.8 14.5 39.5 13.9C40.2 13.2 40.5 12.5 40.5 11.6C39.9 11.1 39 10.8 37.8 10.8C36.9 10.8 36.1 11 35.5 11.4C34.8 11.8 34.4 12.3 34.4 12.9Z" fill="#5F6368"/><path d="M50 6.5L44.4 19.5H42.5L44.5 15.1L40.5 6.5H42.5L45.4 13.2L48.2 6.5H50Z" fill="#5F6368"/><path d="M16 8.5C16 7.9 16 7.3 15.9 6.8H8.2V10H12.5C12.3 11.1 11.7 12.1 10.8 12.7V15H13.5C15.1 13.5 16 11.2 16 8.5Z" fill="#4285F4"/><path d="M8.2 17C10.6 17 12.6 16.2 13.5 15L10.8 12.7C10 13.2 9.2 13.5 8.2 13.5C5.9 13.5 3.9 11.9 3.2 9.8H0.4V12.2C1.8 14.9 4.8 17 8.2 17Z" fill="#34A853"/><path d="M3.2 9.8C3 9.2 2.9 8.6 2.9 8C2.9 7.4 3 6.8 3.2 6.2V3.8H0.4C-0.2 5.1 -0.5 6.5 -0.5 8C-0.5 9.5 -0.2 10.9 0.4 12.2L3.2 9.8Z" fill="#FBBC05"/><path d="M8.2 2.5C9.4 2.5 10.5 2.9 11.3 3.7L13.6 1.4C12.1 0 10.3 -0.7 8.2 -0.7C4.8 -0.7 1.8 1.4 0.4 3.8L3.2 6.2C3.9 4.1 5.9 2.5 8.2 2.5Z" fill="#EA4335"/></svg>""";

    /// <summary>
    /// SVG icon for Link (Stripe's one-click checkout).
    /// </summary>
    private const string LinkIconSvg = """<svg class="w-10 h-5" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="20" rx="3" fill="#00D66F"/><path d="M8 5h2v10H8V5zm4 3.5c0-2 1.5-3.5 3.5-3.5 1.2 0 2.2.6 2.8 1.4V5.5h1.7V15h-1.7v-1.4c-.6.9-1.6 1.4-2.8 1.4-2 0-3.5-1.5-3.5-3.5v-3zm5.2.2c0-1.2-1-2.2-2.2-2.2s-2.2 1-2.2 2.2v2.6c0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2V8.7zM22 5h1.7v3.5c.6-.9 1.6-1.5 2.8-1.5 2.2 0 3.5 1.5 3.5 3.5v4.5h-1.7v-4.3c0-1.2-1-2.2-2.2-2.2s-2.2 1-2.2 2.2v4.3H22V5zm10 0h2v10h-2V5z" fill="white"/></svg>""";

    /// <inheritdoc />
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "stripe",
        DisplayName = "Stripe",
        Icon = "icon-credit-card",
        Description = "Accept payments via Stripe. Supports credit cards, Apple Pay, Google Pay, and more.",
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        SupportsAuthAndCapture = true,
        RequiresWebhook = true,
        SetupInstructions = """
            ## Stripe Setup Instructions

            ### 1. Get API Keys

            1. Create a free account at [stripe.com](https://stripe.com)
            2. In the Dashboard, ensure **Test mode** is toggled ON (top right)
            3. Go to **Developers → API keys**
            4. Copy your **Publishable key** (`pk_test_...`) and **Secret key** (`sk_test_...`)

            ### 2. Configure Webhooks

            Webhooks are required to confirm payments after customers complete checkout.

            #### For Production/Staging:

            1. Go to **Developers → Webhooks**
            2. Click **"+ Add endpoint"**
            3. Enter your webhook URL:
               ```
               https://your-site.com/umbraco/merchello/webhooks/payments/stripe
               ```
            4. Select these events:
               - `checkout.session.completed`
               - `payment_intent.succeeded`
               - `payment_intent.payment_failed`
               - `charge.refunded`
            5. Click **"Add endpoint"**
            6. Click **"Reveal"** under "Signing secret" and copy the `whsec_...` value

            #### For Local Development:

            Use the Stripe CLI to forward webhooks to localhost:

            **Install Stripe CLI:**
            ```powershell
            # Windows (winget)
            winget install Stripe.StripeCLI

            # Windows (scoop)
            scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
            scoop install stripe

            # macOS
            brew install stripe/stripe-cli/stripe
            ```

            **Forward webhooks:**
            ```bash
            stripe login
            stripe listen --forward-to https://localhost:44391/umbraco/merchello/webhooks/payments/stripe
            ```

            The CLI will display a webhook signing secret (`whsec_...`) - use this in the configuration.

            ### 3. Test Card Numbers

            Use these test cards with any future expiry date and any 3-digit CVC:

            | Card Number | Result |
            |-------------|--------|
            | `4242 4242 4242 4242` | Successful payment |
            | `4000 0000 0000 3220` | 3D Secure required |
            | `4000 0000 0000 9995` | Declined (insufficient funds) |
            | `4000 0000 0000 0002` | Declined (generic) |

            ### 4. Going Live

            1. Complete your Stripe account verification
            2. Toggle off **Test mode** in the Stripe Dashboard
            3. Copy your live API keys (`pk_live_...`, `sk_live_...`)
            4. Create a new webhook endpoint for your production URL
            5. Update the configuration with live keys and webhook secret
            6. Uncheck **Test Mode** in the provider settings
            """
    };

    /// <inheritdoc />
    public override IReadOnlyList<PaymentMethodDefinition> GetAvailablePaymentMethods() =>
    [
        new PaymentMethodDefinition
        {
            Alias = "cards",
            DisplayName = "Credit/Debit Card (Redirect)",
            Icon = "icon-credit-card",
            IconHtml = CardIconSvg,
            Description = "Pay via Stripe Checkout - redirects to Stripe's hosted payment page.",
            IntegrationType = PaymentIntegrationType.Redirect,
            IsExpressCheckout = false,
            DefaultSortOrder = 20,
            MethodType = PaymentMethodType.Cards
        },
        new PaymentMethodDefinition
        {
            Alias = "cards-elements",
            DisplayName = "Credit/Debit Card",
            Icon = "icon-credit-card",
            IconHtml = CardIconSvg,
            Description = "Pay with Visa, Mastercard, American Express using inline card fields.",
            IntegrationType = PaymentIntegrationType.HostedFields,
            IsExpressCheckout = false,
            DefaultSortOrder = 10,
            MethodType = PaymentMethodType.Cards
        },
        new PaymentMethodDefinition
        {
            Alias = "applepay",
            DisplayName = "Apple Pay",
            Icon = "icon-apple",
            IconHtml = ApplePayIconSvg,
            Description = "Fast, secure checkout with Apple Pay.",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 0,
            MethodType = PaymentMethodType.ApplePay
        },
        new PaymentMethodDefinition
        {
            Alias = "googlepay",
            DisplayName = "Google Pay",
            Icon = "icon-google",
            IconHtml = GooglePayIconSvg,
            Description = "Fast, secure checkout with Google Pay.",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 1,
            MethodType = PaymentMethodType.GooglePay
        },
        new PaymentMethodDefinition
        {
            Alias = "link",
            DisplayName = "Link by Stripe",
            Icon = "icon-link",
            IconHtml = LinkIconSvg,
            Description = "One-click checkout with saved payment info across Stripe merchants.",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 2,
            MethodType = PaymentMethodType.Link
        }
    ];

    /// <inheritdoc />
    public override ValueTask<IEnumerable<PaymentProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<PaymentProviderConfigurationField>>(
        [
            new()
            {
                Key = "secretKey",
                Label = "Secret Key",
                Description = "Your Stripe Secret Key (starts with sk_test_ or sk_live_)",
                FieldType = ConfigurationFieldType.Password,
                IsSensitive = true,
                IsRequired = true,
                Placeholder = "sk_test_..."
            },
            new()
            {
                Key = "publishableKey",
                Label = "Publishable Key",
                Description = "Your Stripe Publishable Key (starts with pk_test_ or pk_live_)",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                Placeholder = "pk_test_..."
            },
            new()
            {
                Key = "webhookSecret",
                Label = "Webhook Signing Secret",
                Description = "Signing secret for verifying webhook signatures (starts with whsec_)",
                FieldType = ConfigurationFieldType.Password,
                IsSensitive = true,
                IsRequired = true,
                Placeholder = "whsec_..."
            }
        ]);
    }

    /// <inheritdoc />
    public override async ValueTask ConfigureAsync(
        PaymentProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        // Call base to set Configuration property
        await base.ConfigureAsync(configuration, cancellationToken);

        var secretKey = configuration?.GetValue("secretKey");
        _webhookSecret = configuration?.GetValue("webhookSecret");
        _publishableKey = configuration?.GetValue("publishableKey");

        if (!string.IsNullOrEmpty(secretKey))
        {
            _client = new StripeClient(secretKey);
        }
    }

    /// <summary>
    /// Whether the provider is configured in test mode.
    /// Uses the explicit IsTestMode setting from the admin configuration.
    /// </summary>
    public bool IsTestMode => Configuration?.IsTestMode ?? true;

    // =====================================================
    // Payment Flow
    // =====================================================

    /// <inheritdoc />
    public override async Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_client is null)
        {
            return PaymentSessionResult.Failed("Stripe is not configured. Please add your API keys.");
        }

        // Route based on method alias
        return request.MethodAlias switch
        {
            "cards" => await CreateStripeCheckoutSessionAsync(request, cancellationToken),
            "cards-elements" => await CreatePaymentIntentSessionAsync(request, cancellationToken),
            "applepay" or "googlepay" or "link" => await CreateExpressCheckoutSessionAsync(request, cancellationToken),
            _ => await CreatePaymentIntentSessionAsync(request, cancellationToken) // Default to Payment Element
        };
    }

    /// <summary>
    /// Creates a Stripe Checkout session (redirect flow) for the "cards" method.
    /// </summary>
    private async Task<PaymentSessionResult> CreateStripeCheckoutSessionAsync(
        PaymentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var sessionService = new SessionService(_client);

            // Build line items - single line item for the invoice total
            List<SessionLineItemOptions> lineItems =
            [
                new()
                {
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = request.Currency.ToLowerInvariant(),
                        UnitAmount = ConvertToStripeAmount(request.Amount, request.Currency),
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = request.Description ?? "Invoice Payment",
                            Description = $"Invoice #{request.InvoiceId}"
                        }
                    },
                    Quantity = 1
                }
            ];

            // Build metadata for webhook correlation
            var metadata = BuildMetadata(request);

            var sessionOptions = new SessionCreateOptions
            {
                PaymentMethodTypes = ["card"],
                LineItems = lineItems,
                Mode = "payment",
                SuccessUrl = request.ReturnUrl,
                CancelUrl = request.CancelUrl,
                Metadata = metadata,
                PaymentIntentData = new SessionPaymentIntentDataOptions
                {
                    Metadata = metadata
                }
            };

            // Add customer email if provided
            if (!string.IsNullOrEmpty(request.CustomerEmail))
            {
                sessionOptions.CustomerEmail = request.CustomerEmail;
            }

            var session = await sessionService.CreateAsync(sessionOptions, cancellationToken: cancellationToken);

            return PaymentSessionResult.Redirect(
                redirectUrl: session.Url,
                sessionId: session.Id);
        }
        catch (StripeException ex)
        {
            return PaymentSessionResult.Failed(
                errorMessage: ex.Message,
                errorCode: ex.StripeError?.Code);
        }
    }

    /// <summary>
    /// Creates a PaymentIntent for the Payment Element (cards-elements method).
    /// Returns client_secret for frontend confirmation via Stripe.js.
    /// </summary>
    private async Task<PaymentSessionResult> CreatePaymentIntentSessionAsync(
        PaymentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var paymentIntentService = new PaymentIntentService(_client);

            var metadata = BuildMetadata(request);

            var options = new PaymentIntentCreateOptions
            {
                Amount = ConvertToStripeAmount(request.Amount, request.Currency),
                Currency = request.Currency.ToLowerInvariant(),
                AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions
                {
                    Enabled = true
                },
                Metadata = metadata,
                Description = request.Description ?? $"Invoice #{request.InvoiceId}"
            };

            // Add customer email if provided
            if (!string.IsNullOrEmpty(request.CustomerEmail))
            {
                options.ReceiptEmail = request.CustomerEmail;
            }

            var paymentIntent = await paymentIntentService.CreateAsync(options, cancellationToken: cancellationToken);

            // Return HostedFields result with adapter configuration for Stripe Payment Element
            return PaymentSessionResult.HostedFields(
                providerAlias: Metadata.Alias,
                methodAlias: request.MethodAlias ?? "cards-elements",
                adapterUrl: StripePaymentAdapterUrl,
                jsSdkUrl: StripeJsSdkUrl,
                sdkConfig: new Dictionary<string, object>
                {
                    ["publishableKey"] = _publishableKey ?? string.Empty,
                    ["paymentIntentId"] = paymentIntent.Id,
                    ["returnUrl"] = request.ReturnUrl
                },
                clientSecret: paymentIntent.ClientSecret,
                sessionId: paymentIntent.Id);
        }
        catch (StripeException ex)
        {
            return PaymentSessionResult.Failed(
                errorMessage: ex.Message,
                errorCode: ex.StripeError?.Code);
        }
    }

    /// <summary>
    /// Creates a PaymentIntent for Express Checkout Element (Apple Pay, Google Pay, Link).
    /// Returns configuration for the frontend Express Checkout Element.
    /// </summary>
    private async Task<PaymentSessionResult> CreateExpressCheckoutSessionAsync(
        PaymentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var paymentIntentService = new PaymentIntentService(_client);

            var metadata = BuildMetadata(request);

            var options = new PaymentIntentCreateOptions
            {
                Amount = ConvertToStripeAmount(request.Amount, request.Currency),
                Currency = request.Currency.ToLowerInvariant(),
                AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions
                {
                    Enabled = true
                },
                Metadata = metadata,
                Description = request.Description ?? $"Invoice #{request.InvoiceId}"
            };

            // Add customer email if provided
            if (!string.IsNullOrEmpty(request.CustomerEmail))
            {
                options.ReceiptEmail = request.CustomerEmail;
            }

            var paymentIntent = await paymentIntentService.CreateAsync(options, cancellationToken: cancellationToken);

            // Return Widget result with adapter configuration for Express Checkout Element
            return PaymentSessionResult.Widget(
                providerAlias: Metadata.Alias,
                methodAlias: request.MethodAlias ?? "applepay",
                adapterUrl: StripePaymentAdapterUrl,
                jsSdkUrl: StripeJsSdkUrl,
                sdkConfig: new Dictionary<string, object>
                {
                    ["publishableKey"] = _publishableKey ?? string.Empty,
                    ["paymentIntentId"] = paymentIntent.Id,
                    ["amount"] = ConvertToStripeAmount(request.Amount, request.Currency),
                    ["currency"] = request.Currency.ToLowerInvariant(),
                    ["returnUrl"] = request.ReturnUrl,
                    ["methodAlias"] = request.MethodAlias ?? string.Empty
                },
                clientToken: paymentIntent.ClientSecret,
                sessionId: paymentIntent.Id);
        }
        catch (StripeException ex)
        {
            return PaymentSessionResult.Failed(
                errorMessage: ex.Message,
                errorCode: ex.StripeError?.Code);
        }
    }

    /// <summary>
    /// Builds metadata dictionary for Stripe objects.
    /// </summary>
    private static Dictionary<string, string> BuildMetadata(PaymentRequest request)
    {
        var metadata = new Dictionary<string, string>
        {
            ["invoiceId"] = request.InvoiceId.ToString(),
            ["source"] = "merchello"
        };

        if (!string.IsNullOrEmpty(request.MethodAlias))
        {
            metadata["methodAlias"] = request.MethodAlias;
        }

        // Merge any additional metadata from request
        if (request.Metadata is not null)
        {
            foreach (var kvp in request.Metadata)
            {
                metadata[kvp.Key] = kvp.Value;
            }
        }

        return metadata;
    }

    /// <inheritdoc />
    public override Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        // For redirect-based providers and Payment Element, confirmation comes via webhook.
        // The frontend confirms payment using stripe.confirmPayment() which handles 3D Secure etc.
        // Return pending status - the webhook will update the payment to completed.
        return Task.FromResult(PaymentResult.Pending(
            transactionId: request.SessionId ?? $"pending_{request.InvoiceId}",
            amount: request.Amount ?? 0));
    }

    // =====================================================
    // Express Checkout (Apple Pay, Google Pay, Link)
    // =====================================================

    /// <inheritdoc />
    /// <remarks>
    /// Returns Stripe.js SDK configuration for the Express Checkout Element.
    /// The Express Checkout Element supports Apple Pay, Google Pay, Link, PayPal, and more.
    /// See: https://docs.stripe.com/elements/express-checkout-element
    /// </remarks>
    public override Task<ExpressCheckoutClientConfig?> GetExpressCheckoutClientConfigAsync(
        string methodAlias,
        decimal amount,
        string currency,
        CancellationToken cancellationToken = default)
    {
        // Express checkout requires configuration
        if (string.IsNullOrEmpty(_publishableKey))
        {
            return Task.FromResult<ExpressCheckoutClientConfig?>(null);
        }

        // Map method alias to Stripe payment method type for filtering
        // The Express Checkout Element shows available methods automatically
        var walletType = methodAlias.ToLowerInvariant() switch
        {
            "applepay" => "applePay",
            "googlepay" => "googlePay",
            "link" => "link",
            _ => null
        };

        // Get method type for frontend
        var methodType = methodAlias.ToLowerInvariant() switch
        {
            "applepay" => PaymentMethodType.ApplePay,
            "googlepay" => PaymentMethodType.GooglePay,
            "link" => PaymentMethodType.Link,
            _ => (PaymentMethodType?)null
        };

        var config = new ExpressCheckoutClientConfig
        {
            ProviderAlias = Metadata.Alias,
            MethodAlias = methodAlias,
            MethodType = methodType,
            SdkUrl = StripeJsSdkUrl,
            CustomAdapterUrl = "/js/checkout/adapters/stripe-express-adapter.js",
            SdkConfig = new Dictionary<string, object>
            {
                ["publishableKey"] = _publishableKey,
                ["mode"] = "payment",
                ["amount"] = ConvertToStripeAmount(amount, currency),
                ["currency"] = currency.ToLowerInvariant(),
                // Wallet type to show (or null to show all available)
                ["walletType"] = walletType ?? string.Empty,
                // Appearance customization
                ["buttonHeight"] = 48,
                ["buttonTheme"] = methodAlias.ToLowerInvariant() == "applepay" ? "black" : "default"
            },
            IsAvailable = true
        };

        return Task.FromResult<ExpressCheckoutClientConfig?>(config);
    }

    /// <inheritdoc />
    /// <remarks>
    /// For Stripe express checkout, the payment is confirmed client-side via stripe.confirmPayment().
    /// This method verifies the PaymentIntent status and returns the result.
    /// The webhook will provide final confirmation for async payment methods.
    /// </remarks>
    public override async Task<ExpressCheckoutResult> ProcessExpressCheckoutAsync(
        ExpressCheckoutRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_client is null)
        {
            return ExpressCheckoutResult.Failed("Stripe is not configured.");
        }

        try
        {
            var paymentIntentService = new PaymentIntentService(_client);

            // The PaymentIntent ID is passed as the PaymentToken from the frontend
            // after stripe.confirmPayment() completes
            var paymentIntentId = request.PaymentToken;

            // If the token looks like a PaymentIntent ID, retrieve it
            // Otherwise, it might be a payment method token that needs confirmation
            if (paymentIntentId.StartsWith("pi_"))
            {
                var paymentIntent = await paymentIntentService.GetAsync(
                    paymentIntentId,
                    cancellationToken: cancellationToken);

                return paymentIntent.Status switch
                {
                    "succeeded" => ExpressCheckoutResult.Completed(
                        transactionId: paymentIntent.Id,
                        amount: ConvertFromStripeAmount(paymentIntent.Amount, paymentIntent.Currency)),

                    "processing" => ExpressCheckoutResult.Pending(
                        transactionId: paymentIntent.Id,
                        amount: ConvertFromStripeAmount(paymentIntent.Amount, paymentIntent.Currency)),

                    "requires_action" or "requires_confirmation" => ExpressCheckoutResult.Pending(
                        transactionId: paymentIntent.Id,
                        amount: ConvertFromStripeAmount(paymentIntent.Amount, paymentIntent.Currency)),

                    "requires_payment_method" => ExpressCheckoutResult.Failed(
                        "Payment method required. Please try again.",
                        errorCode: "requires_payment_method"),

                    "canceled" => ExpressCheckoutResult.Failed(
                        "Payment was canceled.",
                        errorCode: "canceled"),

                    _ => ExpressCheckoutResult.Failed(
                        $"Unexpected payment status: {paymentIntent.Status}",
                        errorCode: paymentIntent.Status)
                };
            }

            // If it's a payment method token (pm_*), we need to confirm the PaymentIntent
            // This shouldn't happen with Express Checkout Element as confirmation happens client-side
            return ExpressCheckoutResult.Failed(
                "Invalid payment token. Expected PaymentIntent ID.",
                errorCode: "invalid_token");
        }
        catch (StripeException ex)
        {
            return ExpressCheckoutResult.Failed(
                error: ex.Message,
                errorCode: ex.StripeError?.Code);
        }
    }

    // =====================================================
    // Capture (Auth & Capture flow)
    // =====================================================

    /// <inheritdoc />
    public override async Task<PaymentCaptureResult> CapturePaymentAsync(
        string transactionId,
        decimal? amount = null,
        CancellationToken cancellationToken = default)
    {
        if (_client is null)
        {
            return PaymentCaptureResult.Failure("Stripe is not configured.");
        }

        try
        {
            var paymentIntentService = new PaymentIntentService(_client);

            var captureOptions = new PaymentIntentCaptureOptions();

            // If partial capture amount specified, convert to Stripe amount
            if (amount.HasValue)
            {
                // We need to get the payment intent first to know the currency
                var paymentIntent = await paymentIntentService.GetAsync(transactionId, cancellationToken: cancellationToken);
                captureOptions.AmountToCapture = ConvertToStripeAmount(amount.Value, paymentIntent.Currency);
            }

            var capturedIntent = await paymentIntentService.CaptureAsync(
                transactionId,
                captureOptions,
                cancellationToken: cancellationToken);

            return PaymentCaptureResult.Successful(
                transactionId: capturedIntent.Id,
                amount: ConvertFromStripeAmount(capturedIntent.Amount, capturedIntent.Currency));
        }
        catch (StripeException ex)
        {
            return PaymentCaptureResult.Failure(
                errorMessage: ex.Message,
                errorCode: ex.StripeError?.Code);
        }
    }

    // =====================================================
    // Refunds
    // =====================================================

    /// <inheritdoc />
    public override async Task<RefundResult> RefundPaymentAsync(
        RefundRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_client is null)
        {
            return RefundResult.Failure("Stripe is not configured.");
        }

        try
        {
            var refundService = new RefundService(_client);

            var refundOptions = new RefundCreateOptions
            {
                PaymentIntent = request.TransactionId,
                Reason = MapRefundReason(request.Reason)
            };

            // If amount specified, it's a partial refund
            if (request.Amount.HasValue)
            {
                // Get the payment intent to determine currency
                var paymentIntentService = new PaymentIntentService(_client);
                var paymentIntent = await paymentIntentService.GetAsync(
                    request.TransactionId,
                    cancellationToken: cancellationToken);

                refundOptions.Amount = ConvertToStripeAmount(request.Amount.Value, paymentIntent.Currency);
            }

            // Add metadata
            if (request.Metadata is not null)
            {
                refundOptions.Metadata = request.Metadata;
            }

            var refund = await refundService.CreateAsync(refundOptions, cancellationToken: cancellationToken);

            return RefundResult.Successful(
                refundTransactionId: refund.Id,
                amount: ConvertFromStripeAmount(refund.Amount, refund.Currency));
        }
        catch (StripeException ex)
        {
            return RefundResult.Failure(
                errorMessage: ex.Message,
                errorCode: ex.StripeError?.Code);
        }
    }

    // =====================================================
    // Webhooks
    // =====================================================

    /// <inheritdoc />
    public override Task<bool> ValidateWebhookAsync(
        string payload,
        IDictionary<string, string> headers,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_webhookSecret))
        {
            return Task.FromResult(false);
        }

        try
        {
            // Get the Stripe-Signature header
            if (!headers.TryGetValue("Stripe-Signature", out var signature) &&
                !headers.TryGetValue("stripe-signature", out signature))
            {
                return Task.FromResult(false);
            }

            // Validate the signature - this throws if invalid
            EventUtility.ConstructEvent(payload, signature, _webhookSecret);
            return Task.FromResult(true);
        }
        catch (StripeException)
        {
            return Task.FromResult(false);
        }
    }

    /// <inheritdoc />
    public override async Task<WebhookProcessingResult> ProcessWebhookAsync(
        string payload,
        IDictionary<string, string> headers,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_webhookSecret))
        {
            return WebhookProcessingResult.Failure("Webhook secret not configured.");
        }

        try
        {
            // Get signature header
            if (!headers.TryGetValue("Stripe-Signature", out var signature) &&
                !headers.TryGetValue("stripe-signature", out signature))
            {
                return WebhookProcessingResult.Failure("Missing Stripe-Signature header.");
            }

            // Parse and validate the event
            var stripeEvent = EventUtility.ConstructEvent(payload, signature, _webhookSecret);

            return await ProcessStripeEventAsync(stripeEvent, cancellationToken);
        }
        catch (StripeException ex)
        {
            return WebhookProcessingResult.Failure($"Stripe error: {ex.Message}");
        }
    }

    /// <summary>
    /// Process a validated Stripe event.
    /// </summary>
    private async Task<WebhookProcessingResult> ProcessStripeEventAsync(Event stripeEvent, CancellationToken cancellationToken)
    {
        switch (stripeEvent.Type)
        {
            case "checkout.session.completed":
                return await HandleCheckoutSessionCompletedAsync(stripeEvent, cancellationToken);

            case "payment_intent.succeeded":
                return await HandlePaymentIntentSucceededAsync(stripeEvent, cancellationToken);

            case "payment_intent.payment_failed":
                return HandlePaymentIntentFailed(stripeEvent);

            case "charge.refunded":
                return HandleChargeRefunded(stripeEvent);

            case "charge.dispute.created":
                return HandleDisputeCreated(stripeEvent);

            case "charge.dispute.closed":
                return HandleDisputeClosed(stripeEvent);

            default:
                // Acknowledge but don't process unknown events
                return WebhookProcessingResult.Successful(
                    WebhookEventType.Unknown,
                    transactionId: stripeEvent.Id);
        }
    }

    private async Task<WebhookProcessingResult> HandleCheckoutSessionCompletedAsync(Event stripeEvent, CancellationToken cancellationToken)
    {
        var session = stripeEvent.Data.Object as Session;
        if (session is null)
        {
            return WebhookProcessingResult.Failure("Could not parse checkout session.");
        }

        // Extract invoice ID from metadata
        Guid? invoiceId = null;
        if (session.Metadata?.TryGetValue("invoiceId", out var invoiceIdStr) == true &&
            Guid.TryParse(invoiceIdStr, out var parsedInvoiceId))
        {
            invoiceId = parsedInvoiceId;
        }

        // Use PaymentIntent ID as the transaction ID for refunds/captures
        var transactionId = session.PaymentIntentId ?? session.Id;

        var chargeInfo = await TryGetChargeInfoAsync(transactionId, cancellationToken);

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.PaymentCompleted,
            transactionId: transactionId,
            invoiceId: invoiceId,
            amount: session.AmountTotal.HasValue
                ? ConvertFromStripeAmount(session.AmountTotal.Value, session.Currency)
                : null,
            settlementCurrency: chargeInfo.SettlementCurrency,
            settlementExchangeRate: chargeInfo.SettlementExchangeRate,
            settlementAmount: chargeInfo.SettlementAmount,
            riskScore: chargeInfo.RiskScore,
            riskScoreSource: chargeInfo.RiskScoreSource);
    }

    private async Task<WebhookProcessingResult> HandlePaymentIntentSucceededAsync(Event stripeEvent, CancellationToken cancellationToken)
    {
        var paymentIntent = stripeEvent.Data.Object as PaymentIntent;
        if (paymentIntent is null)
        {
            return WebhookProcessingResult.Failure("Could not parse payment intent.");
        }

        // Extract invoice ID from metadata
        Guid? invoiceId = null;
        if (paymentIntent.Metadata?.TryGetValue("invoiceId", out var invoiceIdStr) == true &&
            Guid.TryParse(invoiceIdStr, out var parsedInvoiceId))
        {
            invoiceId = parsedInvoiceId;
        }

        var chargeInfo = await TryGetChargeInfoAsync(paymentIntent.Id, cancellationToken);

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.PaymentCompleted,
            transactionId: paymentIntent.Id,
            invoiceId: invoiceId,
            amount: ConvertFromStripeAmount(paymentIntent.Amount, paymentIntent.Currency),
            settlementCurrency: chargeInfo.SettlementCurrency,
            settlementExchangeRate: chargeInfo.SettlementExchangeRate,
            settlementAmount: chargeInfo.SettlementAmount,
            riskScore: chargeInfo.RiskScore,
            riskScoreSource: chargeInfo.RiskScoreSource);
    }

    private WebhookProcessingResult HandlePaymentIntentFailed(Event stripeEvent)
    {
        var paymentIntent = stripeEvent.Data.Object as PaymentIntent;
        if (paymentIntent is null)
        {
            return WebhookProcessingResult.Failure("Could not parse payment intent.");
        }

        // Extract invoice ID from metadata
        Guid? invoiceId = null;
        if (paymentIntent.Metadata?.TryGetValue("invoiceId", out var invoiceIdStr) == true &&
            Guid.TryParse(invoiceIdStr, out var parsedInvoiceId))
        {
            invoiceId = parsedInvoiceId;
        }

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.PaymentFailed,
            transactionId: paymentIntent.Id,
            invoiceId: invoiceId);
    }

    private WebhookProcessingResult HandleChargeRefunded(Event stripeEvent)
    {
        var charge = stripeEvent.Data.Object as Charge;
        if (charge is null)
        {
            return WebhookProcessingResult.Failure("Could not parse charge.");
        }

        // Get the latest refund from the charge
        var refund = charge.Refunds?.Data?.FirstOrDefault();
        var refundAmount = refund?.Amount ?? charge.AmountRefunded;

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.RefundCompleted,
            transactionId: refund?.Id ?? charge.Id,
            amount: ConvertFromStripeAmount(refundAmount, charge.Currency));
    }

    private WebhookProcessingResult HandleDisputeCreated(Event stripeEvent)
    {
        var dispute = stripeEvent.Data.Object as Dispute;
        if (dispute is null)
        {
            return WebhookProcessingResult.Failure("Could not parse dispute.");
        }

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.DisputeOpened,
            transactionId: dispute.Id,
            amount: ConvertFromStripeAmount(dispute.Amount, dispute.Currency));
    }

    private WebhookProcessingResult HandleDisputeClosed(Event stripeEvent)
    {
        var dispute = stripeEvent.Data.Object as Dispute;
        if (dispute is null)
        {
            return WebhookProcessingResult.Failure("Could not parse dispute.");
        }

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.DisputeResolved,
            transactionId: dispute.Id,
            amount: ConvertFromStripeAmount(dispute.Amount, dispute.Currency));
    }

    // =====================================================
    // Helpers
    // =====================================================

    /// <summary>
    /// Converts a decimal amount to Stripe's smallest currency unit (e.g., cents).
    /// </summary>
    private long ConvertToStripeAmount(decimal amount, string currency)
        => _currencyService.ToMinorUnits(amount, currency);

    /// <summary>
    /// Converts Stripe's smallest currency unit back to decimal.
    /// Uses USD as safe default if currency is null (handles 0/2/3 decimal currencies correctly).
    /// </summary>
    private decimal ConvertFromStripeAmount(long amount, string? currency)
        => _currencyService.FromMinorUnits(amount, currency ?? "USD");

    /// <summary>
    /// Settlement and risk data returned from charge lookup.
    /// </summary>
    private record ChargeInfo(
        string? SettlementCurrency,
        decimal? SettlementExchangeRate,
        decimal? SettlementAmount,
        decimal? RiskScore,
        string? RiskScoreSource);

    private async Task<ChargeInfo> TryGetChargeInfoAsync(
        string paymentIntentId,
        CancellationToken cancellationToken)
    {
        if (_client is null || string.IsNullOrWhiteSpace(paymentIntentId))
        {
            return new ChargeInfo(null, null, null, null, null);
        }

        try
        {
            var paymentIntentService = new PaymentIntentService(_client);
            var paymentIntent = await paymentIntentService.GetAsync(paymentIntentId, cancellationToken: cancellationToken);

            var chargeId = paymentIntent.LatestChargeId;

            if (string.IsNullOrWhiteSpace(chargeId))
            {
                return new ChargeInfo(null, null, null, null, null);
            }

            var chargeService = new ChargeService(_client);
            var charge = await chargeService.GetAsync(chargeId, new ChargeGetOptions
            {
                Expand = ["balance_transaction"]
            }, cancellationToken: cancellationToken);

            // Extract settlement info from balance transaction
            var balance = charge.BalanceTransaction;
            var settlementCurrency = balance?.Currency;
            var settlementExchangeRate = balance?.ExchangeRate;
            var settlementAmount = balance != null && !string.IsNullOrWhiteSpace(balance.Currency)
                ? _currencyService.FromMinorUnits(balance.Net, balance.Currency)
                : (decimal?)null;

            // Extract risk info from charge outcome (Stripe Radar)
            var outcome = charge.Outcome;
            var riskScore = MapStripeRiskScore(outcome?.RiskScore, outcome?.RiskLevel);
            var riskScoreSource = riskScore.HasValue ? "stripe-radar" : null;

            return new ChargeInfo(
                settlementCurrency,
                settlementExchangeRate,
                settlementAmount,
                riskScore,
                riskScoreSource);
        }
        catch
        {
            return new ChargeInfo(null, null, null, null, null);
        }
    }

    /// <summary>
    /// Maps a refund reason string to Stripe's reason enum.
    /// </summary>
    private static string? MapRefundReason(string? reason)
    {
        if (string.IsNullOrEmpty(reason))
        {
            return null;
        }

        // Stripe accepts: duplicate, fraudulent, requested_by_customer
        return reason.ToLowerInvariant() switch
        {
            "duplicate" => "duplicate",
            "fraud" or "fraudulent" => "fraudulent",
            _ => "requested_by_customer"
        };
    }

    /// <summary>
    /// Maps Stripe Radar risk data to our 0-100 scale.
    /// Uses actual risk_score when available (Radar for Fraud Teams subscription),
    /// otherwise maps risk_level to approximate score.
    /// </summary>
    /// <param name="riskScore">The numeric risk score from Stripe (0-99), requires Radar for Fraud Teams.</param>
    /// <param name="riskLevel">The risk level string from Stripe (normal, elevated, highest).</param>
    /// <returns>Risk score on 0-100 scale, or null if no risk data available.</returns>
    private static decimal? MapStripeRiskScore(long? riskScore, string? riskLevel)
    {
        // If we have the actual numeric score (Radar for Fraud Teams), use it
        // Stripe uses 0-99 scale, we use 0-100, so convert directly with defensive clamp
        if (riskScore.HasValue)
        {
            return Math.Min(riskScore.Value, 100);
        }

        // Otherwise, map the risk_level to approximate scores
        // These levels are always available with Stripe Radar (free)
        return riskLevel?.ToLowerInvariant() switch
        {
            "normal" => 10m,
            "elevated" => 60m,
            "highest" => 90m,
            _ => null
        };
    }
}
