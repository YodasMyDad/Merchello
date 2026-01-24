using Braintree;
using Braintree.Exceptions;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Providers;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Payments.Providers.Braintree;

/// <summary>
/// Braintree payment provider supporting credit cards via HostedFields,
/// PayPal, Apple Pay, and Google Pay as express checkout options.
/// </summary>
/// <remarks>
/// Configuration required:
/// - merchantId: Braintree Merchant ID
/// - publicKey: Braintree Public Key
/// - privateKey: Braintree Private Key
/// - merchantAccountId: (Optional) Merchant Account ID for multi-currency
///
/// Webhook endpoint: /umbraco/merchello/webhooks/payments/braintree
/// Required webhook events: TransactionSettled, TransactionSettlementDeclined, DisputeOpened
/// </remarks>
public class BraintreePaymentProvider(ILogger<BraintreePaymentProvider> logger) : PaymentProviderBase
{
    private BraintreeGateway? _gateway;
    private string? _merchantId;
    private string? _merchantAccountId;

    /// <summary>
    /// URL to the Braintree payment adapter script (cards).
    /// </summary>
    private const string BraintreePaymentAdapterUrl = "/js/checkout/adapters/braintree-payment-adapter.js";

    /// <summary>
    /// URL to the Braintree local payment adapter script.
    /// </summary>
    private const string BraintreeLocalPaymentAdapterUrl = "/js/checkout/adapters/braintree-local-payment-adapter.js";

    /// <summary>
    /// Local payment method aliases that use the local payment SDK.
    /// </summary>
    private static readonly HashSet<string> LocalPaymentAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        "ideal", "bancontact", "sepa", "eps", "p24"
    };

    /// <summary>
    /// SVG icon for card payments (credit card symbol).
    /// </summary>
    private const string CardIconSvg = """<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 9h20" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="13" width="5" height="2" rx="0.5" fill="currentColor" opacity="0.5"/></svg>""";

    /// <summary>
    /// SVG icon for PayPal (PP logo symbol only).
    /// </summary>
    private const string PayPalIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" fill="#003087"/><path d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132l-1.41 8.95a.568.568 0 0 0 .562.655h3.94c.578 0 1.069-.42 1.16-.99l.045-.24.92-5.815.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.658-1.377z" fill="#0070E0"/></svg>""";

    /// <summary>
    /// SVG icon for Apple Pay (Apple logo only).
    /// </summary>
    private const string ApplePayIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="currentColor"/></svg>""";

    /// <summary>
    /// SVG icon for Google Pay (colored G logo only).
    /// </summary>
    private const string GooglePayIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>""";

    /// <summary>
    /// SVG icon for Venmo (V symbol only).
    /// </summary>
    private const string VenmoIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.5 1c.87 1.44 1.26 2.92 1.26 4.8 0 5.98-5.1 13.75-9.24 19.2H4.2L1 2.85l6.24-.6 1.86 14.9C11.04 13.5 13.2 8.18 13.2 5.08c0-1.74-.3-2.92-.78-3.9L19.5 1z" fill="#3D95CE"/></svg>""";

    /// <summary>
    /// SVG icon for iDEAL (Netherlands - stylized bank symbol).
    /// </summary>
    private const string IdealIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#CC0066"/><path d="M12 8v8M8 12h8" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>""";

    /// <summary>
    /// SVG icon for Bancontact (Belgium - interlocking circles).
    /// </summary>
    private const string BancontactIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#005498"/><circle cx="9" cy="12" r="4" fill="none" stroke="#FFD800" stroke-width="1.5"/><circle cx="15" cy="12" r="4" fill="none" stroke="#FFD800" stroke-width="1.5"/></svg>""";

    /// <summary>
    /// SVG icon for SEPA (EU - euro stars symbol).
    /// </summary>
    private const string SepaIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#003399"/><circle cx="12" cy="12" r="5" fill="none" stroke="#FFCC00" stroke-width="1.5"/><path d="M7 12h10" stroke="#FFCC00" stroke-width="1"/></svg>""";

    /// <summary>
    /// SVG icon for EPS (Austria - bank symbol).
    /// </summary>
    private const string EpsIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#C8202F"/><path d="M6 16V10l6-4 6 4v6" stroke="white" stroke-width="1.5" fill="none"/><rect x="10" y="12" width="4" height="4" fill="white"/></svg>""";

    /// <summary>
    /// SVG icon for P24 (Poland - stylized P symbol).
    /// </summary>
    private const string P24IconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#D13239"/><path d="M8 8h4a3 3 0 0 1 0 6H8V8zm0 6v4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>""";

    /// <inheritdoc />
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "braintree",
        DisplayName = "Braintree",
        Icon = "icon-credit-card",
        Description = "Accept payments via Braintree. Supports credit cards, PayPal, Apple Pay, Google Pay, and Venmo.",
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        SupportsAuthAndCapture = true,
        RequiresWebhook = true,
        SetupInstructions = """
            ## Braintree Setup Instructions

            ### 1. Create Sandbox Account

            1. Go to [sandbox.braintreegateway.com](https://sandbox.braintreegateway.com)
            2. Sign up for a free sandbox account
            3. After login, go to **Settings → API** to get your credentials

            ### 2. Get API Credentials

            From the API settings page, copy:
            - **Merchant ID**: Your sandbox merchant ID
            - **Public Key**: Your sandbox public key
            - **Private Key**: Your sandbox private key (click to reveal)

            ### 3. Configure Webhooks

            1. Go to **Settings → Webhooks**
            2. Click **Create new webhook**
            3. Enter your webhook URL:
               ```
               https://your-site.com/umbraco/merchello/webhooks/payments/braintree
               ```
            4. Select these events:
               - `Transaction: Settled`
               - `Transaction: Settlement Declined`
               - `Dispute: Opened`
               - `Dispute: Lost`
               - `Dispute: Won`
               - `Local Payment: Completed` (if using iDEAL, Bancontact, etc.)
               - `Local Payment: Reversed` (if using local payment methods)
               - `Local Payment: Expired` (if using local payment methods)
            5. Click **Create**

            ### 4. Enable PayPal (Optional)

            1. Go to **Settings → Processing → PayPal**
            2. Click **Link a PayPal Sandbox Account**
            3. Log in with your PayPal sandbox credentials
            4. Once linked, PayPal will appear as a payment option

            ### 5. Enable Apple Pay (Optional)

            Apple Pay requires additional setup:
            1. Register your domain with Apple
            2. Upload the domain verification file
            3. Contact Braintree support for merchant verification
            4. Configure your Apple Pay merchant ID in the Control Panel

            ### 6. Enable Google Pay (Optional)

            1. Go to **Settings → Processing → Google Pay**
            2. Enable for sandbox testing (works immediately)
            3. For production, complete Google Pay merchant registration at pay.google.com

            ### 7. Enable Venmo (US Only, Optional)

            Venmo is available for US merchants only:
            1. Go to **Settings → Processing → Venmo**
            2. Enable Venmo in your Braintree Control Panel
            3. For sandbox, Venmo works with test accounts
            4. For production, your Braintree account must be approved for Venmo

            ### 8. Enable Local Payment Methods (EU, Optional)

            Local payment methods (iDEAL, Bancontact, SEPA, EPS, P24) require:
            1. A PayPal business account linked to Braintree
            2. Go to **Settings → Processing → PayPal** and link your account
            3. Local payment methods are automatically enabled once PayPal is linked
            4. Note: These methods require EUR currency support in your merchant account

            ### 9. Test Card Numbers

            **Basic test cards** (any future expiry, any 3-digit CVV):

            | Card Number | Result |
            |-------------|--------|
            | `4111 1111 1111 1111` | Successful transaction (no 3DS) |
            | `4000 1111 1111 1115` | Processor Declined |
            | `5555 5555 5555 4444` | Mastercard success |
            | `378282246310005` | American Express success |

            **3D Secure test cards** (use expiry month `01` and any future year, e.g. `01/29`):

            | Card Number | Result |
            |-------------|--------|
            | `4000 0000 0000 2503` | 3DS challenge popup (Visa) |
            | `5200 0000 0000 2151` | 3DS challenge popup (Mastercard) |
            | `4000 0000 0000 2701` | 3DS success, no challenge (frictionless) |
            | `4000 0000 0000 2925` | 3DS authentication failed |

            ### 10. Test PayPal Accounts

            Use PayPal sandbox buyer accounts from the PayPal Developer Dashboard:
            - Create sandbox accounts at developer.paypal.com
            - Use the buyer email/password in the PayPal popup

            ### 11. Going Live

            1. Complete your Braintree production application
            2. Get production API credentials from the production Control Panel
            3. Create a new webhook endpoint for your production URL
            4. Update the configuration with production keys
            5. Uncheck **Test Mode** in the provider settings
            """
    };

    /// <inheritdoc />
    public override IReadOnlyList<PaymentMethodDefinition> GetAvailablePaymentMethods() =>
    [
        new PaymentMethodDefinition
        {
            Alias = "cards",
            DisplayName = "Credit/Debit Card",
            Icon = "icon-credit-card",
            IconHtml = CardIconSvg,
            // Checkout icon: credit card with sizing classes
            CheckoutIconHtml = """<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 9h20" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="13" width="5" height="2" rx="0.5" fill="currentColor" opacity="0.5"/></svg>""",
            Description = "Pay with Visa, Mastercard, American Express, Discover, and more.",
            IntegrationType = PaymentIntegrationType.HostedFields,
            IsExpressCheckout = false,
            DefaultSortOrder = 10,
            MethodType = PaymentMethodTypes.Cards
        },
        new PaymentMethodDefinition
        {
            Alias = "paypal",
            DisplayName = "PayPal",
            Icon = "icon-paypal",
            IconHtml = PayPalIconSvg,
            Description = "Fast, secure checkout with your PayPal account.",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 0,
            MethodType = PaymentMethodTypes.PayPal
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
            DefaultSortOrder = 1,
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
            DefaultSortOrder = 2,
            MethodType = PaymentMethodTypes.GooglePay
        },
        new PaymentMethodDefinition
        {
            Alias = "venmo",
            DisplayName = "Venmo",
            Icon = "icon-venmo",
            IconHtml = VenmoIconSvg,
            Description = "Pay with your Venmo account (US only).",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 3,
            MethodType = PaymentMethodTypes.Venmo,
            SupportedRegions = [new PaymentMethodRegion { Code = "US", Name = "United States" }]
        },
        // Local Payment Methods (EU) - use Widget type as they require Braintree SDK
        // Each uses null MethodType because they are region-specific and should NOT deduplicate
        // (a Belgian customer needs Bancontact, a Dutch customer needs iDEAL - both should show)
        new PaymentMethodDefinition
        {
            Alias = "ideal",
            DisplayName = "iDEAL",
            Icon = "icon-bank",
            IconHtml = IdealIconSvg,
            Description = "Pay with iDEAL (Netherlands).",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = false,
            DefaultSortOrder = 20,
            MethodType = null, // Region-specific, no deduplication
            SupportedRegions = [new PaymentMethodRegion { Code = "NL", Name = "Netherlands" }]
        },
        new PaymentMethodDefinition
        {
            Alias = "bancontact",
            DisplayName = "Bancontact",
            Icon = "icon-bank",
            IconHtml = BancontactIconSvg,
            Description = "Pay with Bancontact (Belgium).",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = false,
            DefaultSortOrder = 21,
            MethodType = null, // Region-specific, no deduplication
            SupportedRegions = [new PaymentMethodRegion { Code = "BE", Name = "Belgium" }]
        },
        new PaymentMethodDefinition
        {
            Alias = "sepa",
            DisplayName = "SEPA Direct Debit",
            Icon = "icon-bank",
            IconHtml = SepaIconSvg,
            Description = "Pay with SEPA Direct Debit (EU).",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = false,
            DefaultSortOrder = 22,
            MethodType = null, // Region-specific, no deduplication
            SupportedRegions = [new PaymentMethodRegion { Code = "EU", Name = "European Union" }]
        },
        new PaymentMethodDefinition
        {
            Alias = "eps",
            DisplayName = "eps",
            Icon = "icon-bank",
            IconHtml = EpsIconSvg,
            Description = "Pay with eps (Austria).",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = false,
            DefaultSortOrder = 23,
            MethodType = null, // Region-specific, no deduplication
            SupportedRegions = [new PaymentMethodRegion { Code = "AT", Name = "Austria" }]
        },
        new PaymentMethodDefinition
        {
            Alias = "p24",
            DisplayName = "Przelewy24",
            Icon = "icon-bank",
            IconHtml = P24IconSvg,
            Description = "Pay with Przelewy24 (Poland).",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = false,
            DefaultSortOrder = 24,
            MethodType = null, // Region-specific, no deduplication
            SupportedRegions = [new PaymentMethodRegion { Code = "PL", Name = "Poland" }]
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
                Key = "merchantId",
                Label = "Merchant ID",
                Description = "Your Braintree Merchant ID (found in Settings → API)",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                Placeholder = "abc123def456"
            },
            new()
            {
                Key = "publicKey",
                Label = "Public Key",
                Description = "Your Braintree Public Key (found in Settings → API)",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                Placeholder = "abc123def456"
            },
            new()
            {
                Key = "privateKey",
                Label = "Private Key",
                Description = "Your Braintree Private Key (found in Settings → API)",
                FieldType = ConfigurationFieldType.Password,
                IsSensitive = true,
                IsRequired = true,
                Placeholder = "abc123def456..."
            },
            new()
            {
                Key = "merchantAccountId",
                Label = "Merchant Account ID",
                Description = "Optional: Specific merchant account for multi-currency processing",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                Placeholder = "Leave blank to use default"
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

        _merchantId = configuration?.GetValue("merchantId");
        var publicKey = configuration?.GetValue("publicKey");
        var privateKey = configuration?.GetValue("privateKey");
        _merchantAccountId = configuration?.GetValue("merchantAccountId");

        if (!string.IsNullOrEmpty(_merchantId) &&
            !string.IsNullOrEmpty(publicKey) &&
            !string.IsNullOrEmpty(privateKey))
        {
            _gateway = new BraintreeGateway
            {
                Environment = IsTestMode
                    ? global::Braintree.Environment.SANDBOX
                    : global::Braintree.Environment.PRODUCTION,
                MerchantId = _merchantId,
                PublicKey = publicKey,
                PrivateKey = privateKey
            };
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
        if (_gateway is null)
        {
            return PaymentSessionResult.Failed("Braintree is not configured. Please add your API credentials.");
        }

        try
        {
            // Generate client token for the frontend SDK
            var clientTokenRequest = new ClientTokenRequest();

            // If we have a merchant account ID, include it for multi-currency
            if (!string.IsNullOrEmpty(_merchantAccountId))
            {
                clientTokenRequest.MerchantAccountId = _merchantAccountId;
            }

            var clientToken = await _gateway.ClientToken.GenerateAsync(clientTokenRequest);
            var methodAlias = request.MethodAlias ?? "cards";

            // Route to appropriate session type based on method
            if (LocalPaymentAliases.Contains(methodAlias))
            {
                return CreateLocalPaymentSession(clientToken, request, methodAlias);
            }

            // Default: Return session with adapter configuration for Braintree Hosted Fields (cards)
            // SDK version 3.134.0 (latest as of 2025)
            return PaymentSessionResult.HostedFields(
                providerAlias: Metadata.Alias,
                methodAlias: methodAlias,
                adapterUrl: BraintreePaymentAdapterUrl,
                jsSdkUrl: "https://js.braintreegateway.com/web/3.134.0/js/client.min.js",
                sdkConfig: new Dictionary<string, object>
                {
                    // SDK component URLs (v3.134.0)
                    ["hostedFieldsSdkUrl"] = "https://js.braintreegateway.com/web/3.134.0/js/hosted-fields.min.js",
                    ["threeDSecureSdkUrl"] = "https://js.braintreegateway.com/web/3.134.0/js/three-d-secure.min.js",
                    ["dataCollectorSdkUrl"] = "https://js.braintreegateway.com/web/3.134.0/js/data-collector.min.js",

                    // Enable 3D Secure
                    ["threeDSecureEnabled"] = true,

                    // Hosted Fields configuration
                    ["fields"] = new Dictionary<string, object>
                    {
                        ["number"] = new Dictionary<string, object> { ["placeholder"] = "Card Number" },
                        ["cvv"] = new Dictionary<string, object> { ["placeholder"] = "CVV" },
                        ["expirationDate"] = new Dictionary<string, object> { ["placeholder"] = "MM/YY" },
                        ["cardholderName"] = new Dictionary<string, object> { ["placeholder"] = "Name on Card" }
                    },

                    // Default styles for Hosted Fields (customizable)
                    ["styles"] = new Dictionary<string, object>
                    {
                        ["input"] = new Dictionary<string, object>
                        {
                            ["font-size"] = "16px",
                            ["font-family"] = "system-ui, -apple-system, sans-serif",
                            ["color"] = "#1f2937",
                            ["line-height"] = "1.5"
                        },
                        ["input:focus"] = new Dictionary<string, object>
                        {
                            ["color"] = "#111827"
                        },
                        [".valid"] = new Dictionary<string, object>
                        {
                            ["color"] = "#059669"
                        },
                        [".invalid"] = new Dictionary<string, object>
                        {
                            ["color"] = "#dc2626"
                        },
                        ["::-webkit-input-placeholder"] = new Dictionary<string, object>
                        {
                            ["color"] = "#9ca3af"
                        },
                        ["::placeholder"] = new Dictionary<string, object>
                        {
                            ["color"] = "#9ca3af"
                        }
                    },

                    // Payment amount info for frontend (needed for 3D Secure)
                    ["amount"] = request.Amount,
                    ["currency"] = request.Currency,
                    ["invoiceId"] = request.InvoiceId.ToString()
                },
                clientToken: clientToken,
                sessionId: request.InvoiceId.ToString());
        }
        catch (AuthenticationException ex)
        {
            return PaymentSessionResult.Failed($"Authentication failed: {ex.Message}");
        }
        catch (AuthorizationException ex)
        {
            return PaymentSessionResult.Failed($"Authorization failed: {ex.Message}");
        }
        catch (ConfigurationException ex)
        {
            return PaymentSessionResult.Failed($"Configuration error: {ex.Message}");
        }
        catch (Exception ex)
        {
            return PaymentSessionResult.Failed(ex.Message);
        }
    }

    /// <summary>
    /// Creates a payment session for local payment methods (iDEAL, Bancontact, SEPA, EPS, P24).
    /// </summary>
    private PaymentSessionResult CreateLocalPaymentSession(string clientToken, PaymentRequest request, string methodAlias)
    {
        return PaymentSessionResult.Widget(
            providerAlias: Metadata.Alias,
            methodAlias: methodAlias,
            adapterUrl: BraintreeLocalPaymentAdapterUrl,
            jsSdkUrl: "https://js.braintreegateway.com/web/3.134.0/js/client.min.js",
            sdkConfig: new Dictionary<string, object>
            {
                // SDK component URLs (v3.134.0)
                ["localPaymentSdkUrl"] = "https://js.braintreegateway.com/web/3.134.0/js/local-payment.min.js",
                ["dataCollectorSdkUrl"] = "https://js.braintreegateway.com/web/3.134.0/js/data-collector.min.js",

                // Merchant account for multi-currency
                ["merchantAccountId"] = _merchantAccountId ?? "",

                // Payment amount info
                ["amount"] = request.Amount,
                ["currency"] = request.Currency,
                ["invoiceId"] = request.InvoiceId.ToString(),

                // Return URLs for redirect flow
                ["returnUrl"] = request.ReturnUrl ?? "",
                ["cancelUrl"] = request.CancelUrl ?? ""
            },
            clientToken: clientToken,
            sessionId: request.InvoiceId.ToString());
    }

    /// <inheritdoc />
    public override async Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_gateway is null)
        {
            return PaymentResult.Failed("Braintree is not configured.");
        }

        if (string.IsNullOrEmpty(request.PaymentMethodToken))
        {
            return PaymentResult.Failed("Payment method nonce is required.");
        }

        try
        {
            var transactionRequest = new TransactionRequest
            {
                Amount = request.Amount ?? 0,
                PaymentMethodNonce = request.PaymentMethodToken,
                Options = new TransactionOptionsRequest
                {
                    SubmitForSettlement = true // Capture immediately
                }
            };

            // Add merchant account if configured
            if (!string.IsNullOrEmpty(_merchantAccountId))
            {
                transactionRequest.MerchantAccountId = _merchantAccountId;
            }

            // Add device data for fraud protection if provided
            if (request.FormData?.TryGetValue("deviceData", out var deviceData) == true)
            {
                transactionRequest.DeviceData = deviceData;
            }

            var result = await _gateway.Transaction.SaleAsync(transactionRequest);

            if (result.IsSuccess())
            {
                var transaction = result.Target;
                var riskScore = MapBraintreeRiskScore(transaction.RiskData);

                return new PaymentResult
                {
                    Success = true,
                    TransactionId = transaction.Id,
                    Amount = transaction.Amount ?? request.Amount ?? 0,
                    Status = PaymentResultStatus.Completed,
                    RiskScore = riskScore,
                    RiskScoreSource = riskScore.HasValue ? "braintree-advanced-fraud" : null
                };
            }

            // Handle validation errors
            if (result.Errors?.Count > 0)
            {
                var errorMessages = result.Errors.DeepAll()
                    .Select(e => e.Message)
                    .ToList();
                return PaymentResult.Failed(string.Join("; ", errorMessages));
            }

            // Handle transaction errors
            if (result.Transaction != null)
            {
                return PaymentResult.Failed(
                    $"Transaction {result.Transaction.Status}: {result.Message}");
            }

            return PaymentResult.Failed(result.Message);
        }
        catch (AuthenticationException ex)
        {
            return PaymentResult.Failed($"Authentication failed: {ex.Message}");
        }
        catch (AuthorizationException ex)
        {
            return PaymentResult.Failed($"Authorization failed: {ex.Message}");
        }
        catch (NotFoundException)
        {
            return PaymentResult.Failed("Transaction not found.");
        }
        catch (Exception ex)
        {
            return PaymentResult.Failed(ex.Message);
        }
    }

    // =====================================================
    // Express Checkout
    // =====================================================

    /// <summary>
    /// URL to the Braintree express checkout adapter script.
    /// </summary>
    private const string BraintreeExpressAdapterUrl = "/js/checkout/adapters/braintree-express-adapter.js";

    /// <inheritdoc />
    /// <remarks>
    /// Returns native Braintree SDK configuration for express checkout methods (PayPal, Apple Pay, Google Pay).
    /// Each method uses its own dedicated SDK for optimal customization and control.
    /// </remarks>
    public override async Task<ExpressCheckoutClientConfig?> GetExpressCheckoutClientConfigAsync(
        string methodAlias,
        decimal amount,
        string currency,
        CancellationToken cancellationToken = default)
    {
        // Express checkout requires configured gateway
        if (_gateway is null)
        {
            return null;
        }

        // Only provide config for express checkout methods
        var method = GetAvailablePaymentMethods()
            .FirstOrDefault(m => string.Equals(m.Alias, methodAlias, StringComparison.OrdinalIgnoreCase));

        if (method is not { IsExpressCheckout: true })
        {
            return null;
        }

        try
        {
            // Generate client token for frontend SDK
            var clientTokenRequest = new ClientTokenRequest();
            if (!string.IsNullOrEmpty(_merchantAccountId))
            {
                clientTokenRequest.MerchantAccountId = _merchantAccountId;
            }

            var clientToken = await _gateway.ClientToken.GenerateAsync(clientTokenRequest);

            // Map method alias to SDK URL
            var sdkUrl = method.Alias.ToLowerInvariant() switch
            {
                "paypal" => "https://js.braintreegateway.com/web/3.134.0/js/paypal-checkout.min.js",
                "applepay" => "https://js.braintreegateway.com/web/3.134.0/js/apple-pay.min.js",
                "googlepay" => "https://js.braintreegateway.com/web/3.134.0/js/google-payment.min.js",
                "venmo" => "https://js.braintreegateway.com/web/3.134.0/js/venmo.min.js",
                _ => null
            };

            return new ExpressCheckoutClientConfig
            {
                ProviderAlias = Metadata.Alias,
                MethodAlias = methodAlias,
                MethodType = method.MethodType,
                SdkUrl = sdkUrl,
                CustomAdapterUrl = BraintreeExpressAdapterUrl,
                SdkConfig = new Dictionary<string, object>
                {
                    ["clientToken"] = clientToken,
                    ["clientSdkUrl"] = "https://js.braintreegateway.com/web/3.134.0/js/client.min.js",
                    ["dataCollectorSdkUrl"] = "https://js.braintreegateway.com/web/3.134.0/js/data-collector.min.js",
                    ["googlePayScriptUrl"] = "https://pay.google.com/gp/p/js/pay.js",
                    ["displayName"] = Configuration?.GetValue("merchantAccountId") ?? "Store",
                    ["googleMerchantId"] = _merchantId ?? "",
                    ["isTestMode"] = IsTestMode,
                    ["environment"] = IsTestMode ? "TEST" : "PRODUCTION",
                    ["amount"] = amount,
                    ["currency"] = currency,
                    // Venmo-specific options
                    ["allowDesktop"] = true,
                    ["allowDesktopWebLogin"] = true,
                    ["mobileWebFallBack"] = true,
                    ["paymentMethodUsage"] = "multi_use"
                },
                IsAvailable = true
            };
        }
        catch (Exception ex)
        {
            // If token generation fails, express checkout is not available
            logger.LogWarning(ex, "Failed to generate Braintree client token for express checkout method {MethodAlias}", methodAlias);
            return null;
        }
    }

    /// <inheritdoc />
    public override async Task<ExpressCheckoutResult> ProcessExpressCheckoutAsync(
        ExpressCheckoutRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_gateway is null)
        {
            return ExpressCheckoutResult.Failed("Braintree is not configured.");
        }

        if (string.IsNullOrEmpty(request.PaymentToken))
        {
            return ExpressCheckoutResult.Failed("Payment nonce is required.");
        }

        try
        {
            var transactionRequest = new TransactionRequest
            {
                Amount = request.Amount,
                PaymentMethodNonce = request.PaymentToken,
                Options = new TransactionOptionsRequest
                {
                    SubmitForSettlement = true
                }
            };

            // Add merchant account if configured
            if (!string.IsNullOrEmpty(_merchantAccountId))
            {
                transactionRequest.MerchantAccountId = _merchantAccountId;
            }

            // Add device data for fraud protection if provided
            if (request.ProviderData?.TryGetValue("deviceData", out var deviceData) == true)
            {
                transactionRequest.DeviceData = deviceData;
            }

            var result = await _gateway.Transaction.SaleAsync(transactionRequest);

            if (!result.IsSuccess())
            {
                var errorMessage = result.Message;
                if (result.Errors?.Count > 0)
                {
                    var errorMessages = result.Errors.DeepAll()
                        .Select(e => e.Message)
                        .ToList();
                    errorMessage = string.Join("; ", errorMessages);
                }
                return ExpressCheckoutResult.Failed(errorMessage);
            }

            var transaction = result.Target;
            return ExpressCheckoutResult.Completed(
                transactionId: transaction.Id,
                amount: transaction.Amount ?? request.Amount);
        }
        catch (AuthenticationException ex)
        {
            return ExpressCheckoutResult.Failed($"Authentication failed: {ex.Message}");
        }
        catch (AuthorizationException ex)
        {
            return ExpressCheckoutResult.Failed($"Authorization failed: {ex.Message}");
        }
        catch (Exception ex)
        {
            return ExpressCheckoutResult.Failed(ex.Message);
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
        if (_gateway is null)
        {
            return PaymentCaptureResult.Failure("Braintree is not configured.");
        }

        try
        {
            Result<Transaction> result;

            if (amount.HasValue)
            {
                // Partial capture - submit specific amount using SubmitForSettlement with amount
                result = await _gateway.Transaction.SubmitForSettlementAsync(
                    transactionId,
                    amount.Value);
            }
            else
            {
                // Full capture - submit for settlement
                result = await _gateway.Transaction.SubmitForSettlementAsync(transactionId);
            }

            if (result.IsSuccess())
            {
                return PaymentCaptureResult.Successful(
                    transactionId: result.Target.Id,
                    amount: result.Target.Amount ?? amount ?? 0);
            }

            return PaymentCaptureResult.Failure(
                errorMessage: result.Message);
        }
        catch (NotFoundException)
        {
            return PaymentCaptureResult.Failure("Transaction not found.");
        }
        catch (AuthorizationException ex)
        {
            return PaymentCaptureResult.Failure($"Authorization failed: {ex.Message}");
        }
        catch (Exception ex)
        {
            return PaymentCaptureResult.Failure(ex.Message);
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
        if (_gateway is null)
        {
            return RefundResult.Failure("Braintree is not configured.");
        }

        try
        {
            // First, get the transaction to check its current status
            var transaction = await _gateway.Transaction.FindAsync(request.TransactionId);
            if (transaction is null)
            {
                return RefundResult.Failure("Transaction not found.");
            }

            var status = transaction.Status;
            var isPartialRefund = request.Amount.HasValue && request.Amount.Value < transaction.Amount;

            // Determine the appropriate operation based on transaction status
            // Void: works for Authorized, SubmittedForSettlement, SettlementPending
            // Refund: works for Settling, Settled
            Result<Transaction> result;

            if (status == TransactionStatus.SETTLED || status == TransactionStatus.SETTLING)
            {
                // Transaction is settled/settling - use refund
                result = request.Amount.HasValue
                    ? await _gateway.Transaction.RefundAsync(request.TransactionId, request.Amount.Value)
                    : await _gateway.Transaction.RefundAsync(request.TransactionId);
            }
            else if (status == TransactionStatus.AUTHORIZED ||
                     status == TransactionStatus.SUBMITTED_FOR_SETTLEMENT ||
                     status == TransactionStatus.SETTLEMENT_PENDING)
            {
                // Transaction not yet settled - use void
                if (isPartialRefund)
                {
                    return RefundResult.Failure(
                        "Partial refunds are not available until the transaction settles (typically overnight). " +
                        "You can process a full refund now, or wait until tomorrow for a partial refund.");
                }

                result = await _gateway.Transaction.VoidAsync(request.TransactionId);
            }
            else
            {
                // Transaction is in a terminal state that cannot be reversed
                return RefundResult.Failure(
                    $"Transaction cannot be refunded. Current status: {status}. " +
                    "Only transactions that are authorized, submitted for settlement, settling, or settled can be reversed.");
            }

            if (result.IsSuccess())
            {
                var refundId = result.Target.Id;

                // For voids, the Target.Id is the same as the original transaction.
                // Generate a unique refund ID to avoid UNIQUE constraint violation.
                if (string.Equals(refundId, request.TransactionId, StringComparison.OrdinalIgnoreCase))
                {
                    refundId = $"{request.TransactionId}-VOID-{DateTime.UtcNow:yyyyMMddHHmmss}";
                }

                return RefundResult.Successful(
                    refundTransactionId: refundId,
                    amount: result.Target.Amount ?? request.Amount ?? 0);
            }

            return RefundResult.Failure(errorMessage: result.Message);
        }
        catch (NotFoundException)
        {
            return RefundResult.Failure("Transaction not found.");
        }
        catch (AuthorizationException ex)
        {
            return RefundResult.Failure($"Authorization failed: {ex.Message}");
        }
        catch (Exception ex)
        {
            return RefundResult.Failure(ex.Message);
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
        if (_gateway is null)
        {
            return Task.FromResult(false);
        }

        try
        {
            // Braintree webhooks come with bt_signature and bt_payload
            // The payload parameter contains the bt_payload, headers should contain bt_signature
            // HTTP headers are case-insensitive, so we need to search with case-insensitive comparison
            var signature = headers
                .FirstOrDefault(h => string.Equals(h.Key, "bt_signature", StringComparison.OrdinalIgnoreCase) ||
                                     string.Equals(h.Key, "bt-signature", StringComparison.OrdinalIgnoreCase))
                .Value;

            if (string.IsNullOrEmpty(signature))
            {
                // Try to extract from form data if not in headers
                // Some webhook implementations pass these differently
                return Task.FromResult(false);
            }

            // Parse validates the signature - throws if invalid
            _gateway.WebhookNotification.Parse(signature, payload);
            return Task.FromResult(true);
        }
        catch (InvalidSignatureException)
        {
            // Invalid signature is an expected case - return false without logging
            return Task.FromResult(false);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Unexpected error validating Braintree webhook signature");
            return Task.FromResult(false);
        }
    }

    /// <inheritdoc />
    public override Task<WebhookProcessingResult> ProcessWebhookAsync(
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
            return Task.FromResult(ProcessTestWebhook(payload));
        }

        if (_gateway is null)
        {
            return Task.FromResult(WebhookProcessingResult.Failure("Braintree is not configured."));
        }

        try
        {
            // Get signature from headers (case-insensitive lookup)
            var signature = headers
                .FirstOrDefault(h => string.Equals(h.Key, "bt_signature", StringComparison.OrdinalIgnoreCase) ||
                                     string.Equals(h.Key, "bt-signature", StringComparison.OrdinalIgnoreCase))
                .Value;

            if (string.IsNullOrEmpty(signature))
            {
                return Task.FromResult(WebhookProcessingResult.Failure("Missing bt_signature header."));
            }

            // Parse and validate the webhook
            var notification = _gateway.WebhookNotification.Parse(signature, payload);

            return Task.FromResult(ProcessBraintreeNotification(notification));
        }
        catch (InvalidSignatureException)
        {
            return Task.FromResult(WebhookProcessingResult.Failure("Invalid webhook signature."));
        }
        catch (Exception ex)
        {
            return Task.FromResult(WebhookProcessingResult.Failure($"Braintree error: {ex.Message}"));
        }
    }

    /// <summary>
    /// Process a test webhook payload (without signature validation).
    /// Parses the base64-encoded XML payload directly.
    /// </summary>
    private static WebhookProcessingResult ProcessTestWebhook(string payload)
    {
        try
        {
            // Decode the base64 payload
            var decodedXml = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(payload));

            // Parse the XML to extract event type
            var doc = System.Xml.Linq.XDocument.Parse(decodedXml);
            var kindElement = doc.Descendants("kind").FirstOrDefault();
            var eventType = kindElement?.Value;

            if (string.IsNullOrEmpty(eventType))
            {
                return WebhookProcessingResult.Failure("Could not parse event type from test payload.");
            }

            // Extract transaction ID if present
            var transactionId = doc.Descendants("id").FirstOrDefault()?.Value ?? $"test_{DateTime.UtcNow:yyyyMMddHHmmss}";

            // Extract amount if present
            decimal? amount = null;
            var amountElement = doc.Descendants("amount").FirstOrDefault();
            if (amountElement != null && decimal.TryParse(amountElement.Value, out var parsedAmount))
            {
                amount = parsedAmount;
            }

            // Map Braintree event type to Merchello event type
            var merchelloEventType = eventType switch
            {
                "transaction_settled" => WebhookEventType.PaymentCompleted,
                "transaction_settlement_declined" => WebhookEventType.PaymentFailed,
                "dispute_opened" => WebhookEventType.DisputeOpened,
                "dispute_won" or "dispute_lost" => WebhookEventType.DisputeResolved,
                "local_payment_completed" => WebhookEventType.PaymentCompleted,
                "local_payment_reversed" => WebhookEventType.RefundCompleted,
                "local_payment_expired" => WebhookEventType.PaymentFailed,
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
    /// Process a validated Braintree webhook notification.
    /// </summary>
    private WebhookProcessingResult ProcessBraintreeNotification(WebhookNotification notification)
    {
        switch (notification.Kind)
        {
            case WebhookKind.TRANSACTION_SETTLED:
                return HandleTransactionSettled(notification);

            case WebhookKind.TRANSACTION_SETTLEMENT_DECLINED:
                return HandleTransactionSettlementDeclined(notification);

            case WebhookKind.DISPUTE_OPENED:
                return HandleDisputeOpened(notification);

            case WebhookKind.DISPUTE_LOST:
                return HandleDisputeLost(notification);

            case WebhookKind.DISPUTE_WON:
                return HandleDisputeWon(notification);

            default:
                // Acknowledge but don't process unknown events
                return WebhookProcessingResult.Successful(
                    WebhookEventType.Unknown,
                    transactionId: $"bt_{DateTime.UtcNow:yyyyMMddHHmmss}");
        }
    }

    private WebhookProcessingResult HandleTransactionSettled(WebhookNotification notification)
    {
        var transaction = notification.Transaction;
        if (transaction == null)
        {
            return WebhookProcessingResult.Failure("Could not parse transaction from webhook.");
        }

        // Try to extract invoice ID from custom fields
        Guid? invoiceId = null;
        if (transaction.CustomFields?.TryGetValue("invoice_id", out var invoiceIdStr) == true &&
            Guid.TryParse(invoiceIdStr, out var parsedInvoiceId))
        {
            invoiceId = parsedInvoiceId;
        }

        var riskScore = MapBraintreeRiskScore(transaction.RiskData);

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.PaymentCompleted,
            transactionId: transaction.Id,
            invoiceId: invoiceId,
            amount: transaction.Amount,
            riskScore: riskScore,
            riskScoreSource: riskScore.HasValue ? "braintree-advanced-fraud" : null);
    }

    private WebhookProcessingResult HandleTransactionSettlementDeclined(WebhookNotification notification)
    {
        var transaction = notification.Transaction;
        if (transaction == null)
        {
            return WebhookProcessingResult.Failure("Could not parse transaction from webhook.");
        }

        Guid? invoiceId = null;
        if (transaction.CustomFields?.TryGetValue("invoice_id", out var invoiceIdStr) == true &&
            Guid.TryParse(invoiceIdStr, out var parsedInvoiceId))
        {
            invoiceId = parsedInvoiceId;
        }

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.PaymentFailed,
            transactionId: transaction.Id,
            invoiceId: invoiceId);
    }

    private WebhookProcessingResult HandleDisputeOpened(WebhookNotification notification)
    {
        var dispute = notification.Dispute;
        if (dispute == null)
        {
            return WebhookProcessingResult.Failure("Could not parse dispute from webhook.");
        }

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.DisputeOpened,
            transactionId: dispute.Id,
            amount: dispute.Amount);
    }

    private WebhookProcessingResult HandleDisputeLost(WebhookNotification notification)
    {
        var dispute = notification.Dispute;
        if (dispute == null)
        {
            return WebhookProcessingResult.Failure("Could not parse dispute from webhook.");
        }

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.DisputeResolved,
            transactionId: dispute.Id,
            amount: dispute.Amount);
    }

    private WebhookProcessingResult HandleDisputeWon(WebhookNotification notification)
    {
        var dispute = notification.Dispute;
        if (dispute == null)
        {
            return WebhookProcessingResult.Failure("Could not parse dispute from webhook.");
        }

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.DisputeResolved,
            transactionId: dispute.Id,
            amount: dispute.Amount);
    }

    // =====================================================
    // Webhook Testing (Simulation)
    // =====================================================

    /// <inheritdoc />
    /// <remarks>
    /// Returns the Braintree webhook events that can be simulated for testing.
    /// These match the events configured in the Braintree Control Panel.
    /// </remarks>
    public override ValueTask<IReadOnlyList<WebhookEventTemplate>> GetWebhookEventTemplatesAsync(
        CancellationToken cancellationToken = default)
    {
        List<WebhookEventTemplate> templates =
        [
            new()
            {
                EventType = "transaction_settled",
                DisplayName = "Transaction Settled",
                Description = "Fired when a transaction is successfully settled and funds are transferred.",
                Category = WebhookEventCategory.Payment,
                MerchelloEventType = WebhookEventType.PaymentCompleted
            },
            new()
            {
                EventType = "transaction_settlement_declined",
                DisplayName = "Transaction Settlement Declined",
                Description = "Fired when a transaction settlement is declined by the processor.",
                Category = WebhookEventCategory.Payment,
                MerchelloEventType = WebhookEventType.PaymentFailed
            },
            new()
            {
                EventType = "dispute_opened",
                DisplayName = "Dispute Opened",
                Description = "Fired when a customer initiates a chargeback or dispute.",
                Category = WebhookEventCategory.Dispute,
                MerchelloEventType = WebhookEventType.DisputeOpened
            },
            new()
            {
                EventType = "dispute_won",
                DisplayName = "Dispute Won",
                Description = "Fired when a dispute is resolved in the merchant's favor.",
                Category = WebhookEventCategory.Dispute,
                MerchelloEventType = WebhookEventType.DisputeResolved
            },
            new()
            {
                EventType = "dispute_lost",
                DisplayName = "Dispute Lost",
                Description = "Fired when a dispute is resolved in the customer's favor (chargeback applied).",
                Category = WebhookEventCategory.Dispute,
                MerchelloEventType = WebhookEventType.DisputeResolved
            },
            // Local Payment Methods webhooks
            new()
            {
                EventType = "local_payment_completed",
                DisplayName = "Local Payment Completed",
                Description = "Fired when a local payment method (iDEAL, Bancontact, SEPA, etc.) completes successfully.",
                Category = WebhookEventCategory.Payment,
                MerchelloEventType = WebhookEventType.PaymentCompleted
            },
            new()
            {
                EventType = "local_payment_reversed",
                DisplayName = "Local Payment Reversed",
                Description = "Fired when a local payment is reversed (e.g., SEPA direct debit reversal).",
                Category = WebhookEventCategory.Refund,
                MerchelloEventType = WebhookEventType.RefundCompleted
            },
            new()
            {
                EventType = "local_payment_expired",
                DisplayName = "Local Payment Expired",
                Description = "Fired when a local payment expires before completion.",
                Category = WebhookEventCategory.Payment,
                MerchelloEventType = WebhookEventType.PaymentFailed
            },
            // Additional useful Braintree webhooks
            new()
            {
                EventType = "dispute_under_review",
                DisplayName = "Dispute Under Review",
                Description = "Fired when dispute evidence has been submitted and is under review.",
                Category = WebhookEventCategory.Dispute,
                MerchelloEventType = WebhookEventType.Unknown
            },
            new()
            {
                EventType = "transaction_disbursed",
                DisplayName = "Transaction Disbursed",
                Description = "Fired when funds are disbursed to your bank account (settlement).",
                Category = WebhookEventCategory.Payment,
                MerchelloEventType = WebhookEventType.Unknown
            }
        ];

        return ValueTask.FromResult<IReadOnlyList<WebhookEventTemplate>>(templates);
    }

    /// <inheritdoc />
    /// <remarks>
    /// Generates a realistic Braintree webhook payload for testing.
    /// Braintree webhooks use XML format with base64-encoded payload and signature.
    /// See: https://developer.paypal.com/braintree/docs/guides/webhooks/overview
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
                    ["bt_signature"] = "test_signature|test_payload",
                    ["Content-Type"] = "application/x-www-form-urlencoded"
                }));
        }

        // Generate appropriate payload based on event type
        var transactionId = parameters.TransactionId ?? $"bt_test_{Guid.NewGuid():N}"[..20];
        var invoiceId = parameters.InvoiceId ?? Guid.NewGuid();
        var amount = parameters.Amount;
        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");

        // Map event type string to Braintree notification kind
        var webhookKind = parameters.EventType.ToLowerInvariant() switch
        {
            "transaction_settled" => "transaction_settled",
            "transaction_settlement_declined" => "transaction_settlement_declined",
            "dispute_opened" => "dispute_opened",
            "dispute_won" => "dispute_won",
            "dispute_lost" => "dispute_lost",
            "local_payment_completed" => "local_payment_completed",
            "local_payment_reversed" => "local_payment_reversed",
            "local_payment_expired" => "local_payment_expired",
            _ => "transaction_settled"
        };

        // Generate XML payload (simplified version of Braintree's format)
        var xmlPayload = GenerateBraintreeXmlPayload(webhookKind, transactionId, invoiceId, amount, timestamp);

        // Braintree sends payloads as base64-encoded XML
        var encodedPayload = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(xmlPayload));

        // The actual payload sent to the endpoint
        var payload = encodedPayload;

        var headers = new Dictionary<string, string>
        {
            ["bt_signature"] = $"test_public_key|{GenerateTestSignature(encodedPayload)}",
            ["bt-signature"] = $"test_public_key|{GenerateTestSignature(encodedPayload)}",
            ["Content-Type"] = "application/x-www-form-urlencoded"
        };

        return ValueTask.FromResult<(string, IDictionary<string, string>)>((payload, headers));
    }

    private static string GenerateBraintreeXmlPayload(string kind, string transactionId, Guid invoiceId, decimal amount, string timestamp)
    {
        // Braintree uses XML for webhook payloads
        return kind switch
        {
            "transaction_settled" or "transaction_settlement_declined" => $"""
                <?xml version="1.0" encoding="UTF-8"?>
                <notification>
                    <kind>{kind}</kind>
                    <timestamp type="datetime">{timestamp}</timestamp>
                    <subject>
                        <transaction>
                            <id>{transactionId}</id>
                            <status>{(kind == "transaction_settled" ? "settled" : "settlement_declined")}</status>
                            <type>sale</type>
                            <amount>{amount:F2}</amount>
                            <currency-iso-code>USD</currency-iso-code>
                            <created-at type="datetime">{timestamp}</created-at>
                            <updated-at type="datetime">{timestamp}</updated-at>
                            <custom-fields>
                                <invoice-id>{invoiceId}</invoice-id>
                            </custom-fields>
                            <payment-instrument-type>credit_card</payment-instrument-type>
                            <credit-card>
                                <bin>411111</bin>
                                <last-4>1111</last-4>
                                <card-type>Visa</card-type>
                                <expiration-month>12</expiration-month>
                                <expiration-year>2025</expiration-year>
                            </credit-card>
                        </transaction>
                    </subject>
                </notification>
                """,
            "dispute_opened" or "dispute_won" or "dispute_lost" => $"""
                <?xml version="1.0" encoding="UTF-8"?>
                <notification>
                    <kind>{kind}</kind>
                    <timestamp type="datetime">{timestamp}</timestamp>
                    <subject>
                        <dispute>
                            <id>dp_{transactionId}</id>
                            <amount-disputed>{amount:F2}</amount-disputed>
                            <amount-won>0.00</amount-won>
                            <case-number>CB123456</case-number>
                            <currency-iso-code>USD</currency-iso-code>
                            <reason>fraud</reason>
                            <reason-code>83</reason-code>
                            <status>{(kind == "dispute_opened" ? "open" : kind == "dispute_won" ? "won" : "lost")}</status>
                            <received-date type="date">{DateTime.UtcNow:yyyy-MM-dd}</received-date>
                            <reply-by-date type="date">{DateTime.UtcNow.AddDays(21):yyyy-MM-dd}</reply-by-date>
                            <transaction>
                                <id>{transactionId}</id>
                                <amount>{amount:F2}</amount>
                            </transaction>
                        </dispute>
                    </subject>
                </notification>
                """,
            "local_payment_completed" or "local_payment_reversed" or "local_payment_expired" => $"""
                <?xml version="1.0" encoding="UTF-8"?>
                <notification>
                    <kind>{kind}</kind>
                    <timestamp type="datetime">{timestamp}</timestamp>
                    <subject>
                        <local-payment>
                            <payment-id>{transactionId}</payment-id>
                            <id>{transactionId}</id>
                            <payer-id>PAYER123</payer-id>
                            <payment-method-nonce>fake-valid-nonce</payment-method-nonce>
                            <transaction>
                                <id>{transactionId}</id>
                                <status>{(kind == "local_payment_completed" ? "settled" : kind == "local_payment_reversed" ? "voided" : "failed")}</status>
                                <amount>{amount:F2}</amount>
                                <currency-iso-code>EUR</currency-iso-code>
                            </transaction>
                            <funding-source>ideal</funding-source>
                        </local-payment>
                    </subject>
                </notification>
                """,
            _ => $"""
                <?xml version="1.0" encoding="UTF-8"?>
                <notification>
                    <kind>{kind}</kind>
                    <timestamp type="datetime">{timestamp}</timestamp>
                    <subject></subject>
                </notification>
                """
        };
    }

    private static string GenerateTestSignature(string payload)
    {
        // Generate a mock signature for testing
        // In production, Braintree signs with HMAC-SHA1
        using var sha = System.Security.Cryptography.SHA256.Create();
        var hash = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(payload + "test_secret"));
        return Convert.ToBase64String(hash)[..20];
    }

    // =====================================================
    // Helpers
    // =====================================================

    /// <summary>
    /// Maps Braintree risk data to our 0-100 scale.
    /// Braintree Advanced Fraud Protection provides risk decisions and scores.
    /// </summary>
    /// <param name="riskData">The risk data from the transaction.</param>
    /// <returns>Risk score on 0-100 scale, or null if no risk data available.</returns>
    private static decimal? MapBraintreeRiskScore(RiskData? riskData)
    {
        if (riskData == null)
        {
            return null;
        }

        // Try to get the numeric risk score first (available with Fraud Protection Advanced)
        if (!string.IsNullOrEmpty(riskData.TransactionRiskScore) &&
            int.TryParse(riskData.TransactionRiskScore, out var numericScore))
        {
            // Braintree risk scores are typically 0-99, map to 0-100
            return Math.Min(numericScore, 100);
        }

        // Fall back to decision-based mapping
        // Braintree uses decision strings: "Approve", "Review", "Decline"
        // Note: Braintree SDK uses lowercase property names
        return riskData.decision?.ToLowerInvariant() switch
        {
            "approve" => 10m,   // Low risk
            "review" => 60m,   // Medium risk - needs manual review
            "decline" => 90m,  // High risk
            _ => (decimal?)null
        };
    }
}
