using Braintree;
using Braintree.Exceptions;
using Merchello.Core.Payments.Models;

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
public class BraintreePaymentProvider : PaymentProviderBase
{
    private BraintreeGateway? _gateway;
    private string? _merchantId;
    private string? _merchantAccountId;

    /// <summary>
    /// URL to the Braintree payment adapter script.
    /// </summary>
    private const string BraintreePaymentAdapterUrl = "/_content/Merchello/js/checkout/adapters/braintree-payment-adapter.js";

    /// <summary>
    /// SVG icon for card payments.
    /// </summary>
    private const string CardIconSvg = """<svg class="w-8 h-5" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="30" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><rect x="1" y="5" width="30" height="4" fill="currentColor" opacity="0.3"/><rect x="4" y="12" width="8" height="2" rx="1" fill="currentColor" opacity="0.5"/></svg>""";

    /// <summary>
    /// SVG icon for PayPal.
    /// </summary>
    private const string PayPalIconSvg = """<svg class="w-16 h-5" viewBox="0 0 64 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.4 4.5H11.5C13.4 4.5 14.5 5.5 14.4 7.3C14.2 10.4 12.1 12.1 9.4 12.1H8.1L7.4 16.5H4.6L7.4 4.5Z" fill="#003087"/><path d="M9.2 7H10.6C11.5 7 12.2 7.3 12.1 8.3C11.9 9.8 11 10.2 9.9 10.2H8.8L9.2 7Z" fill="#003087"/><path d="M16.2 4.5H20.3C22.2 4.5 23.3 5.5 23.2 7.3C23 10.4 20.9 12.1 18.2 12.1H16.9L16.2 16.5H13.4L16.2 4.5Z" fill="#0070E0"/><path d="M18 7H19.4C20.3 7 21 7.3 20.9 8.3C20.7 9.8 19.8 10.2 18.7 10.2H17.6L18 7Z" fill="#0070E0"/><path d="M25.5 16.5L27.5 4.5H30.3L28.3 16.5H25.5Z" fill="#003087"/><path d="M36.8 4.2C39.8 4.2 41.6 6 41.3 9C41 12 38.8 13.9 35.8 13.9C32.8 13.9 31 12.1 31.3 9.1C31.6 6.1 33.8 4.2 36.8 4.2ZM36.1 11.5C37.5 11.5 38.6 10.5 38.8 8.9C39 7.3 38.2 6.3 36.8 6.3C35.4 6.3 34.3 7.3 34.1 8.9C33.9 10.5 34.7 11.5 36.1 11.5Z" fill="#003087"/><path d="M42.5 16.5L44.5 4.5H47.1L46.8 6.3C47.7 5.1 49.1 4.2 50.5 4.2C52.5 4.2 53.6 5.5 53.3 7.8L52.2 16.5H49.4L50.3 8.8C50.4 7.8 50 7.2 49 7.2C47.8 7.2 46.7 8.2 46.4 10.3L45.6 16.5H42.5Z" fill="#003087"/></svg>""";

    /// <summary>
    /// SVG icon for Apple Pay.
    /// </summary>
    private const string ApplePayIconSvg = """<svg class="w-12 h-5" viewBox="0 0 50 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.6 2.7C10.2 2 10.7 1 10.5 0C9.6 0.1 8.5 0.6 7.9 1.3C7.3 1.9 6.7 2.9 6.9 3.9C7.9 4 8.9 3.5 9.6 2.7ZM10.5 4.1C9 4 7.7 4.9 7 4.9C6.2 4.9 5.1 4.1 3.8 4.2C2.2 4.2 0.8 5 0 6.3C-1.5 9 0.1 12.9 1.6 15.1C2.3 16.2 3.2 17.5 4.4 17.4C5.6 17.4 6 16.6 7.4 16.6C8.8 16.6 9.2 17.4 10.5 17.4C11.7 17.4 12.5 16.2 13.2 15.1C14 13.9 14.4 12.7 14.4 12.6C14.4 12.6 11.8 11.6 11.8 8.7C11.8 6.2 13.8 5 13.9 5C12.7 3.2 10.8 4.1 10.5 4.1Z" fill="currentColor"/><path d="M21.2 1.3C24.6 1.3 27 3.7 27 7.1C27 10.6 24.5 13 21 13H17.7V17.3H14.8V1.3H21.2ZM17.7 10.5H20.4C22.7 10.5 24 9.2 24 7.1C24 5 22.7 3.7 20.4 3.7H17.7V10.5Z" fill="currentColor"/><path d="M28.1 14C28.1 11.8 29.8 10.4 32.8 10.3L36.2 10.1V9.2C36.2 7.8 35.2 6.9 33.5 6.9C32 6.9 31 7.6 30.8 8.7H28.2C28.3 6.2 30.5 4.6 33.6 4.6C36.8 4.6 38.9 6.2 38.9 8.9V17.3H36.3V15.2H36.2C35.5 16.6 33.8 17.5 32.1 17.5C29.6 17.5 28.1 16.1 28.1 14ZM36.2 12.8V11.9L33.2 12.1C31.6 12.2 30.8 12.9 30.8 13.9C30.8 14.9 31.7 15.6 33 15.6C34.8 15.6 36.2 14.4 36.2 12.8Z" fill="currentColor"/><path d="M41.2 21V18.8C41.4 18.8 41.8 18.9 42.1 18.9C43.2 18.9 43.9 18.4 44.2 17.4L44.4 16.7L39.5 4.8H42.5L45.8 14.4H45.9L49.2 4.8H52.1L47 17.6C46 20.4 44.7 21.2 42.3 21.2C42 21 41.5 21 41.2 21Z" fill="currentColor"/></svg>""";

    /// <summary>
    /// SVG icon for Google Pay.
    /// </summary>
    private const string GooglePayIconSvg = """<svg class="w-12 h-5" viewBox="0 0 50 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.8 10.5V16.3H22V1.5H27C28.4 1.5 29.6 2 30.5 2.9C31.5 3.8 32 4.9 32 6.2C32 7.6 31.5 8.7 30.5 9.6C29.6 10.5 28.4 10.5 27 10.5H23.8ZM23.8 3.2V8.8H27C27.9 8.8 28.6 8.5 29.1 7.9C29.7 7.3 30 6.8 30 6C30 5.3 29.7 4.7 29.1 4.1C28.5 3.5 27.8 3.2 27 3.2H23.8Z" fill="#5F6368"/><path d="M37 6.3C38.5 6.3 39.7 6.7 40.6 7.6C41.5 8.5 42 9.6 42 11V16.3H40.2V14.9H40.1C39.2 16.1 38 16.5 36.7 16.5C35.5 16.5 34.5 16.2 33.7 15.5C32.9 14.8 32.5 13.9 32.5 12.9C32.5 11.8 32.9 10.9 33.8 10.2C34.7 9.5 35.8 9.2 37.2 9.2C38.4 9.2 39.4 9.4 40.1 9.9V9.5C40.1 8.7 39.8 8.1 39.2 7.5C38.6 6.9 37.9 6.6 37.1 6.6C35.9 6.6 35 7.1 34.4 8L32.8 7C33.7 5.9 35.1 6.3 37 6.3ZM34.4 12.9C34.4 13.5 34.7 14 35.2 14.3C35.7 14.7 36.3 14.9 37 14.9C37.9 14.9 38.8 14.5 39.5 13.9C40.2 13.2 40.5 12.5 40.5 11.6C39.9 11.1 39 10.8 37.8 10.8C36.9 10.8 36.1 11 35.5 11.4C34.8 11.8 34.4 12.3 34.4 12.9Z" fill="#5F6368"/><path d="M50 6.5L44.4 19.5H42.5L44.5 15.1L40.5 6.5H42.5L45.4 13.2L48.2 6.5H50Z" fill="#5F6368"/><path d="M16 8.5C16 7.9 16 7.3 15.9 6.8H8.2V10H12.5C12.3 11.1 11.7 12.1 10.8 12.7V15H13.5C15.1 13.5 16 11.2 16 8.5Z" fill="#4285F4"/><path d="M8.2 17C10.6 17 12.6 16.2 13.5 15L10.8 12.7C10 13.2 9.2 13.5 8.2 13.5C5.9 13.5 3.9 11.9 3.2 9.8H0.4V12.2C1.8 14.9 4.8 17 8.2 17Z" fill="#34A853"/><path d="M3.2 9.8C3 9.2 2.9 8.6 2.9 8C2.9 7.4 3 6.8 3.2 6.2V3.8H0.4C-0.2 5.1 -0.5 6.5 -0.5 8C-0.5 9.5 -0.2 10.9 0.4 12.2L3.2 9.8Z" fill="#FBBC05"/><path d="M8.2 2.5C9.4 2.5 10.5 2.9 11.3 3.7L13.6 1.4C12.1 0 10.3 -0.7 8.2 -0.7C4.8 -0.7 1.8 1.4 0.4 3.8L3.2 6.2C3.9 4.1 5.9 2.5 8.2 2.5Z" fill="#EA4335"/></svg>""";

    /// <inheritdoc />
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "braintree",
        DisplayName = "Braintree",
        Icon = "icon-credit-card",
        Description = "Accept payments via Braintree. Supports credit cards, PayPal, Apple Pay, and Google Pay.",
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

            ### 7. Test Card Numbers

            Use these test cards with any future expiry date and any 3-digit CVV:

            | Card Number | Result |
            |-------------|--------|
            | `4111 1111 1111 1111` | Successful transaction |
            | `4000 1111 1111 1115` | Processor Declined |
            | `4000 0000 0000 3063` | 3D Secure Required |
            | `5555 5555 5555 4444` | Mastercard success |
            | `378282246310005` | American Express success |

            ### 8. Test PayPal Accounts

            Use PayPal sandbox buyer accounts from the PayPal Developer Dashboard:
            - Create sandbox accounts at developer.paypal.com
            - Use the buyer email/password in the PayPal popup

            ### 9. Going Live

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
            Description = "Pay with Visa, Mastercard, American Express, Discover, and more.",
            IntegrationType = PaymentIntegrationType.HostedFields,
            IsExpressCheckout = false,
            DefaultSortOrder = 10,
            MethodType = PaymentMethodType.Cards
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
            MethodType = PaymentMethodType.PayPal
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
            DefaultSortOrder = 2,
            MethodType = PaymentMethodType.GooglePay
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

            // Return session with adapter configuration for Braintree Drop-in
            // SDK versions updated to 3.106.0+ for SSL certificate compatibility (expires June 2025)
            return PaymentSessionResult.HostedFields(
                providerAlias: Metadata.Alias,
                methodAlias: request.MethodAlias ?? "cards",
                adapterUrl: BraintreePaymentAdapterUrl,
                jsSdkUrl: "https://js.braintreegateway.com/web/dropin/1.44.1/js/dropin.min.js",
                sdkConfig: new Dictionary<string, object>
                {
                    // URLs for individual SDK components (v3.106.0 - updated for SSL cert compatibility)
                    ["clientSdkUrl"] = "https://js.braintreegateway.com/web/3.106.0/js/client.min.js",
                    ["hostedFieldsSdkUrl"] = "https://js.braintreegateway.com/web/3.106.0/js/hosted-fields.min.js",
                    ["paypalSdkUrl"] = "https://js.braintreegateway.com/web/3.106.0/js/paypal-checkout.min.js",
                    ["applePaySdkUrl"] = "https://js.braintreegateway.com/web/3.106.0/js/apple-pay.min.js",
                    ["googlePaySdkUrl"] = "https://js.braintreegateway.com/web/3.106.0/js/google-payment.min.js",
                    ["dataCollectorSdkUrl"] = "https://js.braintreegateway.com/web/3.106.0/js/data-collector.min.js",

                    // Drop-in UI configuration
                    ["dropIn"] = new Dictionary<string, object>
                    {
                        ["card"] = new Dictionary<string, object>
                        {
                            ["vault"] = new Dictionary<string, object> { ["vaultCard"] = false }
                        }
                    },

                    // PayPal configuration
                    ["paypal"] = new Dictionary<string, object>
                    {
                        ["flow"] = "checkout",
                        ["intent"] = "capture",
                        ["enableShippingAddress"] = true,
                        ["shippingAddressEditable"] = false
                    },

                    // Apple Pay configuration
                    ["applePay"] = new Dictionary<string, object>
                    {
                        ["displayName"] = request.Description ?? "Payment"
                    },

                    // Google Pay configuration
                    ["googlePay"] = new Dictionary<string, object>
                    {
                        ["merchantId"] = _merchantId ?? "",
                        ["transactionInfo"] = new Dictionary<string, object>
                        {
                            ["totalPriceStatus"] = "FINAL",
                            ["totalPrice"] = request.Amount.ToString(System.Globalization.CultureInfo.InvariantCulture),
                            ["currencyCode"] = request.Currency
                        },
                        ["environment"] = IsTestMode ? "TEST" : "PRODUCTION"
                    },

                    // Payment amount info for frontend
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
                },
                CustomFields = new Dictionary<string, string>
                {
                    ["invoice_id"] = request.InvoiceId.ToString()
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
    private const string BraintreeExpressAdapterUrl = "/_content/Merchello/js/checkout/adapters/braintree-express-adapter.js";

    /// <inheritdoc />
    /// <remarks>
    /// Returns Braintree Drop-in configuration for express checkout methods (PayPal, Apple Pay, Google Pay).
    /// Each method uses Braintree's unified Drop-in UI for a consistent experience.
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
        var normalizedAlias = methodAlias.ToLowerInvariant();
        if (normalizedAlias != "paypal" && normalizedAlias != "applepay" && normalizedAlias != "googlepay")
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

            // Map method alias to method type
            var methodType = normalizedAlias switch
            {
                "paypal" => PaymentMethodType.PayPal,
                "applepay" => PaymentMethodType.ApplePay,
                "googlepay" => PaymentMethodType.GooglePay,
                _ => (PaymentMethodType?)null
            };

            return new ExpressCheckoutClientConfig
            {
                ProviderAlias = Metadata.Alias,
                MethodAlias = methodAlias,
                MethodType = methodType,
                SdkUrl = "https://js.braintreegateway.com/web/dropin/1.44.1/js/dropin.min.js",
                CustomAdapterUrl = BraintreeExpressAdapterUrl,
                SdkConfig = new Dictionary<string, object>
                {
                    ["clientToken"] = clientToken,
                    ["displayName"] = Configuration?.GetValue("merchantAccountId") ?? "Store",
                    ["googleMerchantId"] = _merchantId ?? "",
                    ["environment"] = IsTestMode ? "sandbox" : "production"
                },
                IsAvailable = true
            };
        }
        catch (Exception)
        {
            // If token generation fails, express checkout is not available
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
            Result<Transaction> result;

            if (request.Amount.HasValue)
            {
                // Partial refund
                result = await _gateway.Transaction.RefundAsync(
                    request.TransactionId,
                    request.Amount.Value);
            }
            else
            {
                // Full refund
                result = await _gateway.Transaction.RefundAsync(request.TransactionId);
            }

            if (result.IsSuccess())
            {
                return RefundResult.Successful(
                    refundTransactionId: result.Target.Id,
                    amount: result.Target.Amount ?? request.Amount ?? 0);
            }

            return RefundResult.Failure(
                errorMessage: result.Message);
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
            return Task.FromResult(false);
        }
        catch (Exception)
        {
            return Task.FromResult(false);
        }
    }

    /// <inheritdoc />
    public override Task<WebhookProcessingResult> ProcessWebhookAsync(
        string payload,
        IDictionary<string, string> headers,
        CancellationToken cancellationToken = default)
    {
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
