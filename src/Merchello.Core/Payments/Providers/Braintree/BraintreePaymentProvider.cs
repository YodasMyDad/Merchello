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
    private const string BraintreePaymentAdapterUrl = "/App_Plugins/Merchello/js/checkout/adapters/braintree-payment-adapter.js";

    /// <summary>
    /// URL to the Braintree local payment adapter script.
    /// </summary>
    private const string BraintreeLocalPaymentAdapterUrl = "/App_Plugins/Merchello/js/checkout/adapters/braintree-local-payment-adapter.js";

    /// <summary>
    /// Pinned Braintree Web SDK version used for all component script URLs.
    /// </summary>
    private const string BraintreeWebSdkVersion = "3.136.0";

    /// <summary>
    /// Local payment method aliases that use the local payment SDK.
    /// </summary>
    private static readonly HashSet<string> LocalPaymentAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        "ideal", "bancontact", "sepa", "eps", "p24"
    };

    private static string GetBraintreeJsUrl(string component) =>
        $"https://js.braintreegateway.com/web/{BraintreeWebSdkVersion}/js/{component}.min.js";

    /// <summary>
    /// SVG icon for card payments (credit card symbol).
    /// </summary>
    private const string CardIconSvg = """<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 9h20" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="13" width="5" height="2" rx="0.5" fill="currentColor" opacity="0.5"/></svg>""";

    /// <inheritdoc />
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "braintree",
        DisplayName = "Braintree",
        Icon = "icon-credit-card",
        IconHtml = ProviderBrandLogoCatalog.Braintree,
        Description = "Accept payments via Braintree. Supports credit cards, PayPal, Apple Pay, Google Pay, and Venmo.",
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        SupportsAuthAndCapture = true,
        RequiresWebhook = true,
        SupportsVaultedPayments = true,
        RequiresProviderCustomerId = true,
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
            IconHtml = ProviderBrandLogoCatalog.PayPal,
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
            IconHtml = ProviderBrandLogoCatalog.ApplePay,
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
            IconHtml = ProviderBrandLogoCatalog.GooglePay,
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
            IconHtml = ProviderBrandLogoCatalog.Venmo,
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
            IconHtml = ProviderBrandLogoCatalog.Ideal,
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
            IconHtml = ProviderBrandLogoCatalog.Bancontact,
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
            IconHtml = ProviderBrandLogoCatalog.Sepa,
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
            IconHtml = ProviderBrandLogoCatalog.Eps,
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
            IconHtml = ProviderBrandLogoCatalog.P24,
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
            // SDK version pinned via BraintreeWebSdkVersion
            return PaymentSessionResult.HostedFields(
                providerAlias: Metadata.Alias,
                methodAlias: methodAlias,
                adapterUrl: BraintreePaymentAdapterUrl,
                jsSdkUrl: GetBraintreeJsUrl("client"),
                sdkConfig: new Dictionary<string, object>
                {
                    // SDK component URLs
                    ["hostedFieldsSdkUrl"] = GetBraintreeJsUrl("hosted-fields"),
                    ["threeDSecureSdkUrl"] = GetBraintreeJsUrl("three-d-secure"),
                    ["dataCollectorSdkUrl"] = GetBraintreeJsUrl("data-collector"),

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
            jsSdkUrl: GetBraintreeJsUrl("client"),
            sdkConfig: new Dictionary<string, object>
            {
                // SDK component URLs
                ["localPaymentSdkUrl"] = GetBraintreeJsUrl("local-payment"),
                ["dataCollectorSdkUrl"] = GetBraintreeJsUrl("data-collector"),

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
            string? vaultCustomerId = null;

            if (request.SavePaymentMethod &&
                request.CustomerId.HasValue &&
                !string.IsNullOrWhiteSpace(request.CustomerEmail))
            {
                vaultCustomerId = await GetOrCreateBraintreeCustomerAsync(
                    request.CustomerId.Value,
                    request.CustomerEmail,
                    request.CustomerName,
                    cancellationToken);
            }

            var transactionRequest = new TransactionRequest
            {
                Amount = request.Amount ?? 0,
                PaymentMethodNonce = request.PaymentMethodToken,
                CustomerId = vaultCustomerId,
                Options = new TransactionOptionsRequest
                {
                    SubmitForSettlement = true, // Capture immediately
                    StoreInVaultOnSuccess = !string.IsNullOrEmpty(vaultCustomerId)
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

                VaultConfirmResult? vaultDetails = null;
                if (request.SavePaymentMethod && !string.IsNullOrEmpty(vaultCustomerId))
                {
                    if (transaction.CreditCard != null && !string.IsNullOrEmpty(transaction.CreditCard.Token))
                    {
                        var card = transaction.CreditCard;
                        vaultDetails = new VaultConfirmResult
                        {
                            Success = true,
                            ProviderMethodId = card.Token,
                            ProviderCustomerId = vaultCustomerId,
                            MethodType = SavedPaymentMethodType.Card,
                            CardBrand = card.CardType.ToString(),
                            Last4 = card.LastFour,
                            ExpiryMonth = int.TryParse(card.ExpirationMonth, out var month) ? month : (int?)null,
                            ExpiryYear = int.TryParse(card.ExpirationYear, out var year) ? year : (int?)null,
                            DisplayLabel = $"{card.CardType} ending in {card.LastFour}",
                            ExtendedData = new Dictionary<string, object>
                            {
                                ["bin"] = card.Bin ?? string.Empty,
                                ["uniqueNumberIdentifier"] = card.UniqueNumberIdentifier ?? string.Empty
                            }
                        };
                    }
                    else if (transaction.PayPalDetails != null && !string.IsNullOrEmpty(transaction.PayPalDetails.Token))
                    {
                        var paypal = transaction.PayPalDetails;
                        vaultDetails = new VaultConfirmResult
                        {
                            Success = true,
                            ProviderMethodId = paypal.Token,
                            ProviderCustomerId = vaultCustomerId,
                            MethodType = SavedPaymentMethodType.PayPal,
                            DisplayLabel = $"PayPal - {paypal.PayerEmail ?? "account"}",
                            ExtendedData = new Dictionary<string, object>
                            {
                                ["email"] = paypal.PayerEmail ?? string.Empty,
                                ["payerId"] = paypal.PayerId ?? string.Empty
                            }
                        };
                    }
                }

                return new PaymentResult
                {
                    Success = true,
                    TransactionId = transaction.Id,
                    Amount = transaction.Amount ?? request.Amount ?? 0,
                    Status = PaymentResultStatus.Completed,
                    RiskScore = riskScore,
                    RiskScoreSource = riskScore.HasValue ? "braintree-advanced-fraud" : null,
                    VaultedMethodDetails = vaultDetails
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
    private const string BraintreeExpressAdapterUrl = "/App_Plugins/Merchello/js/checkout/adapters/braintree-express-adapter.js";

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
                "paypal" => GetBraintreeJsUrl("paypal-checkout"),
                "applepay" => GetBraintreeJsUrl("apple-pay"),
                "googlepay" => GetBraintreeJsUrl("google-payment"),
                "venmo" => GetBraintreeJsUrl("venmo"),
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
                    ["clientSdkUrl"] = GetBraintreeJsUrl("client"),
                    ["dataCollectorSdkUrl"] = GetBraintreeJsUrl("data-collector"),
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
                "local_payment_funded" => WebhookEventType.PaymentCompleted,
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

            case WebhookKind.LOCAL_PAYMENT_COMPLETED:
                return HandleLocalPaymentCompleted(notification);

            case WebhookKind.LOCAL_PAYMENT_REVERSED:
                return HandleLocalPaymentReversed(notification);

            case WebhookKind.LOCAL_PAYMENT_EXPIRED:
                return HandleLocalPaymentExpired(notification);

            case WebhookKind.LOCAL_PAYMENT_FUNDED:
                return HandleLocalPaymentFunded(notification);

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

    private static WebhookProcessingResult HandleLocalPaymentCompleted(WebhookNotification notification)
    {
        var localPayment = notification.LocalPaymentCompleted;
        if (localPayment == null)
        {
            return WebhookProcessingResult.Failure("Could not parse local payment completion from webhook.");
        }

        var transaction = localPayment.Transaction;
        if (transaction != null && !string.IsNullOrWhiteSpace(transaction.Id))
        {
            Guid? invoiceId = null;
            if (transaction.CustomFields?.TryGetValue("invoice_id", out var invoiceIdStr) == true &&
                Guid.TryParse(invoiceIdStr, out var parsedInvoiceId))
            {
                invoiceId = parsedInvoiceId;
            }

            return WebhookProcessingResult.Successful(
                eventType: WebhookEventType.PaymentCompleted,
                transactionId: transaction.Id,
                invoiceId: invoiceId,
                amount: transaction.Amount);
        }

        if (string.IsNullOrWhiteSpace(localPayment.PaymentId))
        {
            return WebhookProcessingResult.Failure("Could not parse local payment ID from webhook.");
        }

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.PaymentCompleted,
            transactionId: localPayment.PaymentId);
    }

    private static WebhookProcessingResult HandleLocalPaymentReversed(WebhookNotification notification)
    {
        var localPayment = notification.LocalPaymentReversed;
        if (localPayment == null || string.IsNullOrWhiteSpace(localPayment.PaymentId))
        {
            return WebhookProcessingResult.Failure("Could not parse local payment reversal from webhook.");
        }

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.RefundCompleted,
            transactionId: localPayment.PaymentId);
    }

    private static WebhookProcessingResult HandleLocalPaymentExpired(WebhookNotification notification)
    {
        var localPayment = notification.LocalPaymentExpired;
        if (localPayment == null || string.IsNullOrWhiteSpace(localPayment.PaymentId))
        {
            return WebhookProcessingResult.Failure("Could not parse local payment expiry from webhook.");
        }

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.PaymentFailed,
            transactionId: localPayment.PaymentId);
    }

    private static WebhookProcessingResult HandleLocalPaymentFunded(WebhookNotification notification)
    {
        var localPayment = notification.LocalPaymentFunded;
        if (localPayment == null)
        {
            return WebhookProcessingResult.Failure("Could not parse local payment funding from webhook.");
        }

        var transaction = localPayment.Transaction;
        if (transaction != null && !string.IsNullOrWhiteSpace(transaction.Id))
        {
            return WebhookProcessingResult.Successful(
                eventType: WebhookEventType.PaymentCompleted,
                transactionId: transaction.Id,
                amount: transaction.Amount);
        }

        if (string.IsNullOrWhiteSpace(localPayment.PaymentId))
        {
            return WebhookProcessingResult.Failure("Could not parse local payment ID from webhook.");
        }

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.PaymentCompleted,
            transactionId: localPayment.PaymentId);
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
                EventType = "local_payment_funded",
                DisplayName = "Local Payment Funded",
                Description = "Fired when a local payment method has been funded and a transaction is available.",
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
            "local_payment_funded" => "local_payment_funded",
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
            "local_payment_funded" or "local_payment_completed" or "local_payment_reversed" or "local_payment_expired" => $"""
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
                                <status>{(kind == "local_payment_completed" ? "settled" : kind == "local_payment_funded" ? "submitted_for_settlement" : kind == "local_payment_reversed" ? "voided" : "failed")}</status>
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

    // =====================================================
    // Vaulted Payments
    // =====================================================

    /// <inheritdoc />
    /// <remarks>
    /// Creates a Braintree client token for saving a payment method.
    /// Uses the Vault without charging: https://developer.paypal.com/braintree/docs/guides/credit-cards/vault
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

        if (_gateway is null)
        {
            return VaultSetupResult.Failed("Braintree is not configured. Please add your API credentials.");
        }

        try
        {
            // Get or create a Braintree customer
            var braintreeCustomerId = await GetOrCreateBraintreeCustomerAsync(
                request.CustomerId,
                request.CustomerEmail,
                request.CustomerName,
                cancellationToken);

            // Generate a client token for this customer
            var clientTokenRequest = new ClientTokenRequest
            {
                CustomerId = braintreeCustomerId
            };

            var clientToken = await _gateway.ClientToken.GenerateAsync(clientTokenRequest);

            // Create a unique session ID for tracking
            var sessionId = $"vault_{request.CustomerId}_{DateTime.UtcNow.Ticks}";

            return new VaultSetupResult
            {
                Success = true,
                SetupSessionId = sessionId,
                ClientSecret = clientToken, // Braintree uses client token
                ProviderCustomerId = braintreeCustomerId,
                SdkConfig = new Dictionary<string, object>
                {
                    ["clientToken"] = clientToken,
                    ["returnUrl"] = request.ReturnUrl ?? string.Empty
                }
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create Braintree vault setup session");
            return VaultSetupResult.Failed(ex.Message);
        }
    }

    /// <inheritdoc />
    /// <remarks>
    /// Confirms a vault setup by storing the payment method nonce.
    /// The nonce comes from Drop-in UI or Hosted Fields after customer enters card details.
    /// </remarks>
    public override async Task<VaultConfirmResult> ConfirmVaultSetupAsync(
        VaultConfirmRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_gateway is null)
        {
            return VaultConfirmResult.Failed("Braintree is not configured.");
        }

        if (string.IsNullOrWhiteSpace(request.SetupSessionId))
        {
            return VaultConfirmResult.Failed("SetupSessionId is required.");
        }

        if (string.IsNullOrEmpty(request.PaymentMethodToken))
        {
            return VaultConfirmResult.Failed("Payment method nonce is required for Braintree vault confirmation.");
        }

        if (string.IsNullOrWhiteSpace(request.ProviderCustomerId))
        {
            return VaultConfirmResult.Failed("ProviderCustomerId is required for Braintree vault confirmation.");
        }

        try
        {
            // Create a payment method from the nonce
            var paymentMethodRequest = new PaymentMethodRequest
            {
                CustomerId = request.ProviderCustomerId,
                PaymentMethodNonce = request.PaymentMethodToken,
                Options = new PaymentMethodOptionsRequest
                {
                    MakeDefault = request.SetAsDefault,
                    VerifyCard = true // Verify card before storing
                }
            };

            var result = await _gateway.PaymentMethod.CreateAsync(paymentMethodRequest);

            if (!result.IsSuccess())
            {
                return VaultConfirmResult.Failed(result.Message);
            }

            var paymentMethod = result.Target;

            // Extract details based on payment method type
            if (paymentMethod is CreditCard card)
            {
                return new VaultConfirmResult
                {
                    Success = true,
                    ProviderMethodId = card.Token,
                    ProviderCustomerId = request.ProviderCustomerId,
                    MethodType = SavedPaymentMethodType.Card,
                    CardBrand = card.CardType.ToString(),
                    Last4 = card.LastFour,
                    ExpiryMonth = int.TryParse(card.ExpirationMonth, out var month) ? month : (int?)null,
                    ExpiryYear = int.TryParse(card.ExpirationYear, out var year) ? year : (int?)null,
                    DisplayLabel = $"{card.CardType} ending in {card.LastFour}",
                    ExtendedData = new Dictionary<string, object>
                    {
                        ["bin"] = card.Bin ?? string.Empty,
                        ["uniqueNumberIdentifier"] = card.UniqueNumberIdentifier ?? string.Empty
                    }
                };
            }

            if (paymentMethod is PayPalAccount paypal)
            {
                return new VaultConfirmResult
                {
                    Success = true,
                    ProviderMethodId = paypal.Token,
                    ProviderCustomerId = request.ProviderCustomerId,
                    MethodType = SavedPaymentMethodType.PayPal,
                    DisplayLabel = $"PayPal - {paypal.Email}",
                    ExtendedData = new Dictionary<string, object>
                    {
                        ["email"] = paypal.Email ?? string.Empty,
                        ["payerId"] = paypal.PayerId ?? string.Empty
                    }
                };
            }

            // Generic handling for other payment method types
            return new VaultConfirmResult
            {
                Success = true,
                ProviderMethodId = paymentMethod.Token,
                ProviderCustomerId = request.ProviderCustomerId,
                MethodType = SavedPaymentMethodType.Other,
                DisplayLabel = "Saved payment method"
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to confirm Braintree vault setup");
            return VaultConfirmResult.Failed(ex.Message);
        }
    }

    /// <inheritdoc />
    /// <remarks>
    /// Charges a vaulted payment method using the stored token.
    /// See: https://developer.paypal.com/braintree/docs/guides/credit-cards/vault#charging-a-vaulted-payment-method
    /// </remarks>
    public override async Task<PaymentResult> ChargeVaultedMethodAsync(
        ChargeVaultedMethodRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ProviderMethodId))
        {
            return PaymentResult.Failed("ProviderMethodId is required.");
        }

        if (request.Amount <= 0)
        {
            return PaymentResult.Failed("Amount must be greater than zero.");
        }

        if (string.IsNullOrWhiteSpace(request.CurrencyCode))
        {
            return PaymentResult.Failed("CurrencyCode is required.");
        }

        if (_gateway is null)
        {
            return PaymentResult.Failed("Braintree is not configured.");
        }

        try
        {
            var transactionRequest = new TransactionRequest
            {
                Amount = request.Amount,
                PaymentMethodToken = request.ProviderMethodId,
                CustomerId = request.ProviderCustomerId,
                Options = new TransactionOptionsRequest
                {
                    SubmitForSettlement = true // Immediately submit for settlement
                },
                CustomFields = new Dictionary<string, string>
                {
                    ["invoice_id"] = request.InvoiceId.ToString(),
                    ["merchello_customer_id"] = request.CustomerId.ToString()
                }
            };

            // Add merchant account if configured (for multi-currency)
            if (!string.IsNullOrEmpty(_merchantAccountId))
            {
                transactionRequest.MerchantAccountId = _merchantAccountId;
            }

            var result = await _gateway.Transaction.SaleAsync(transactionRequest);

            if (result.IsSuccess())
            {
                var transaction = result.Target;
                return PaymentResult.Completed(transaction.Id, transaction.Amount ?? request.Amount);
            }

            // Check for specific error types
            if (result.Transaction != null)
            {
                var status = result.Transaction.Status;
                if (status == TransactionStatus.PROCESSOR_DECLINED ||
                    status == TransactionStatus.GATEWAY_REJECTED)
                {
                    return PaymentResult.Failed(
                        $"Payment declined: {result.Transaction.ProcessorResponseText}",
                        result.Transaction.ProcessorResponseCode);
                }
            }

            return PaymentResult.Failed(result.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to charge vaulted Braintree payment method");
            return PaymentResult.Failed(ex.Message);
        }
    }

    /// <inheritdoc />
    /// <remarks>
    /// Deletes a vaulted payment method from Braintree.
    /// See: https://developer.paypal.com/braintree/docs/reference/request/payment-method/delete
    /// </remarks>
    public override async Task<bool> DeleteVaultedMethodAsync(
        string providerMethodId,
        string? providerCustomerId = null,
        CancellationToken cancellationToken = default)
    {
        if (_gateway is null)
        {
            return false;
        }

        try
        {
            await _gateway.PaymentMethod.DeleteAsync(providerMethodId);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to delete Braintree vaulted payment method {Token}", providerMethodId);
            return false;
        }
    }

    /// <summary>
    /// Gets or creates a Braintree Customer for the given Merchello customer.
    /// </summary>
    private async Task<string> GetOrCreateBraintreeCustomerAsync(
        Guid merchelloCustomerId,
        string email,
        string? name,
        CancellationToken cancellationToken)
    {
        var gateway = _gateway;
        if (gateway is null)
        {
            throw new InvalidOperationException("Braintree is not configured.");
        }

        // Use Merchello customer ID as the Braintree customer ID for easy correlation
        var braintreeCustomerId = $"merch_{merchelloCustomerId:N}"[..32]; // Max 36 chars in Braintree

        try
        {
            // Try to find existing customer
            var existingCustomer = await gateway.Customer.FindAsync(braintreeCustomerId);
            return existingCustomer.Id;
        }
        catch (NotFoundException)
        {
            // Customer doesn't exist, create new one
            var request = new CustomerRequest
            {
                Id = braintreeCustomerId,
                Email = email,
                FirstName = name?.Split(' ').FirstOrDefault(),
                LastName = name?.Split(' ').Skip(1).FirstOrDefault(),
                CustomFields = new Dictionary<string, string>
                {
                    ["merchello_customer_id"] = merchelloCustomerId.ToString()
                }
            };

            var result = await gateway.Customer.CreateAsync(request);
            if (result.IsSuccess())
            {
                return result.Target.Id;
            }

            throw new InvalidOperationException($"Failed to create Braintree customer: {result.Message}");
        }
    }
}
