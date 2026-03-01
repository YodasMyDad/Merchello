using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shared.Providers;
using Microsoft.Extensions.Logging;
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
public class StripePaymentProvider(
    ICurrencyService currencyService,
    ILogger<StripePaymentProvider> logger) : PaymentProviderBase
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
    private const string StripePaymentAdapterUrl = "/App_Plugins/Merchello/js/checkout/adapters/stripe-payment-adapter.js";

    /// <summary>
    /// URL to the Stripe card elements adapter script (individual card fields).
    /// </summary>
    private const string StripeCardElementsAdapterUrl = "/App_Plugins/Merchello/js/checkout/adapters/stripe-card-elements-adapter.js";

    /// <summary>
    /// SVG icon for card payments (credit card symbol).
    /// </summary>
    private const string CardIconSvg = """<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 9h20" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="13" width="5" height="2" rx="0.5" fill="currentColor" opacity="0.5"/></svg>""";

    /// <inheritdoc />
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "stripe",
        DisplayName = "Stripe",
        Icon = "icon-credit-card",
        IconHtml = ProviderBrandLogoCatalog.Stripe,
        Description = "Accept payments via Stripe. Supports credit cards, Apple Pay, Google Pay, and more.",
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        SupportsAuthAndCapture = true,
        RequiresWebhook = true,
        SupportsPaymentLinks = true,
        SupportsVaultedPayments = true,
        RequiresProviderCustomerId = true,
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
            IconHtml = ProviderBrandLogoCatalog.ApplePay,
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
            IconHtml = ProviderBrandLogoCatalog.GooglePay,
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
            IconHtml = ProviderBrandLogoCatalog.LinkByStripe,
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
            IconHtml = ProviderBrandLogoCatalog.AmazonPay,
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
            IconHtml = ProviderBrandLogoCatalog.PayPal,
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
            IconHtml = ProviderBrandLogoCatalog.Klarna,
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
                SuccessUrl = BuildCheckoutReturnUrl(request.ReturnUrl, request.InvoiceId),
                CancelUrl = BuildCheckoutReturnUrl(request.CancelUrl, request.InvoiceId),
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
    /// Builds a return URL for Stripe Checkout sessions with query parameters for payment correlation.
    /// Appends invoiceId, provider alias, and Stripe's {CHECKOUT_SESSION_ID} template variable
    /// which Stripe replaces with the actual session ID on redirect.
    /// </summary>
    private string BuildCheckoutReturnUrl(string url, Guid invoiceId)
    {
        var separator = url.Contains('?') ? "&" : "?";
        return $"{url}{separator}invoiceId={invoiceId}&provider={Uri.EscapeDataString(Metadata.Alias)}&sessionId={{CHECKOUT_SESSION_ID}}";
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
    public override async Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_client is null)
        {
            return PaymentResult.Failed("Stripe is not configured.");
        }

        var paymentIntentId = request.PaymentMethodToken ?? request.SessionId;
        if (string.IsNullOrWhiteSpace(paymentIntentId))
        {
            return PaymentResult.Failed("PaymentIntent ID is required.");
        }

        try
        {
            var paymentIntentService = new PaymentIntentService(_client);
            var paymentIntent = await paymentIntentService.GetAsync(
                paymentIntentId,
                new PaymentIntentGetOptions { Expand = ["payment_method"] },
                cancellationToken: cancellationToken);

            // Build vaulted method details if requested
            VaultConfirmResult? vaultDetails = null;
            if (request.SavePaymentMethod)
            {
                if (request.CustomerId.HasValue && !string.IsNullOrWhiteSpace(request.CustomerEmail))
                {
                    var stripeCustomerId = await GetOrCreateStripeCustomerAsync(
                        request.CustomerId.Value,
                        request.CustomerEmail,
                        request.CustomerName,
                        cancellationToken);

                    var paymentMethodService = new PaymentMethodService(_client);
                    var paymentMethod = paymentIntent.PaymentMethod as PaymentMethod;

                    if (paymentMethod is null && !string.IsNullOrEmpty(paymentIntent.PaymentMethodId))
                    {
                        paymentMethod = await paymentMethodService.GetAsync(
                            paymentIntent.PaymentMethodId,
                            cancellationToken: cancellationToken);
                    }

                    if (paymentMethod != null)
                    {
                        if (string.IsNullOrEmpty(paymentMethod.CustomerId))
                        {
                            try
                            {
                                await paymentMethodService.AttachAsync(
                                    paymentMethod.Id,
                                    new PaymentMethodAttachOptions { Customer = stripeCustomerId },
                                    cancellationToken: cancellationToken);
                            }
                            catch (StripeException)
                            {
                                // Ignore attach failures (already attached or not attachable)
                            }
                        }

                        var card = paymentMethod.Card;
                        vaultDetails = new VaultConfirmResult
                        {
                            Success = true,
                            ProviderMethodId = paymentMethod.Id,
                            ProviderCustomerId = stripeCustomerId,
                            MethodType = card != null ? SavedPaymentMethodType.Card : SavedPaymentMethodType.Other,
                            CardBrand = card?.Brand,
                            Last4 = card?.Last4,
                            ExpiryMonth = (int?)card?.ExpMonth,
                            ExpiryYear = (int?)card?.ExpYear,
                            DisplayLabel = card != null
                                ? $"{FormatCardBrand(card.Brand)} ending in {card.Last4}"
                                : paymentMethod.Type ?? "Saved payment method",
                            ExtendedData = card == null
                                ? null
                                : new Dictionary<string, object>
                                {
                                    ["fingerprint"] = card.Fingerprint ?? string.Empty,
                                    ["funding"] = card.Funding ?? string.Empty,
                                    ["country"] = card.Country ?? string.Empty
                                }
                        };
                    }
                }
            }

            var status = paymentIntent.Status?.ToLowerInvariant();
            if (status is "requires_payment_method" or "canceled")
            {
                return PaymentResult.Failed($"Payment failed with status: {paymentIntent.Status}");
            }

            // For redirect-based providers and Payment Element, confirmation comes via webhook.
            // Return pending status - the webhook will update the payment to completed.
            return new PaymentResult
            {
                Success = true,
                TransactionId = paymentIntent.Id,
                Amount = request.Amount,
                Status = PaymentResultStatus.Pending,
                VaultedMethodDetails = vaultDetails
            };
        }
        catch (StripeException ex)
        {
            return PaymentResult.Failed(ex.Message, ex.StripeError?.Code);
        }
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
            CustomAdapterUrl = "/App_Plugins/Merchello/js/checkout/adapters/stripe-express-adapter.js",
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
            logger.LogWarning("Stripe webhook validation failed: webhook secret is not configured");
            return Task.FromResult(false);
        }

        try
        {
            // Get the Stripe-Signature header
            if (!headers.TryGetValue("Stripe-Signature", out var signature) &&
                !headers.TryGetValue("stripe-signature", out signature))
            {
                logger.LogWarning("Stripe webhook validation failed: Stripe-Signature header not found. Headers: {Headers}",
                    string.Join(", ", headers.Keys));
                return Task.FromResult(false);
            }

            // Validate the signature - this throws if invalid
            EventUtility.ConstructEvent(payload, signature, _webhookSecret, throwOnApiVersionMismatch: false);
            return Task.FromResult(true);
        }
        catch (StripeException ex)
        {
            logger.LogWarning(ex, "Stripe webhook signature validation failed: {Message}", ex.Message);
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
            var stripeEvent = EventUtility.ConstructEvent(payload, signature, _webhookSecret, throwOnApiVersionMismatch: false);

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

    // =====================================================
    // Vaulted Payments
    // =====================================================

    /// <inheritdoc />
    /// <remarks>
    /// Creates a Stripe SetupIntent for saving a payment method without charging.
    /// Uses the SetupIntents API: https://docs.stripe.com/api/setup_intents
    /// </remarks>
    public override async Task<VaultSetupResult> CreateVaultSetupSessionAsync(
        VaultSetupRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.CustomerId == Guid.Empty)
        {
            return VaultSetupResult.Failed("CustomerId is required.");
        }

        if (string.IsNullOrWhiteSpace(request.CustomerEmail))
        {
            return VaultSetupResult.Failed("CustomerEmail is required.");
        }

        if (_client is null)
        {
            return VaultSetupResult.Failed("Stripe is not configured. Please add your API keys.");
        }

        try
        {
            // First, get or create a Stripe Customer for this Merchello customer
            var stripeCustomerId = await GetOrCreateStripeCustomerAsync(
                request.CustomerId,
                request.CustomerEmail,
                request.CustomerName,
                cancellationToken);

            // Create a SetupIntent for saving the payment method
            var setupIntentService = new SetupIntentService(_client);
            var options = new SetupIntentCreateOptions
            {
                Customer = stripeCustomerId,
                PaymentMethodTypes = ["card"],
                Usage = "off_session", // Important: enables off-session charges
                Metadata = new Dictionary<string, string>
                {
                    ["merchelloCustomerId"] = request.CustomerId.ToString(),
                    ["source"] = "merchello-vault"
                }
            };

            var setupIntent = await setupIntentService.CreateAsync(options, cancellationToken: cancellationToken);

            return new VaultSetupResult
            {
                Success = true,
                SetupSessionId = setupIntent.Id,
                ClientSecret = setupIntent.ClientSecret,
                ProviderCustomerId = stripeCustomerId,
                SdkConfig = new Dictionary<string, object>
                {
                    ["publishableKey"] = _publishableKey ?? string.Empty,
                    ["returnUrl"] = request.ReturnUrl ?? string.Empty
                }
            };
        }
        catch (StripeException ex)
        {
            return VaultSetupResult.Failed(ex.Message);
        }
    }

    /// <inheritdoc />
    /// <remarks>
    /// Confirms a SetupIntent and retrieves the saved payment method details.
    /// The SetupIntent should have been confirmed client-side via stripe.confirmCardSetup().
    /// </remarks>
    public override async Task<VaultConfirmResult> ConfirmVaultSetupAsync(
        VaultConfirmRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.SetupSessionId))
        {
            return VaultConfirmResult.Failed("SetupSessionId is required.");
        }

        if (_client is null)
        {
            return VaultConfirmResult.Failed("Stripe is not configured.");
        }

        try
        {
            // Retrieve the SetupIntent to get the payment method
            var setupIntentService = new SetupIntentService(_client);
            var setupIntent = await setupIntentService.GetAsync(
                request.SetupSessionId,
                new SetupIntentGetOptions { Expand = ["payment_method"] },
                cancellationToken: cancellationToken);

            // If not confirmed yet and a payment method was provided (test flow), confirm server-side
            if (setupIntent.Status != "succeeded" && !string.IsNullOrWhiteSpace(request.PaymentMethodToken))
            {
                setupIntent = await setupIntentService.ConfirmAsync(
                    request.SetupSessionId,
                    new SetupIntentConfirmOptions
                    {
                        PaymentMethod = request.PaymentMethodToken
                    },
                    cancellationToken: cancellationToken);

                // Ensure payment method details are expanded
                if (setupIntent.PaymentMethod is null && !string.IsNullOrEmpty(setupIntent.PaymentMethodId))
                {
                    setupIntent = await setupIntentService.GetAsync(
                        request.SetupSessionId,
                        new SetupIntentGetOptions { Expand = ["payment_method"] },
                        cancellationToken: cancellationToken);
                }
            }

            if (setupIntent.Status != "succeeded")
            {
                return VaultConfirmResult.Failed($"SetupIntent not completed. Status: {setupIntent.Status}");
            }

            var paymentMethod = setupIntent.PaymentMethod;
            if (paymentMethod is null)
            {
                return VaultConfirmResult.Failed("No payment method attached to SetupIntent.");
            }

            // Extract card details
            var card = paymentMethod.Card;

            return new VaultConfirmResult
            {
                Success = true,
                ProviderMethodId = paymentMethod.Id,
                ProviderCustomerId = setupIntent.CustomerId,
                MethodType = SavedPaymentMethodType.Card,
                CardBrand = card?.Brand,
                Last4 = card?.Last4,
                ExpiryMonth = (int?)card?.ExpMonth,
                ExpiryYear = (int?)card?.ExpYear,
                DisplayLabel = $"{FormatCardBrand(card?.Brand)} ending in {card?.Last4}",
                ExtendedData = new Dictionary<string, object>
                {
                    ["fingerprint"] = card?.Fingerprint ?? string.Empty,
                    ["funding"] = card?.Funding ?? string.Empty,
                    ["country"] = card?.Country ?? string.Empty
                }
            };
        }
        catch (StripeException ex)
        {
            return VaultConfirmResult.Failed(ex.Message);
        }
    }

    /// <inheritdoc />
    /// <remarks>
    /// Charges a saved payment method off-session using the PaymentIntents API.
    /// Uses off-session confirmation: https://docs.stripe.com/payments/save-and-reuse
    /// </remarks>
    public override async Task<PaymentResult> ChargeVaultedMethodAsync(
        ChargeVaultedMethodRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ProviderMethodId))
        {
            return PaymentResult.Failed("ProviderMethodId is required.");
        }

        if (string.IsNullOrWhiteSpace(request.ProviderCustomerId))
        {
            return PaymentResult.Failed("ProviderCustomerId is required for Stripe vaulted charges.");
        }

        if (request.Amount <= 0)
        {
            return PaymentResult.Failed("Amount must be greater than zero.");
        }

        if (string.IsNullOrWhiteSpace(request.CurrencyCode))
        {
            return PaymentResult.Failed("CurrencyCode is required.");
        }

        if (_client is null)
        {
            return PaymentResult.Failed("Stripe is not configured.");
        }

        try
        {
            var paymentIntentService = new PaymentIntentService(_client);

            var options = new PaymentIntentCreateOptions
            {
                Amount = ConvertToStripeAmount(request.Amount, request.CurrencyCode),
                Currency = request.CurrencyCode.ToLowerInvariant(),
                Customer = request.ProviderCustomerId,
                PaymentMethod = request.ProviderMethodId,
                OffSession = true, // Critical for off-session charges
                Confirm = true,    // Immediately confirm the payment
                Description = request.Description ?? $"Invoice #{request.InvoiceId}",
                Metadata = new Dictionary<string, string>
                {
                    ["invoiceId"] = request.InvoiceId.ToString(),
                    ["merchelloCustomerId"] = request.CustomerId.ToString(),
                    ["source"] = "merchello-vaulted"
                }
            };

            // Add idempotency key if provided
            var requestOptions = new RequestOptions();
            if (!string.IsNullOrEmpty(request.IdempotencyKey))
            {
                requestOptions.IdempotencyKey = request.IdempotencyKey;
            }

            var paymentIntent = await paymentIntentService.CreateAsync(
                options, requestOptions, cancellationToken);

            return paymentIntent.Status switch
            {
                "succeeded" => PaymentResult.Completed(paymentIntent.Id, request.Amount),
                "processing" => PaymentResult.Pending(paymentIntent.Id, request.Amount),
                "requires_action" => new PaymentResult
                {
                    Success = false,
                    Status = PaymentResultStatus.RequiresAction,
                    TransactionId = paymentIntent.Id,
                    ErrorMessage = "Payment requires additional authentication. Customer must complete payment on-session."
                },
                _ => PaymentResult.Failed($"Payment failed with status: {paymentIntent.Status}")
            };
        }
        catch (StripeException ex)
        {
            // Handle authentication required errors specially
            if (ex.StripeError?.Code == "authentication_required")
            {
                return new PaymentResult
                {
                    Success = false,
                    Status = PaymentResultStatus.RequiresAction,
                    ErrorMessage = "This payment requires additional authentication. Customer must complete payment on-session.",
                    ErrorCode = ex.StripeError.Code
                };
            }

            return PaymentResult.Failed(ex.Message, ex.StripeError?.Code);
        }
    }

    /// <inheritdoc />
    /// <remarks>
    /// Detaches a payment method from a Stripe customer.
    /// See: https://docs.stripe.com/api/payment_methods/detach
    /// </remarks>
    public override async Task<bool> DeleteVaultedMethodAsync(
        string providerMethodId,
        string? providerCustomerId = null,
        CancellationToken cancellationToken = default)
    {
        if (_client is null)
        {
            return false;
        }

        try
        {
            var paymentMethodService = new PaymentMethodService(_client);
            await paymentMethodService.DetachAsync(providerMethodId, cancellationToken: cancellationToken);
            return true;
        }
        catch (StripeException)
        {
            return false;
        }
    }

    /// <summary>
    /// Gets or creates a Stripe Customer for the given Merchello customer.
    /// </summary>
    private async Task<string> GetOrCreateStripeCustomerAsync(
        Guid merchelloCustomerId,
        string email,
        string? name,
        CancellationToken cancellationToken)
    {
        var customerService = new CustomerService(_client);

        // Search for existing customer by Merchello ID in metadata
        var searchResults = await customerService.SearchAsync(new CustomerSearchOptions
        {
            Query = $"metadata['merchelloCustomerId']:'{merchelloCustomerId}'"
        }, cancellationToken: cancellationToken);

        if (searchResults.Data.Count > 0)
        {
            return searchResults.Data[0].Id;
        }

        // Also try searching by email as a fallback
        var emailSearch = await customerService.SearchAsync(new CustomerSearchOptions
        {
            Query = $"email:'{email}'"
        }, cancellationToken: cancellationToken);

        if (emailSearch.Data.Count > 0)
        {
            // Update existing customer with Merchello ID
            var existingCustomer = emailSearch.Data[0];
            await customerService.UpdateAsync(existingCustomer.Id, new CustomerUpdateOptions
            {
                Metadata = new Dictionary<string, string>
                {
                    ["merchelloCustomerId"] = merchelloCustomerId.ToString()
                }
            }, cancellationToken: cancellationToken);
            return existingCustomer.Id;
        }

        // Create new customer
        var newCustomer = await customerService.CreateAsync(new CustomerCreateOptions
        {
            Email = email,
            Name = name,
            Metadata = new Dictionary<string, string>
            {
                ["merchelloCustomerId"] = merchelloCustomerId.ToString(),
                ["source"] = "merchello"
            }
        }, cancellationToken: cancellationToken);

        return newCustomer.Id;
    }

    /// <summary>
    /// Format a card brand for display.
    /// </summary>
    private static string FormatCardBrand(string? brand) => brand?.ToLowerInvariant() switch
    {
        "visa" => "Visa",
        "mastercard" => "Mastercard",
        "amex" or "american_express" => "American Express",
        "discover" => "Discover",
        "diners" or "diners_club" => "Diners Club",
        "jcb" => "JCB",
        "unionpay" => "UnionPay",
        _ => brand ?? "Card"
    };
}
