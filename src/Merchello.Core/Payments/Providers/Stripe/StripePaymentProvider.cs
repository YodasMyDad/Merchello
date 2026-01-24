using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shared.Providers;
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
    /// URL to the Stripe payment adapter script (unified Payment Element).
    /// </summary>
    private const string StripePaymentAdapterUrl = "/js/checkout/adapters/stripe-payment-adapter.js";

    /// <summary>
    /// URL to the Stripe card elements adapter script (individual card fields).
    /// </summary>
    private const string StripeCardElementsAdapterUrl = "/js/checkout/adapters/stripe-card-elements-adapter.js";

    /// <summary>
    /// SVG icon for card payments (credit card symbol).
    /// </summary>
    private const string CardIconSvg = """<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 9h20" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="13" width="5" height="2" rx="0.5" fill="currentColor" opacity="0.5"/></svg>""";

    /// <summary>
    /// SVG icon for Apple Pay (Apple logo only).
    /// </summary>
    private const string ApplePayIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="currentColor"/></svg>""";

    /// <summary>
    /// SVG icon for Google Pay (colored G logo only).
    /// </summary>
    private const string GooglePayIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>""";

    /// <summary>
    /// SVG icon for Link (Stripe's one-click checkout - green badge with chain link symbol).
    /// </summary>
    private const string LinkIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#00D66F"/><path d="M13.5 8.5a3 3 0 0 1 0 4.24l-1.42 1.42a3 3 0 0 1-4.24-4.24l.7-.7" stroke="white" stroke-width="1.5" stroke-linecap="round"/><path d="M10.5 15.5a3 3 0 0 1 0-4.24l1.42-1.42a3 3 0 0 1 4.24 4.24l-.7.7" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>""";

    /// <summary>
    /// SVG icon for Amazon Pay (Amazon smile logo).
    /// </summary>
    private const string AmazonPayIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.7-3.182v.685zm3.186 7.705a.657.657 0 01-.745.074c-1.047-.87-1.235-1.272-1.812-2.101-1.729 1.764-2.953 2.29-5.191 2.29-2.652 0-4.714-1.636-4.714-4.91 0-2.558 1.386-4.297 3.358-5.148 1.71-.752 4.099-.886 5.922-1.094v-.41c0-.752.058-1.643-.383-2.294-.385-.578-1.124-.816-1.774-.816-1.205 0-2.277.618-2.539 1.897-.054.283-.263.562-.551.576l-3.083-.333c-.26-.057-.548-.266-.473-.66C5.89 1.96 8.585.75 11.021.75c1.246 0 2.876.331 3.858 1.275 1.247 1.163 1.127 2.713 1.127 4.404v3.989c0 1.199.498 1.726.966 2.374.164.232.201.51-.009.681-.525.436-1.456 1.249-1.968 1.704l-.15.118z" fill="#FF9900"/><path d="M21.533 18.504c-2.055 1.544-5.034 2.367-7.598 2.367-3.595 0-6.835-1.33-9.282-3.547-.193-.174-.021-.413.21-.277 2.643 1.54 5.913 2.465 9.289 2.465 2.279 0 4.782-.472 7.088-1.452.347-.147.64.229.293.444z" fill="#FF9900"/><path d="M22.375 17.541c-.262-.338-1.74-.159-2.403-.08-.201.024-.232-.152-.051-.28 1.176-.828 3.106-.589 3.332-.312.227.279-.059 2.21-1.162 3.131-.17.142-.332.066-.256-.12.249-.618.805-2.001.54-2.339z" fill="#FF9900"/></svg>""";

    /// <summary>
    /// SVG icon for PayPal (PayPal logo).
    /// </summary>
    private const string PayPalIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944 3.217a.775.775 0 01.765-.645h6.23c2.072 0 3.56.505 4.42 1.502.812.94 1.086 2.294.815 4.026l-.02.123v.635l.468.265c.399.214.717.468.96.762.39.477.633 1.085.722 1.803.092.735.034 1.607-.172 2.595-.238 1.14-.622 2.13-1.142 2.94-.48.75-1.068 1.37-1.749 1.845-.65.455-1.413.8-2.27 1.023-.833.218-1.772.33-2.79.33H9.75a.96.96 0 00-.946.8l-.026.149-.413 2.62-.021.106a.96.96 0 01-.948.8H7.076z" fill="#253B80"/><path d="M18.27 7.555c-.012.078-.026.158-.043.239-.553 2.838-2.446 3.82-4.865 3.82h-1.23a.598.598 0 00-.59.507l-.628 3.985-.178 1.128a.313.313 0 00.31.363h2.171c.26 0 .48-.19.52-.447l.02-.114.413-2.617.027-.144a.524.524 0 01.517-.447h.326c2.108 0 3.758-.857 4.24-3.336.201-1.035.337-1.946.273-2.624-.087-.93-.512-1.522-1.283-1.913z" fill="#179BD7"/><path d="M17.315 7.173a4.488 4.488 0 00-.562-.124 7.165 7.165 0 00-1.136-.083h-3.445a.521.521 0 00-.516.447l-.733 4.648-.021.136a.598.598 0 01.59-.507h1.23c2.42 0 4.313-.982 4.866-3.82.016-.084.03-.166.042-.247a2.856 2.856 0 00-.315-.45z" fill="#222D65"/><path d="M8.003 7.413a.521.521 0 01.516-.447h3.445c.408 0 .79.027 1.136.083.195.032.384.073.562.124.18.052.349.112.506.181.195-1.244.323-2.742-.147-3.678-.518-1.032-1.698-1.466-3.569-1.466H4.22a.601.601 0 00-.593.507L.543 20.055a.361.361 0 00.357.418h2.6l.653-4.141.733-4.648 1.117-7.07z" fill="#253B80"/></svg>""";

    /// <summary>
    /// SVG icon for Klarna (Klarna logo - pink badge).
    /// </summary>
    private const string KlarnaIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#FFB3C7"/><path d="M6.5 7h1.875c0 1.522-.655 2.916-1.736 3.893L9.5 15H7.25l-2.25-3.25V15H3.5V7h1.5v3.25C5.5 9.25 6.5 8.25 6.5 7zm5.75 0h1.5v8h-1.5V7zm3 6.5a1 1 0 112 0 1 1 0 01-2 0zM17.5 7h1.5v8h-1.5V7z" fill="#0A0B09"/></svg>""";

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
        SupportsPaymentLinks = true,
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
               - `charge.dispute.created`
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
            MethodType = PaymentMethodTypes.Cards
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
            MethodType = PaymentMethodTypes.Cards
        },
        new PaymentMethodDefinition
        {
            Alias = "cards-hosted",
            DisplayName = "Credit/Debit Card (Hosted Fields)",
            Icon = "icon-credit-card",
            IconHtml = CardIconSvg,
            Description = "Individual hosted fields for card number, expiry, and CVC with per-field styling.",
            IntegrationType = PaymentIntegrationType.HostedFields,
            IsExpressCheckout = false,
            DefaultSortOrder = 15,
            MethodType = PaymentMethodTypes.Cards
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
            MethodType = PaymentMethodTypes.ApplePay
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
            MethodType = PaymentMethodTypes.GooglePay
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
            MethodType = PaymentMethodTypes.Link
        },
        new PaymentMethodDefinition
        {
            Alias = "amazonpay",
            DisplayName = "Amazon Pay",
            Icon = "icon-amazon",
            IconHtml = AmazonPayIconSvg,
            Description = "Fast, secure checkout with your Amazon account.",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 3,
            MethodType = PaymentMethodTypes.AmazonPay
        },
        new PaymentMethodDefinition
        {
            Alias = "paypal",
            DisplayName = "PayPal",
            Icon = "icon-paypal",
            IconHtml = PayPalIconSvg,
            Description = "Pay securely with your PayPal account.",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 4,
            MethodType = PaymentMethodTypes.PayPal
        },
        new PaymentMethodDefinition
        {
            Alias = "klarna",
            DisplayName = "Klarna",
            Icon = "icon-klarna",
            IconHtml = KlarnaIconSvg,
            Description = "Buy now, pay later with Klarna.",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 5,
            MethodType = PaymentMethodTypes.BuyNowPayLater
        }
    ];

    /// <inheritdoc />
    public override ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
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
            "cards-hosted" => await CreateCardElementsSessionAsync(request, cancellationToken),
            "applepay" or "googlepay" or "link" or "amazonpay" or "paypal" or "klarna" => await CreateExpressCheckoutSessionAsync(request, cancellationToken),
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
    /// Creates a PaymentIntent for individual Card Elements (cards-hosted method).
    /// Returns configuration for the frontend with individual cardNumber, cardExpiry, cardCvc elements.
    /// Equivalent to Braintree's Hosted Fields approach.
    /// </summary>
    private async Task<PaymentSessionResult> CreateCardElementsSessionAsync(
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

            // Return HostedFields result with adapter configuration for individual Card Elements
            return PaymentSessionResult.HostedFields(
                providerAlias: Metadata.Alias,
                methodAlias: "cards-hosted",
                adapterUrl: StripeCardElementsAdapterUrl,
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
            "amazonpay" => "amazon_pay",
            "paypal" => "paypal",
            "klarna" => "klarna",
            _ => null
        };

        // Get method type for frontend
        var methodType = methodAlias.ToLowerInvariant() switch
        {
            "applepay" => PaymentMethodTypes.ApplePay,
            "googlepay" => PaymentMethodTypes.GooglePay,
            "link" => PaymentMethodTypes.Link,
            "amazonpay" => PaymentMethodTypes.AmazonPay,
            "paypal" => PaymentMethodTypes.PayPal,
            "klarna" => PaymentMethodTypes.BuyNowPayLater,
            _ => (string?)null
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
        // Check if this is a test webhook (skip validation requested)
        var skipValidation = headers
            .Any(h => string.Equals(h.Key, "X-Merchello-Skip-Validation", StringComparison.OrdinalIgnoreCase) &&
                      string.Equals(h.Value, "true", StringComparison.OrdinalIgnoreCase));

        if (skipValidation)
        {
            return ProcessTestWebhook(payload);
        }

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
    /// Process a test webhook payload (without signature validation).
    /// Parses the JSON payload directly.
    /// </summary>
    private static WebhookProcessingResult ProcessTestWebhook(string payload)
    {
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(payload);
            var root = doc.RootElement;

            // Extract event type
            var eventType = root.GetProperty("type").GetString();
            if (string.IsNullOrEmpty(eventType))
            {
                return WebhookProcessingResult.Failure("Could not parse event type from test payload.");
            }

            // Extract transaction/payment intent ID if present
            string? transactionId = null;
            decimal? amount = null;

            if (root.TryGetProperty("data", out var data) &&
                data.TryGetProperty("object", out var obj))
            {
                if (obj.TryGetProperty("id", out var idProp))
                {
                    transactionId = idProp.GetString();
                }
                if (obj.TryGetProperty("amount", out var amountProp))
                {
                    // Stripe amounts are in cents
                    amount = amountProp.GetInt64() / 100m;
                }
            }

            transactionId ??= $"test_{DateTime.UtcNow:yyyyMMddHHmmss}";

            // Map Stripe event type to Merchello event type
            var merchelloEventType = eventType switch
            {
                "checkout.session.completed" or "payment_intent.succeeded" => WebhookEventType.PaymentCompleted,
                "payment_intent.payment_failed" => WebhookEventType.PaymentFailed,
                "charge.refunded" => WebhookEventType.RefundCompleted,
                "charge.dispute.created" => WebhookEventType.DisputeOpened,
                "charge.dispute.closed" => WebhookEventType.DisputeResolved,
                _ => WebhookEventType.Unknown
            };

            return WebhookProcessingResult.Successful(
                eventType: merchelloEventType,
                transactionId: transactionId,
                amount: amount);
        }
        catch (Exception ex)
        {
            return WebhookProcessingResult.Failure($"Failed to parse test webhook: {ex.Message}");
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
    // Webhook Testing (Simulation)
    // =====================================================

    /// <inheritdoc />
    /// <remarks>
    /// Returns the Stripe webhook events that can be simulated for testing.
    /// These match the events configured in the Stripe webhook endpoint.
    /// </remarks>
    public override ValueTask<IReadOnlyList<WebhookEventTemplate>> GetWebhookEventTemplatesAsync(
        CancellationToken cancellationToken = default)
    {
        List<WebhookEventTemplate> templates =
        [
            new()
            {
                EventType = "checkout.session.completed",
                DisplayName = "Checkout Session Completed",
                Description = "Fired when a customer completes a Stripe Checkout session. Used for redirect-based payments.",
                Category = WebhookEventCategory.Payment,
                MerchelloEventType = WebhookEventType.PaymentCompleted
            },
            new()
            {
                EventType = "payment_intent.succeeded",
                DisplayName = "Payment Intent Succeeded",
                Description = "Fired when a PaymentIntent is successfully confirmed. Used for Payment Element and Express Checkout.",
                Category = WebhookEventCategory.Payment,
                MerchelloEventType = WebhookEventType.PaymentCompleted
            },
            new()
            {
                EventType = "payment_intent.payment_failed",
                DisplayName = "Payment Intent Failed",
                Description = "Fired when a payment attempt fails due to card decline, insufficient funds, or other errors.",
                Category = WebhookEventCategory.Payment,
                MerchelloEventType = WebhookEventType.PaymentFailed
            },
            new()
            {
                EventType = "charge.refunded",
                DisplayName = "Charge Refunded",
                Description = "Fired when a charge is refunded (full or partial). Contains refund details.",
                Category = WebhookEventCategory.Refund,
                MerchelloEventType = WebhookEventType.RefundCompleted
            },
            new()
            {
                EventType = "charge.dispute.created",
                DisplayName = "Dispute Created",
                Description = "Fired when a customer initiates a chargeback/dispute. Requires merchant response.",
                Category = WebhookEventCategory.Dispute,
                MerchelloEventType = WebhookEventType.DisputeOpened
            },
            new()
            {
                EventType = "charge.dispute.closed",
                DisplayName = "Dispute Closed",
                Description = "Fired when a dispute is resolved (won, lost, or withdrawn by customer).",
                Category = WebhookEventCategory.Dispute,
                MerchelloEventType = WebhookEventType.DisputeResolved
            }
        ];

        return ValueTask.FromResult<IReadOnlyList<WebhookEventTemplate>>(templates);
    }

    /// <inheritdoc />
    /// <remarks>
    /// Generates a realistic Stripe webhook payload for testing.
    /// The payload format matches Stripe's actual webhook format.
    /// See: https://stripe.com/docs/webhooks#webhook-endpoint-def
    /// </remarks>
    public override ValueTask<(string Payload, IDictionary<string, string> Headers)> GenerateTestWebhookPayloadAsync(
        TestWebhookParameters parameters,
        CancellationToken cancellationToken = default)
    {
        // If custom payload provided, use it directly
        if (!string.IsNullOrWhiteSpace(parameters.CustomPayload))
        {
            return ValueTask.FromResult<(string, IDictionary<string, string>)>((
                parameters.CustomPayload,
                new Dictionary<string, string>
                {
                    ["Stripe-Signature"] = "test_signature_for_simulation"
                }));
        }

        // Generate appropriate payload based on event type
        var transactionId = parameters.TransactionId ?? $"pi_test_{Guid.NewGuid():N}";
        var invoiceId = parameters.InvoiceId ?? Guid.NewGuid();
        var amount = ConvertToStripeAmount(parameters.Amount, parameters.Currency);
        var currency = parameters.Currency.ToLowerInvariant();
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        var dataObject = parameters.EventType switch
        {
            "checkout.session.completed" => GenerateCheckoutSessionPayload(transactionId, invoiceId, amount, currency),
            "payment_intent.succeeded" => GeneratePaymentIntentPayload(transactionId, invoiceId, amount, currency, "succeeded"),
            "payment_intent.payment_failed" => GeneratePaymentIntentPayload(transactionId, invoiceId, amount, currency, "requires_payment_method"),
            "charge.refunded" => GenerateChargeRefundedPayload(transactionId, amount, currency),
            "charge.dispute.created" => GenerateDisputePayload(transactionId, amount, currency, "needs_response"),
            "charge.dispute.closed" => GenerateDisputePayload(transactionId, amount, currency, "won"),
            _ => GeneratePaymentIntentPayload(transactionId, invoiceId, amount, currency, "succeeded")
        };

        // Build the complete webhook event structure
        var payload = $$"""
            {
                "id": "evt_test_{{Guid.NewGuid():N}}",
                "object": "event",
                "api_version": "2024-12-18.acacia",
                "created": {{timestamp}},
                "data": {
                    "object": {{dataObject}}
                },
                "livemode": false,
                "pending_webhooks": 1,
                "request": {
                    "id": "req_test_{{Guid.NewGuid():N}}",
                    "idempotency_key": null
                },
                "type": "{{parameters.EventType}}"
            }
            """;

        var headers = new Dictionary<string, string>
        {
            ["Stripe-Signature"] = $"t={timestamp},v1=test_signature_for_simulation",
            ["Content-Type"] = "application/json"
        };

        return ValueTask.FromResult<(string, IDictionary<string, string>)>((payload, headers));
    }

    private static string GenerateCheckoutSessionPayload(string transactionId, Guid invoiceId, long amount, string currency)
    {
        var sessionId = $"cs_test_{Guid.NewGuid():N}";
        return $$"""
            {
                "id": "{{sessionId}}",
                "object": "checkout.session",
                "amount_subtotal": {{amount}},
                "amount_total": {{amount}},
                "currency": "{{currency}}",
                "customer_email": "test@example.com",
                "metadata": {
                    "invoiceId": "{{invoiceId}}",
                    "source": "merchello"
                },
                "mode": "payment",
                "payment_intent": "{{transactionId}}",
                "payment_status": "paid",
                "status": "complete",
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel"
            }
            """;
    }

    private static string GeneratePaymentIntentPayload(string transactionId, Guid invoiceId, long amount, string currency, string status)
    {
        return $$"""
            {
                "id": "{{transactionId}}",
                "object": "payment_intent",
                "amount": {{amount}},
                "amount_received": {{(status == "succeeded" ? amount : 0)}},
                "currency": "{{currency}}",
                "description": "Invoice #{{invoiceId}}",
                "metadata": {
                    "invoiceId": "{{invoiceId}}",
                    "source": "merchello"
                },
                "payment_method": "pm_test_{{Guid.NewGuid():N}}",
                "status": "{{status}}",
                "latest_charge": "ch_test_{{Guid.NewGuid():N}}"
            }
            """;
    }

    private static string GenerateChargeRefundedPayload(string transactionId, long amount, string currency)
    {
        var chargeId = $"ch_test_{Guid.NewGuid():N}";
        var refundId = $"re_test_{Guid.NewGuid():N}";
        return $$"""
            {
                "id": "{{chargeId}}",
                "object": "charge",
                "amount": {{amount}},
                "amount_refunded": {{amount}},
                "currency": "{{currency}}",
                "payment_intent": "{{transactionId}}",
                "refunded": true,
                "refunds": {
                    "object": "list",
                    "data": [
                        {
                            "id": "{{refundId}}",
                            "object": "refund",
                            "amount": {{amount}},
                            "currency": "{{currency}}",
                            "reason": "requested_by_customer",
                            "status": "succeeded"
                        }
                    ],
                    "has_more": false,
                    "total_count": 1
                },
                "status": "succeeded"
            }
            """;
    }

    private static string GenerateDisputePayload(string transactionId, long amount, string currency, string status)
    {
        var disputeId = $"dp_test_{Guid.NewGuid():N}";
        var chargeId = $"ch_test_{Guid.NewGuid():N}";
        return $$"""
            {
                "id": "{{disputeId}}",
                "object": "dispute",
                "amount": {{amount}},
                "charge": "{{chargeId}}",
                "currency": "{{currency}}",
                "payment_intent": "{{transactionId}}",
                "reason": "fraudulent",
                "status": "{{status}}",
                "evidence_details": {
                    "due_by": {{DateTimeOffset.UtcNow.AddDays(21).ToUnixTimeSeconds()}},
                    "has_evidence": false,
                    "submission_count": 0
                }
            }
            """;
    }

    // =====================================================
    // Payment Links
    // =====================================================

    /// <inheritdoc />
    /// <remarks>
    /// Creates a Stripe Payment Link that can be shared with customers.
    /// Uses Stripe's Payment Links API: https://docs.stripe.com/payment-links/api
    /// </remarks>
    public override async Task<PaymentLinkResult> CreatePaymentLinkAsync(
        PaymentLinkRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_client is null)
        {
            return PaymentLinkResult.Failed("Stripe is not configured. Please add your API keys.");
        }

        try
        {
            // First, create a Price for the payment (required for Payment Links)
            var priceService = new PriceService(_client);
            var priceOptions = new PriceCreateOptions
            {
                Currency = request.Currency.ToLowerInvariant(),
                UnitAmount = ConvertToStripeAmount(request.Amount, request.Currency),
                ProductData = new PriceProductDataOptions
                {
                    Name = request.Description ?? "Invoice Payment"
                }
            };

            var price = await priceService.CreateAsync(priceOptions, cancellationToken: cancellationToken);

            // Create the Payment Link
            var paymentLinkService = new PaymentLinkService(_client);
            var linkOptions = new PaymentLinkCreateOptions
            {
                LineItems =
                [
                    new PaymentLinkLineItemOptions
                    {
                        Price = price.Id,
                        Quantity = 1
                    }
                ],
                Metadata = new Dictionary<string, string>
                {
                    ["invoiceId"] = request.InvoiceId.ToString(),
                    ["source"] = "merchello-payment-link"
                },
                AfterCompletion = new PaymentLinkAfterCompletionOptions
                {
                    Type = "hosted_confirmation"
                }
            };

            // Add customer email if provided (for pre-filling checkout)
            if (!string.IsNullOrEmpty(request.CustomerEmail))
            {
                // Payment Links auto-collect customer info by default
            }

            // Merge any additional metadata from request
            if (request.Metadata is not null)
            {
                foreach (var kvp in request.Metadata)
                {
                    linkOptions.Metadata[kvp.Key] = kvp.Value;
                }
            }

            var paymentLink = await paymentLinkService.CreateAsync(
                linkOptions,
                cancellationToken: cancellationToken);

            return PaymentLinkResult.Created(
                paymentUrl: paymentLink.Url,
                providerLinkId: paymentLink.Id);
        }
        catch (StripeException ex)
        {
            return PaymentLinkResult.Failed(ex.Message, ex.StripeError?.Code);
        }
    }

    /// <inheritdoc />
    /// <remarks>
    /// Deactivates a Stripe Payment Link by setting Active = false.
    /// The link URL will show an expiration message to customers.
    /// </remarks>
    public override async Task<bool> DeactivatePaymentLinkAsync(
        string providerLinkId,
        CancellationToken cancellationToken = default)
    {
        if (_client is null)
        {
            return false;
        }

        try
        {
            var paymentLinkService = new PaymentLinkService(_client);
            await paymentLinkService.UpdateAsync(
                providerLinkId,
                new PaymentLinkUpdateOptions { Active = false },
                cancellationToken: cancellationToken);
            return true;
        }
        catch (StripeException)
        {
            return false;
        }
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
