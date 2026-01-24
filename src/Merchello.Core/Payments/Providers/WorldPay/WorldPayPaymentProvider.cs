using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.WorldPay.Models;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Providers;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Payments.Providers.WorldPay;

/// <summary>
/// WorldPay payment provider using the Access Worldpay platform (REST API).
/// Supports credit cards via Checkout SDK (hosted fields), Apple Pay, and Google Pay.
/// </summary>
/// <remarks>
/// Configuration required:
/// - serviceKey: Basic Auth username (from Implementation Manager)
/// - clientKey: Basic Auth password (from Implementation Manager)
/// - merchantEntity: Entity for billing/reporting
/// - appleMerchantId: (Optional) Apple Pay Merchant ID
/// - googleMerchantId: (Optional) Google Pay Merchant ID
///
/// Webhook endpoint: /umbraco/merchello/webhooks/payments/worldpay
/// Required webhook events: authorized, sentForSettlement, refused, refundFailed
/// </remarks>
public class WorldPayPaymentProvider(ILogger<WorldPayPaymentProvider> logger) : PaymentProviderBase
{
    private HttpClient? _httpClient;
    private string? _merchantEntity;
    private string? _merchantId; // AccessCheckoutIdentity for SDK
    private string? _appleMerchantId;
    private string? _googleMerchantId;
    private string? _narrativeLine1; // Statement descriptor
    private string _defaultCurrency = "GBP"; // Default currency for payments

    /// <summary>
    /// URL to the WorldPay payment adapter script (cards).
    /// </summary>
    private const string WorldPayPaymentAdapterUrl = "/js/checkout/adapters/worldpay-payment-adapter.js";

    /// <summary>
    /// URL to the WorldPay express checkout adapter script (Apple Pay, Google Pay).
    /// </summary>
    private const string WorldPayExpressAdapterUrl = "/js/checkout/adapters/worldpay-express-adapter.js";

    /// <summary>
    /// API version header value for Access Worldpay.
    /// </summary>
    private const string ApiVersion = "2025-01-01";

    /// <summary>
    /// SVG icon for card payments.
    /// </summary>
    private const string CardIconSvg = """<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 9h20" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="13" width="5" height="2" rx="0.5" fill="currentColor" opacity="0.5"/></svg>""";

    /// <summary>
    /// SVG icon for Apple Pay.
    /// </summary>
    private const string ApplePayIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="currentColor"/></svg>""";

    /// <summary>
    /// SVG icon for Google Pay.
    /// </summary>
    private const string GooglePayIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>""";

    /// <inheritdoc />
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "worldpay",
        DisplayName = "WorldPay",
        Icon = "icon-credit-card",
        Description = "Accept payments via WorldPay. Supports credit cards with 3D Secure, Apple Pay, and Google Pay.",
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        SupportsAuthAndCapture = true,
        RequiresWebhook = true,
        SetupInstructions = """
            ## WorldPay Setup Instructions

            ### 1. Contact WorldPay

            1. Contact your WorldPay Implementation Manager to get Access Worldpay credentials
            2. You will receive:
               - **Service Key** (username for API authentication)
               - **Client Key** (password for API authentication)
               - **Merchant Entity** (for billing and reporting)
               - **AccessCheckoutIdentity** (Merchant ID for the Checkout SDK)

            ### 2. Configure API Credentials

            Enter the credentials provided by your Implementation Manager:
            - **Service Key**: Your API username
            - **Client Key**: Your API password (sensitive)
            - **Merchant Entity**: Your entity for billing/reporting (e.g., "default")
            - **Merchant ID**: Your AccessCheckoutIdentity for the Checkout SDK

            ### 3. Configure Webhooks

            Contact your Implementation Manager to configure webhooks:
            1. Provide your webhook URL:
               ```
               https://your-site.com/umbraco/merchello/webhooks/payments/worldpay
               ```
            2. Request these events be enabled:
               - `authorized` - Payment authorized
               - `sentForSettlement` - Payment submitted for settlement
               - `refused` - Payment declined
               - `refundFailed` - Refund unsuccessful
               - Chargeback events (if needed)

            ### 4. Enable Apple Pay (Optional)

            Apple Pay requires additional setup:
            1. Create an Apple Merchant ID at developer.apple.com
            2. Request a CSR from your WorldPay Implementation Manager
            3. Create a payment processing certificate using the CSR
            4. Register and verify your domain with Apple
            5. Enter your Apple Merchant ID in the configuration

            ### 5. Enable Google Pay (Optional)

            Google Pay setup:
            1. Request Google Pay enablement from your Implementation Manager
            2. You will receive a Gateway Merchant ID
            3. For production, complete Google Pay merchant registration at pay.google.com
            4. Enter your Google Merchant ID in the configuration

            ### 6. DNS Whitelisting

            Whitelist the following URLs (NOT IP addresses):
            - Testing: `https://try.access.worldpay.com/`
            - Production: `https://access.worldpay.com/`

            ### 7. Test Card Numbers

            **Basic test cards** (any future expiry, any 3-digit CVV):

            | Card Number | Result |
            |-------------|--------|
            | `4444 3333 2222 1111` | Successful transaction |
            | `4444 3333 2222 1112` | Processor Declined |
            | `5555 5555 5555 4444` | Mastercard success |
            | `3434 343434 34343` | American Express success |

            **3D Secure test cards**:

            | Card Number | Result |
            |-------------|--------|
            | `4000 0000 0000 1091` | 3DS Challenge |
            | `4000 0000 0000 1000` | 3DS Frictionless |

            ### 8. Going Live

            1. Get production credentials from your Implementation Manager
            2. Create a new webhook endpoint for your production URL
            3. Update the configuration with production keys
            4. Uncheck **Test Mode** in the provider settings
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
            CheckoutIconHtml = """<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 9h20" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="13" width="5" height="2" rx="0.5" fill="currentColor" opacity="0.5"/></svg>""",
            Description = "Pay with Visa, Mastercard, American Express, Discover, and more.",
            IntegrationType = PaymentIntegrationType.HostedFields,
            IsExpressCheckout = false,
            DefaultSortOrder = 10,
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
                Key = "serviceKey",
                Label = "Service Key",
                Description = "Your API username provided by WorldPay Implementation Manager",
                FieldType = ConfigurationFieldType.Password,
                IsSensitive = true,
                IsRequired = true,
                Placeholder = "Your service key"
            },
            new()
            {
                Key = "clientKey",
                Label = "Client Key",
                Description = "Your API password provided by WorldPay Implementation Manager",
                FieldType = ConfigurationFieldType.Password,
                IsSensitive = true,
                IsRequired = true,
                Placeholder = "Your client key"
            },
            new()
            {
                Key = "merchantEntity",
                Label = "Merchant Entity",
                Description = "Your entity for billing and reporting",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                Placeholder = "default"
            },
            new()
            {
                Key = "merchantId",
                Label = "Merchant ID (AccessCheckoutIdentity)",
                Description = "Your AccessCheckoutIdentity for the Checkout SDK",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                Placeholder = "Your merchant ID"
            },
            new()
            {
                Key = "narrativeLine1",
                Label = "Statement Descriptor",
                Description = "Text that appears on customer's statement (max 25 chars)",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                Placeholder = "Your Store Name"
            },
            new()
            {
                Key = "appleMerchantId",
                Label = "Apple Pay Merchant ID",
                Description = "Optional: Your Apple Pay Merchant ID for Apple Pay support",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                Placeholder = "merchant.com.yourcompany"
            },
            new()
            {
                Key = "googleMerchantId",
                Label = "Google Pay Merchant ID",
                Description = "Optional: Your Google Pay Merchant ID for Google Pay support",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                Placeholder = "Your Gateway Merchant ID"
            },
            new()
            {
                Key = "defaultCurrency",
                Label = "Default Currency",
                Description = "Default currency code for payments (e.g., GBP, USD, EUR)",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                DefaultValue = "GBP",
                Placeholder = "GBP"
            }
        ]);
    }

    /// <inheritdoc />
    public override async ValueTask ConfigureAsync(
        PaymentProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        await base.ConfigureAsync(configuration, cancellationToken);

        var serviceKey = configuration?.GetValue("serviceKey");
        var clientKey = configuration?.GetValue("clientKey");
        _merchantEntity = configuration?.GetValue("merchantEntity");
        _merchantId = configuration?.GetValue("merchantId");
        _narrativeLine1 = configuration?.GetValue("narrativeLine1");
        _appleMerchantId = configuration?.GetValue("appleMerchantId");
        _googleMerchantId = configuration?.GetValue("googleMerchantId");
        _defaultCurrency = configuration?.GetValue("defaultCurrency") ?? "GBP";

        if (!string.IsNullOrEmpty(serviceKey) && !string.IsNullOrEmpty(clientKey))
        {
            _httpClient = new HttpClient
            {
                BaseAddress = new Uri(IsTestMode
                    ? "https://try.access.worldpay.com/"
                    : "https://access.worldpay.com/")
            };

            // Set Basic Auth header
            var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{serviceKey}:{clientKey}"));
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

            // Set API version header
            _httpClient.DefaultRequestHeaders.Add("WP-Api-Version", ApiVersion);

            // Set content type headers
            _httpClient.DefaultRequestHeaders.Accept.Add(
                new MediaTypeWithQualityHeaderValue("application/vnd.worldpay.payments-v7+json"));
        }
    }

    /// <summary>
    /// Whether the provider is configured in test mode.
    /// </summary>
    public bool IsTestMode => Configuration?.IsTestMode ?? true;

    // =====================================================
    // Payment Flow
    // =====================================================

    /// <inheritdoc />
    public override Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_httpClient is null || string.IsNullOrEmpty(_merchantId))
        {
            return Task.FromResult(PaymentSessionResult.Failed(
                "WorldPay is not configured. Please add your API credentials."));
        }

        var methodAlias = request.MethodAlias ?? "cards";

        // For cards, return hosted fields configuration
        if (methodAlias == "cards")
        {
            return Task.FromResult(PaymentSessionResult.HostedFields(
                providerAlias: Metadata.Alias,
                methodAlias: methodAlias,
                adapterUrl: WorldPayPaymentAdapterUrl,
                jsSdkUrl: IsTestMode
                    ? "https://try.access.worldpay.com/access-checkout/v2/checkout.js"
                    : "https://access.worldpay.com/access-checkout/v2/checkout.js",
                sdkConfig: new Dictionary<string, object>
                {
                    ["merchantId"] = _merchantId,
                    ["isTestMode"] = IsTestMode,
                    ["amount"] = request.Amount,
                    ["currency"] = request.Currency,
                    ["invoiceId"] = request.InvoiceId.ToString()
                },
                sessionId: request.InvoiceId.ToString()));
        }

        // For wallet methods, return widget configuration
        return Task.FromResult(PaymentSessionResult.Widget(
            providerAlias: Metadata.Alias,
            methodAlias: methodAlias,
            adapterUrl: WorldPayExpressAdapterUrl,
            jsSdkUrl: methodAlias == "googlepay"
                ? "https://pay.google.com/gp/p/js/pay.js"
                : "", // Apple Pay SDK is built into Safari
            sdkConfig: new Dictionary<string, object>
            {
                ["merchantId"] = _merchantId,
                ["merchantEntity"] = _merchantEntity ?? "",
                ["appleMerchantId"] = _appleMerchantId ?? "",
                ["googleMerchantId"] = _googleMerchantId ?? "",
                ["isTestMode"] = IsTestMode,
                ["amount"] = request.Amount,
                ["currency"] = request.Currency,
                ["invoiceId"] = request.InvoiceId.ToString(),
                ["countryCode"] = "GB", // Default, can be overridden
                ["returnUrl"] = request.ReturnUrl ?? "",
                ["cancelUrl"] = request.CancelUrl ?? ""
            },
            sessionId: request.InvoiceId.ToString()));
    }

    /// <inheritdoc />
    public override async Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_httpClient is null)
        {
            return PaymentResult.Failed("WorldPay is not configured.");
        }

        if (string.IsNullOrEmpty(request.PaymentMethodToken))
        {
            return PaymentResult.Failed("Payment session state is required.");
        }

        try
        {
            // Check if this is a 3DS challenge completion
            var challengeReference = request.Metadata?.GetValueOrDefault("challengeReference");
            var stored3DSAuth = request.Metadata?.GetValueOrDefault("threeDSAuthentication");

            WorldPay3DSAuthentication? threeDSAuth = null;

            // If we have stored 3DS authentication data, use it
            if (!string.IsNullOrEmpty(stored3DSAuth))
            {
                threeDSAuth = JsonSerializer.Deserialize<WorldPay3DSAuthentication>(stored3DSAuth, WorldPayJsonOptions.Default);
            }
            // If completing a challenge, verify it first
            else if (!string.IsNullOrEmpty(challengeReference))
            {
                var verifyResult = await Verify3DSChallengeAsync(
                    request.InvoiceId.ToString(),
                    challengeReference,
                    cancellationToken);

                if (verifyResult.Outcome != "authenticated")
                {
                    return PaymentResult.Failed($"3DS verification failed: {verifyResult.Outcome}");
                }

                threeDSAuth = verifyResult.Authentication;
            }
            // Otherwise, initiate 3DS authentication
            else
            {
                var authResult = await Authenticate3DSAsync(request, cancellationToken);

                switch (authResult.Outcome)
                {
                    case "authenticated":
                        threeDSAuth = authResult.Authentication;
                        break;

                    case "challenged":
                        // Return a special result that indicates a challenge is required
                        return new PaymentResult
                        {
                            Success = false,
                            Status = PaymentResultStatus.RequiresAction,
                            ActionRequired = new PaymentActionRequired
                            {
                                Type = "3ds_challenge",
                                ChallengeUrl = authResult.Challenge?.Url,
                                ChallengeData = new Dictionary<string, string?>
                                {
                                    ["reference"] = authResult.Challenge?.Reference,
                                    ["jwt"] = authResult.Challenge?.Jwt,
                                    ["payload"] = authResult.Challenge?.Payload,
                                    ["sessionState"] = request.PaymentMethodToken
                                }
                            },
                            ErrorMessage = "3D Secure challenge required"
                        };

                    case "authenticationFailed":
                    case "authenticationUnavailable":
                        // Can proceed without 3DS (no liability shift) or fail based on config
                        logger.LogWarning("3DS authentication failed: {Outcome}. Proceeding without 3DS.", authResult.Outcome);
                        break;

                    default:
                        return PaymentResult.Failed($"3DS authentication failed: {authResult.Outcome}");
                }
            }

            // Build authorization request with 3DS data if available
            var authRequest = new WorldPayAuthorizationRequest
            {
                TransactionReference = request.InvoiceId.ToString(),
                Merchant = new WorldPayMerchant
                {
                    Entity = _merchantEntity ?? "default"
                },
                Instruction = new WorldPayInstruction
                {
                    Narrative = new WorldPayNarrative
                    {
                        Line1 = _narrativeLine1 ?? "Payment"
                    },
                    Value = new WorldPayValue
                    {
                        Currency = _defaultCurrency,
                        Amount = (int)Math.Round((request.Amount ?? 0) * 100, MidpointRounding.AwayFromZero) // Convert to minor units
                    },
                    PaymentInstrument = new WorldPayPaymentInstrument
                    {
                        Type = "card/checkout",
                        SessionState = request.PaymentMethodToken
                    },
                    // Include 3DS authentication data if available
                    CustomerAuthentication = threeDSAuth != null ? new WorldPayCustomerAuthentication
                    {
                        Version = threeDSAuth.Version,
                        Eci = threeDSAuth.Eci,
                        AuthenticationValue = threeDSAuth.AuthenticationValue,
                        TransactionId = threeDSAuth.TransactionId
                    } : null
                },
                Channel = "ecom"
            };

            var json = JsonSerializer.Serialize(authRequest, WorldPayJsonOptions.Default);
            var content = new StringContent(json, Encoding.UTF8, "application/vnd.worldpay.payments-v7+json");

            var response = await _httpClient.PostAsync("payments/authorizations", content, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("WorldPay authorization failed: {StatusCode} - {Response}",
                    response.StatusCode, responseBody);

                var errorResponse = JsonSerializer.Deserialize<WorldPayErrorResponse>(responseBody, WorldPayJsonOptions.Default);
                return PaymentResult.Failed(
                    errorResponse?.Message ?? $"Payment failed with status {response.StatusCode}",
                    errorResponse?.ErrorName);
            }

            var authResponse = JsonSerializer.Deserialize<WorldPayAuthorizationResponse>(responseBody, WorldPayJsonOptions.Default);

            if (authResponse?.Outcome == "authorized")
            {
                // Extract transaction ID from response links or generate one
                var transactionId = ExtractTransactionIdFromLinks(authResponse.Links) ??
                                    $"wp_{request.InvoiceId}_{DateTime.UtcNow:yyyyMMddHHmmss}";

                return new PaymentResult
                {
                    Success = true,
                    TransactionId = transactionId,
                    Amount = request.Amount ?? 0,
                    Status = PaymentResultStatus.Completed
                };
            }

            return PaymentResult.Failed($"Payment {authResponse?.Outcome ?? "failed"}");
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "HTTP error calling WorldPay API");
            return PaymentResult.Failed($"Network error: {ex.Message}");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing WorldPay payment");
            return PaymentResult.Failed(ex.Message);
        }
    }

    /// <summary>
    /// Performs 3DS authentication for a card payment.
    /// </summary>
    private async Task<WorldPay3DSAuthResponse> Authenticate3DSAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken)
    {
        if (_httpClient == null)
        {
            throw new InvalidOperationException("WorldPay provider has not been configured. Call ConfigureAsync first.");
        }

        // Build 3DS authentication request
        var authRequest = new WorldPay3DSAuthRequest
        {
            TransactionReference = request.InvoiceId.ToString(),
            Merchant = new WorldPayMerchant
            {
                Entity = _merchantEntity ?? "default"
            },
            Instruction = new WorldPay3DSInstruction
            {
                PaymentInstrument = new WorldPay3DSPaymentInstrument
                {
                    Type = "card/checkout",
                    SessionState = request.PaymentMethodToken,
                    CardHolderName = request.CustomerName,
                    BillingAddress = ExtractBillingAddress(request)
                },
                Value = new WorldPayValue
                {
                    Currency = _defaultCurrency,
                    Amount = (int)Math.Round((request.Amount ?? 0) * 100, MidpointRounding.AwayFromZero)
                }
            },
            DeviceData = ExtractDeviceData(request),
            Challenge = new WorldPay3DSChallenge
            {
                WindowSize = request.Metadata?.GetValueOrDefault("challengeWindowSize") ?? "390x400",
                Preference = "noPreference", // Let issuer decide
                ReturnUrl = request.Metadata?.GetValueOrDefault("returnUrl") ?? ""
            },
            RiskData = new WorldPay3DSRiskData
            {
                Account = new WorldPay3DSAccount
                {
                    PreviousSuspiciousActivity = false,
                    Type = string.IsNullOrEmpty(request.CustomerEmail) ? "guest" : "registeredUser",
                    Email = request.CustomerEmail
                }
            }
        };

        var json = JsonSerializer.Serialize(authRequest, WorldPayJsonOptions.Default);

        // Use the 3DS API content type
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "verifications/customers/3ds/authentication")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/vnd.worldpay.verifications.customers-v3.hal+json")
        };

        // Add Accept header for 3DS API
        httpRequest.Headers.Accept.Clear();
        httpRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.worldpay.verifications.customers-v3.hal+json"));

        var response = await _httpClient!.SendAsync(httpRequest, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("WorldPay 3DS authentication failed: {StatusCode} - {Response}",
                response.StatusCode, responseBody);

            return new WorldPay3DSAuthResponse { Outcome = "authenticationFailed" };
        }

        var authResponse = JsonSerializer.Deserialize<WorldPay3DSAuthResponse>(responseBody, WorldPayJsonOptions.Default);
        return authResponse ?? new WorldPay3DSAuthResponse { Outcome = "authenticationFailed" };
    }

    /// <summary>
    /// Verifies a 3DS challenge response.
    /// </summary>
    private async Task<WorldPay3DSAuthResponse> Verify3DSChallengeAsync(
        string transactionReference,
        string challengeReference,
        CancellationToken cancellationToken)
    {
        if (_httpClient == null)
        {
            throw new InvalidOperationException("WorldPay provider has not been configured. Call ConfigureAsync first.");
        }

        var verifyRequest = new WorldPay3DSVerifyRequest
        {
            TransactionReference = transactionReference,
            Challenge = new WorldPay3DSChallengeVerify
            {
                Reference = challengeReference
            }
        };

        var json = JsonSerializer.Serialize(verifyRequest, WorldPayJsonOptions.Default);

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "verifications/customers/3ds/verification")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/vnd.worldpay.verifications.customers-v3.hal+json")
        };

        httpRequest.Headers.Accept.Clear();
        httpRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.worldpay.verifications.customers-v3.hal+json"));

        var response = await _httpClient!.SendAsync(httpRequest, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("WorldPay 3DS verification failed: {StatusCode} - {Response}",
                response.StatusCode, responseBody);

            return new WorldPay3DSAuthResponse { Outcome = "verificationFailed" };
        }

        var verifyResponse = JsonSerializer.Deserialize<WorldPay3DSAuthResponse>(responseBody, WorldPayJsonOptions.Default);
        return verifyResponse ?? new WorldPay3DSAuthResponse { Outcome = "verificationFailed" };
    }

    /// <summary>
    /// Extracts device data from the request metadata.
    /// </summary>
    private static WorldPay3DSDeviceData? ExtractDeviceData(ProcessPaymentRequest request)
    {
        if (request.Metadata is null)
            return null;

        return new WorldPay3DSDeviceData
        {
            CollectionReference = request.Metadata.GetValueOrDefault("ddcCollectionReference"),
            AcceptHeader = request.Metadata.GetValueOrDefault("acceptHeader") ?? "text/html",
            UserAgentHeader = request.Metadata.GetValueOrDefault("userAgent"),
            BrowserLanguage = request.Metadata.GetValueOrDefault("browserLanguage") ?? "en-GB",
            IpAddress = request.Metadata.GetValueOrDefault("ipAddress"),
            BrowserScreenHeight = int.TryParse(request.Metadata.GetValueOrDefault("screenHeight"), out var h) ? h : null,
            BrowserScreenWidth = int.TryParse(request.Metadata.GetValueOrDefault("screenWidth"), out var w) ? w : null,
            BrowserColorDepth = request.Metadata.GetValueOrDefault("colorDepth"),
            TimeZone = request.Metadata.GetValueOrDefault("timeZone"),
            BrowserJavaEnabled = false,
            BrowserJavascriptEnabled = true
        };
    }

    /// <summary>
    /// Extracts billing address from the request metadata.
    /// </summary>
    private static WorldPay3DSBillingAddress? ExtractBillingAddress(ProcessPaymentRequest request)
    {
        if (request.Metadata is null)
            return null;

        var address1 = request.Metadata.GetValueOrDefault("billingAddress1");
        if (string.IsNullOrEmpty(address1))
            return null;

        return new WorldPay3DSBillingAddress
        {
            Address1 = address1,
            Address2 = request.Metadata.GetValueOrDefault("billingAddress2"),
            City = request.Metadata.GetValueOrDefault("billingCity"),
            PostalCode = request.Metadata.GetValueOrDefault("billingPostalCode"),
            CountryCode = request.Metadata.GetValueOrDefault("billingCountryCode") ?? "GB"
        };
    }

    // =====================================================
    // Express Checkout
    // =====================================================

    /// <inheritdoc />
    public override Task<ExpressCheckoutClientConfig?> GetExpressCheckoutClientConfigAsync(
        string methodAlias,
        decimal amount,
        string currency,
        CancellationToken cancellationToken = default)
    {
        if (_httpClient is null || string.IsNullOrEmpty(_merchantId))
        {
            return Task.FromResult<ExpressCheckoutClientConfig?>(null);
        }

        var method = GetAvailablePaymentMethods()
            .FirstOrDefault(m => string.Equals(m.Alias, methodAlias, StringComparison.OrdinalIgnoreCase));

        if (method is not { IsExpressCheckout: true })
        {
            return Task.FromResult<ExpressCheckoutClientConfig?>(null);
        }

        // Check if wallet is configured
        if (methodAlias == "applepay" && string.IsNullOrEmpty(_appleMerchantId))
        {
            return Task.FromResult<ExpressCheckoutClientConfig?>(null);
        }

        if (methodAlias == "googlepay" && string.IsNullOrEmpty(_googleMerchantId))
        {
            return Task.FromResult<ExpressCheckoutClientConfig?>(null);
        }

        var config = new ExpressCheckoutClientConfig
        {
            ProviderAlias = Metadata.Alias,
            MethodAlias = methodAlias,
            MethodType = method.MethodType,
            SdkUrl = methodAlias == "googlepay"
                ? "https://pay.google.com/gp/p/js/pay.js"
                : null, // Apple Pay is built into Safari
            CustomAdapterUrl = WorldPayExpressAdapterUrl,
            SdkConfig = new Dictionary<string, object>
            {
                ["merchantId"] = _merchantId,
                ["merchantEntity"] = _merchantEntity ?? "",
                ["appleMerchantId"] = _appleMerchantId ?? "",
                ["googleMerchantId"] = _googleMerchantId ?? "",
                ["isTestMode"] = IsTestMode,
                ["environment"] = IsTestMode ? "TEST" : "PRODUCTION",
                ["amount"] = amount,
                ["currency"] = currency,
                ["countryCode"] = "GB",
                ["displayName"] = _narrativeLine1 ?? "Store"
            },
            IsAvailable = true
        };

        return Task.FromResult<ExpressCheckoutClientConfig?>(config);
    }

    /// <summary>
    /// Validates an Apple Pay merchant session.
    /// Called by the frontend during Apple Pay's onvalidatemerchant event.
    /// </summary>
    /// <param name="validationUrl">The validation URL provided by Apple Pay.</param>
    /// <param name="displayName">The display name for the merchant.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The merchant session object to pass back to Apple Pay, or null if validation fails.</returns>
    public async Task<object?> ValidateApplePayMerchantAsync(
        string validationUrl,
        string displayName,
        CancellationToken cancellationToken = default)
    {
        if (_httpClient == null)
        {
            logger.LogWarning("WorldPay Apple Pay validation failed: Provider not configured");
            return null;
        }

        if (string.IsNullOrEmpty(_appleMerchantId))
        {
            logger.LogWarning("WorldPay Apple Pay validation failed: Apple Pay Merchant ID not configured");
            return null;
        }

        try
        {
            // WorldPay Apple Pay validation request
            // The validation URL from Apple must be called with the merchant identity
            var validationRequest = new
            {
                validationUrl,
                merchantIdentifier = _appleMerchantId,
                displayName = displayName ?? _narrativeLine1 ?? "Store",
                initiative = "web",
                initiativeContext = "www.example.com" // This should be the domain from request, but WorldPay may override
            };

            var json = JsonSerializer.Serialize(validationRequest, WorldPayJsonOptions.Default);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            // WorldPay proxies the Apple Pay validation
            var response = await _httpClient.PostAsync("wallets/applepay/sessions", content, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning(
                    "WorldPay Apple Pay merchant validation failed: {StatusCode} - {Response}",
                    response.StatusCode,
                    responseBody);
                return null;
            }

            // Return the merchant session object as-is for Apple Pay
            var merchantSession = JsonSerializer.Deserialize<JsonElement>(responseBody, WorldPayJsonOptions.Default);
            return merchantSession;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "WorldPay Apple Pay merchant validation error");
            return null;
        }
    }

    /// <inheritdoc />
    public override async Task<ExpressCheckoutResult> ProcessExpressCheckoutAsync(
        ExpressCheckoutRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_httpClient is null)
        {
            return ExpressCheckoutResult.Failed("WorldPay is not configured.");
        }

        if (string.IsNullOrEmpty(request.PaymentToken))
        {
            return ExpressCheckoutResult.Failed("Wallet token is required.");
        }

        try
        {
            // Determine payment instrument type based on method
            var instrumentType = request.MethodAlias?.ToLowerInvariant() switch
            {
                "applepay" => "card/wallet+applepay",
                "googlepay" => "card/wallet+googlepay",
                _ => "card/wallet"
            };

            // Build authorization request with wallet token
            var authRequest = new WorldPayAuthorizationRequest
            {
                TransactionReference = $"exp_{Guid.NewGuid():N}"[..20],
                Merchant = new WorldPayMerchant
                {
                    Entity = _merchantEntity ?? "default"
                },
                Instruction = new WorldPayInstruction
                {
                    Narrative = new WorldPayNarrative
                    {
                        Line1 = _narrativeLine1 ?? "Payment"
                    },
                    Value = new WorldPayValue
                    {
                        Currency = request.Currency ?? _defaultCurrency,
                        Amount = (int)Math.Round(request.Amount * 100, MidpointRounding.AwayFromZero)
                    },
                    PaymentInstrument = new WorldPayPaymentInstrument
                    {
                        Type = instrumentType,
                        WalletToken = request.PaymentToken
                    }
                },
                Channel = "ecom"
            };

            var json = JsonSerializer.Serialize(authRequest, WorldPayJsonOptions.Default);
            var content = new StringContent(json, Encoding.UTF8, "application/vnd.worldpay.payments-v7+json");

            var response = await _httpClient.PostAsync("payments/authorizations", content, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("WorldPay express checkout failed: {StatusCode} - {Response}",
                    response.StatusCode, responseBody);

                var errorResponse = JsonSerializer.Deserialize<WorldPayErrorResponse>(responseBody, WorldPayJsonOptions.Default);
                return ExpressCheckoutResult.Failed(
                    errorResponse?.Message ?? $"Payment failed with status {response.StatusCode}");
            }

            var authResponse = JsonSerializer.Deserialize<WorldPayAuthorizationResponse>(responseBody, WorldPayJsonOptions.Default);

            if (authResponse?.Outcome == "authorized")
            {
                var transactionId = ExtractTransactionIdFromLinks(authResponse.Links) ??
                                    $"wp_exp_{DateTime.UtcNow:yyyyMMddHHmmss}";

                return ExpressCheckoutResult.Completed(
                    transactionId: transactionId,
                    amount: request.Amount);
            }

            return ExpressCheckoutResult.Failed($"Payment {authResponse?.Outcome ?? "failed"}");
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "HTTP error calling WorldPay API for express checkout");
            return ExpressCheckoutResult.Failed($"Network error: {ex.Message}");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing WorldPay express checkout");
            return ExpressCheckoutResult.Failed(ex.Message);
        }
    }

    // =====================================================
    // Capture
    // =====================================================

    /// <inheritdoc />
    public override async Task<PaymentCaptureResult> CapturePaymentAsync(
        string transactionId,
        decimal? amount = null,
        CancellationToken cancellationToken = default)
    {
        if (_httpClient is null)
        {
            return PaymentCaptureResult.Failure("WorldPay is not configured.");
        }

        try
        {
            // WorldPay uses HATEOAS - we need to call the settle link
            // For now, construct the URL based on transaction ID pattern
            var settleUrl = $"payments/settlements/{transactionId}";

            object settleRequest = amount.HasValue
                ? new { value = new { amount = (int)Math.Round(amount.Value * 100, MidpointRounding.AwayFromZero) } }
                : new { };

            var json = JsonSerializer.Serialize(settleRequest, WorldPayJsonOptions.Default);
            var content = new StringContent(json, Encoding.UTF8, "application/vnd.worldpay.payments-v7+json");

            var response = await _httpClient.PostAsync(settleUrl, content, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("WorldPay capture failed: {StatusCode} - {Response}",
                    response.StatusCode, responseBody);

                var errorResponse = JsonSerializer.Deserialize<WorldPayErrorResponse>(responseBody, WorldPayJsonOptions.Default);
                return PaymentCaptureResult.Failure(
                    errorResponse?.Message ?? $"Capture failed with status {response.StatusCode}");
            }

            return PaymentCaptureResult.Successful(
                transactionId: transactionId,
                amount: amount ?? 0);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error capturing WorldPay payment");
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
        if (_httpClient is null)
        {
            return RefundResult.Failure("WorldPay is not configured.");
        }

        try
        {
            // WorldPay recommends:
            // - Void within 15 minutes of authorization
            // - Refund after 90 minutes
            // For simplicity, we'll try refund (cancel) first, then fall back to refund
            var cancelUrl = $"payments/authorizations/cancellations/{request.TransactionId}";

            // Try void/cancel first
            var cancelResponse = await _httpClient.PostAsync(cancelUrl,
                new StringContent("{}", Encoding.UTF8, "application/vnd.worldpay.payments-v7+json"),
                cancellationToken);

            if (cancelResponse.IsSuccessStatusCode)
            {
                return RefundResult.Successful(
                    refundTransactionId: $"{request.TransactionId}-CANCEL-{DateTime.UtcNow:yyyyMMddHHmmss}",
                    amount: request.Amount ?? 0);
            }

            // If cancel fails, try refund
            var refundUrl = $"payments/refunds/{request.TransactionId}";

            object refundRequest = request.Amount.HasValue
                ? new { value = new { amount = (int)Math.Round(request.Amount.Value * 100, MidpointRounding.AwayFromZero) } }
                : new { };

            var json = JsonSerializer.Serialize(refundRequest, WorldPayJsonOptions.Default);
            var content = new StringContent(json, Encoding.UTF8, "application/vnd.worldpay.payments-v7+json");

            var response = await _httpClient.PostAsync(refundUrl, content, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("WorldPay refund failed: {StatusCode} - {Response}",
                    response.StatusCode, responseBody);

                var errorResponse = JsonSerializer.Deserialize<WorldPayErrorResponse>(responseBody, WorldPayJsonOptions.Default);
                return RefundResult.Failure(
                    errorResponse?.Message ?? $"Refund failed with status {response.StatusCode}");
            }

            return RefundResult.Successful(
                refundTransactionId: $"{request.TransactionId}-REFUND-{DateTime.UtcNow:yyyyMMddHHmmss}",
                amount: request.Amount ?? 0);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error refunding WorldPay payment");
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
        // WorldPay webhook validation requires IP whitelisting (configured with Implementation Manager)
        // For basic validation, we check that the payload is valid JSON with expected structure
        try
        {
            var webhookEvent = JsonSerializer.Deserialize<WorldPayWebhookEvent>(payload, WorldPayJsonOptions.Default);
            return Task.FromResult(webhookEvent?.EventType != null);
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "WorldPay webhook validation failed: Invalid JSON payload");
            return Task.FromResult(false);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "WorldPay webhook validation failed: Unexpected error");
            return Task.FromResult(false);
        }
    }

    /// <inheritdoc />
    public override Task<WebhookProcessingResult> ProcessWebhookAsync(
        string payload,
        IDictionary<string, string> headers,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var webhookEvent = JsonSerializer.Deserialize<WorldPayWebhookEvent>(payload, WorldPayJsonOptions.Default);

            if (webhookEvent is null)
            {
                return Task.FromResult(WebhookProcessingResult.Failure("Invalid webhook payload."));
            }

            var eventType = webhookEvent.EventType?.ToLowerInvariant() switch
            {
                "authorized" => WebhookEventType.PaymentCompleted,
                "sentforsettlement" => WebhookEventType.PaymentCompleted,
                "refused" => WebhookEventType.PaymentFailed,
                "refundfailed" => WebhookEventType.PaymentFailed, // No RefundFailed type, use PaymentFailed
                "chargebackopened" => WebhookEventType.DisputeOpened,
                _ => WebhookEventType.Unknown
            };

            var transactionId = webhookEvent.EventDetails?.TransactionReference ??
                                $"wp_webhook_{DateTime.UtcNow:yyyyMMddHHmmss}";

            // Try to parse invoice ID from transaction reference
            Guid? invoiceId = null;
            if (Guid.TryParse(webhookEvent.EventDetails?.TransactionReference, out var parsedInvoiceId))
            {
                invoiceId = parsedInvoiceId;
            }

            return Task.FromResult(WebhookProcessingResult.Successful(
                eventType: eventType,
                transactionId: transactionId,
                invoiceId: invoiceId));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing WorldPay webhook");
            return Task.FromResult(WebhookProcessingResult.Failure($"Error: {ex.Message}"));
        }
    }

    // =====================================================
    // Webhook Testing
    // =====================================================

    /// <inheritdoc />
    public override ValueTask<IReadOnlyList<WebhookEventTemplate>> GetWebhookEventTemplatesAsync(
        CancellationToken cancellationToken = default)
    {
        List<WebhookEventTemplate> templates =
        [
            new()
            {
                EventType = "authorized",
                DisplayName = "Payment Authorized",
                Description = "Fired when a payment is successfully authorized.",
                Category = WebhookEventCategory.Payment,
                MerchelloEventType = WebhookEventType.PaymentCompleted
            },
            new()
            {
                EventType = "sentForSettlement",
                DisplayName = "Sent for Settlement",
                Description = "Fired when a payment is submitted for settlement.",
                Category = WebhookEventCategory.Payment,
                MerchelloEventType = WebhookEventType.PaymentCompleted
            },
            new()
            {
                EventType = "refused",
                DisplayName = "Payment Refused",
                Description = "Fired when a payment is declined by the processor.",
                Category = WebhookEventCategory.Payment,
                MerchelloEventType = WebhookEventType.PaymentFailed
            },
            new()
            {
                EventType = "refundFailed",
                DisplayName = "Refund Failed",
                Description = "Fired when a refund fails to process.",
                Category = WebhookEventCategory.Refund,
                MerchelloEventType = WebhookEventType.PaymentFailed // No RefundFailed type available
            },
            new()
            {
                EventType = "chargebackOpened",
                DisplayName = "Chargeback Opened",
                Description = "Fired when a chargeback/dispute is initiated.",
                Category = WebhookEventCategory.Dispute,
                MerchelloEventType = WebhookEventType.DisputeOpened
            }
        ];

        return ValueTask.FromResult<IReadOnlyList<WebhookEventTemplate>>(templates);
    }

    /// <inheritdoc />
    public override ValueTask<(string Payload, IDictionary<string, string> Headers)> GenerateTestWebhookPayloadAsync(
        TestWebhookParameters parameters,
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(parameters.CustomPayload))
        {
            return ValueTask.FromResult<(string, IDictionary<string, string>)>((
                parameters.CustomPayload,
                new Dictionary<string, string> { ["Content-Type"] = "application/json" }));
        }

        var transactionId = parameters.TransactionId ?? parameters.InvoiceId?.ToString() ?? Guid.NewGuid().ToString();
        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");

        var webhookPayload = new
        {
            eventType = parameters.EventType,
            eventTimestamp = timestamp,
            eventDetails = new
            {
                transactionReference = transactionId,
                outcome = parameters.EventType.ToLowerInvariant() switch
                {
                    "authorized" => "authorized",
                    "sentforsettlement" => "sentForSettlement",
                    "refused" => "refused",
                    _ => parameters.EventType
                }
            }
        };

        var payload = JsonSerializer.Serialize(webhookPayload, WorldPayJsonOptions.Default);

        var headers = new Dictionary<string, string>
        {
            ["Content-Type"] = "application/json"
        };

        return ValueTask.FromResult<(string, IDictionary<string, string>)>((payload, headers));
    }

    // =====================================================
    // Helpers
    // =====================================================

    /// <summary>
    /// Extracts a transaction ID from WorldPay HATEOAS links.
    /// </summary>
    private static string? ExtractTransactionIdFromLinks(WorldPayLinks? links)
    {
        // Try to extract from settle link
        var settleHref = links?.Settle?.Href;
        if (!string.IsNullOrEmpty(settleHref))
        {
            // Format: /payments/settlements/{linkData}
            var parts = settleHref.Split('/');
            if (parts.Length > 0)
            {
                return parts[^1]; // Last segment
            }
        }

        return null;
    }
}
