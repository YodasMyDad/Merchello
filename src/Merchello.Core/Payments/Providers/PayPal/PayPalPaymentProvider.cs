using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.PayPal.Models;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Providers;
using PaypalServerSdk.Standard;
using PaypalServerSdk.Standard.Authentication;
using PaypalServerSdk.Standard.Exceptions;
using PaypalServerSdk.Standard.Models;

namespace Merchello.Core.Payments.Providers.PayPal;

/// <summary>
/// PayPal payment provider supporting PayPal Checkout and Pay Later options.
/// Uses the PayPal Server SDK for Orders V2 and Payments V2 APIs.
/// </summary>
/// <remarks>
/// Configuration required:
/// - clientId: PayPal Client ID
/// - clientSecret: PayPal Client Secret
/// - webhookId: PayPal Webhook ID (for signature verification)
///
/// Webhook endpoint: /umbraco/merchello/webhooks/payments/paypal
/// Required webhook events: CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED,
/// PAYMENT.CAPTURE.DENIED, PAYMENT.CAPTURE.REFUNDED
/// </remarks>
public class PayPalPaymentProvider(IHttpClientFactory httpClientFactory) : PaymentProviderBase
{
    private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;
    private PaypalServerSdkClient? _client;
    private string? _clientId;
    private string? _webhookId;

    /// <summary>
    /// PayPal JavaScript SDK URL for frontend integration.
    /// Client ID is appended dynamically in the SDK configuration.
    /// </summary>
    private const string PayPalJsSdkBaseUrl = "https://www.paypal.com/sdk/js";

    /// <summary>
    /// URL to the PayPal unified adapter script (handles both standard and express checkout).
    /// </summary>
    private const string PayPalPaymentAdapterUrl = "/js/checkout/adapters/paypal-unified-adapter.js";

    /// <summary>
    /// SVG icon for PayPal (PP logo symbol only).
    /// </summary>
    private const string PayPalIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" fill="#003087"/><path d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132l-1.41 8.95a.568.568 0 0 0 .562.655h3.94c.578 0 1.069-.42 1.16-.99l.045-.24.92-5.815.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.658-1.377z" fill="#0070E0"/></svg>""";

    /// <summary>
    /// SVG icon for Pay Later (clock with currency symbol).
    /// </summary>
    private const string PayLaterIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#FFD140"/><path d="M12 6v6l4 2" stroke="#003087" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.5 16.5l2.5 2.5" stroke="#003087" stroke-width="2" stroke-linecap="round"/></svg>""";

    /// <inheritdoc />
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "paypal",
        DisplayName = "PayPal",
        Icon = "icon-paypal",
        IconHtml = PayPalIconSvg,
        Description = "Accept payments via PayPal. Supports PayPal Checkout and Pay Later options.",
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        SupportsAuthAndCapture = true,
        RequiresWebhook = true,
        SupportsPaymentLinks = true,
        SetupInstructions = """
            ## PayPal Setup Instructions

            ### 1. Create a PayPal Developer Account

            1. Go to [developer.paypal.com](https://developer.paypal.com)
            2. Log in with your PayPal account or create a new one
            3. Navigate to **Dashboard → My Apps & Credentials**

            ### 2. Create a REST API App

            1. Click **Create App** in the Sandbox section
            2. Enter an app name (e.g., "Merchello Store")
            3. Select **Merchant** as the app type
            4. Click **Create App**
            5. Copy your **Client ID** and **Secret** from the app details

            ### 3. Configure Webhooks

            1. In your app details, scroll to **Webhooks**
            2. Click **Add Webhook**
            3. Enter your webhook URL:
               ```
               https://your-site.com/umbraco/merchello/webhooks/payments/paypal
               ```
            4. Select these events:
               - `CHECKOUT.ORDER.APPROVED`
               - `PAYMENT.CAPTURE.COMPLETED`
               - `PAYMENT.CAPTURE.DENIED`
               - `PAYMENT.CAPTURE.REFUNDED`
            5. Click **Save**
            6. Copy the **Webhook ID** from the webhook list

            ### 4. Test with Sandbox Accounts

            PayPal provides sandbox buyer and seller accounts for testing:

            1. Go to **Dashboard → Sandbox → Accounts**
            2. Use the default sandbox accounts or create new ones
            3. Note the sandbox buyer email and password for testing

            ### 5. Test Scenarios

            | Scenario | How to Test |
            |----------|-------------|
            | Successful payment | Log in with sandbox buyer account |
            | Declined payment | Use buyer account with no balance |
            | Cancelled payment | Click Cancel on PayPal popup |

            ### 6. Enable Pay Later

            Pay Later is automatically available in supported countries (US, UK, AU, FR, DE, ES, IT).
            No additional configuration required.

            ### 7. Going Live

            1. Create a Live app in the PayPal Developer Dashboard
            2. Complete the PayPal business account verification
            3. Copy your Live **Client ID** and **Secret**
            4. Create a new webhook endpoint for your production URL
            5. Update the configuration with live credentials
            6. Uncheck **Test Mode** in the provider settings
            """
    };

    /// <inheritdoc />
    public override IReadOnlyList<PaymentMethodDefinition> GetAvailablePaymentMethods() =>
    [
        new PaymentMethodDefinition
        {
            Alias = "paypal",
            DisplayName = "PayPal",
            Icon = "icon-paypal",
            IconHtml = PayPalIconSvg,
            Description = "Pay securely with your PayPal account or credit/debit card.",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 5,
            MethodType = PaymentMethodTypes.PayPal
        },
        new PaymentMethodDefinition
        {
            Alias = "paylater",
            DisplayName = "Pay Later",
            Icon = "icon-paypal",
            IconHtml = PayLaterIconSvg,
            Description = "Buy now and pay over time with PayPal Pay Later.",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = false,
            DefaultSortOrder = 15,
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
                Key = "clientId",
                Label = "Client ID",
                Description = "Your PayPal REST API Client ID",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                Placeholder = "AWx..."
            },
            new()
            {
                Key = "clientSecret",
                Label = "Client Secret",
                Description = "Your PayPal REST API Client Secret",
                FieldType = ConfigurationFieldType.Password,
                IsSensitive = true,
                IsRequired = true,
                Placeholder = "EHx..."
            },
            new()
            {
                Key = "webhookId",
                Label = "Webhook ID",
                Description = "Your PayPal Webhook ID for signature verification",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                Placeholder = "1AB234..."
            },
            new()
            {
                Key = "brandName",
                Label = "Brand Name",
                Description = "Optional: Your brand name shown on PayPal checkout (max 127 characters)",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                Placeholder = "My Store"
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

        _clientId = configuration?.GetValue("clientId");
        var clientSecret = configuration?.GetValue("clientSecret");
        _webhookId = configuration?.GetValue("webhookId");

        if (!string.IsNullOrEmpty(_clientId) && !string.IsNullOrEmpty(clientSecret))
        {
            _client = new PaypalServerSdkClient.Builder()
                .ClientCredentialsAuth(
                    new ClientCredentialsAuthModel.Builder(_clientId, clientSecret).Build())
                .Environment(IsTestMode
                    ? PaypalServerSdk.Standard.Environment.Sandbox
                    : PaypalServerSdk.Standard.Environment.Production)
                .Build();
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
        if (_client is null || string.IsNullOrEmpty(_clientId))
        {
            return PaymentSessionResult.Failed("PayPal is not configured. Please add your API credentials.");
        }

        try
        {
            // Create PayPal order
            var ordersController = _client.OrdersController;

            var brandName = Configuration?.GetValue("brandName");

            // Create the order request with purchase units
            var orderRequest = new OrderRequest()
            {
                Intent = CheckoutPaymentIntent.Capture,
                PurchaseUnits =
                [
                    new PurchaseUnitRequest()
                    {
                        Amount = new AmountWithBreakdown()
                        {
                            CurrencyCode = request.Currency.ToUpperInvariant(),
                            MValue = request.Amount.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)
                        },
                        ReferenceId = request.InvoiceId.ToString(),
                        Description = request.Description ?? $"Order #{request.InvoiceId}"
                    }
                ],
                PaymentSource = new PaymentSource()
                {
                    Paypal = new PaypalWallet()
                    {
                        ExperienceContext = new PaypalWalletExperienceContext()
                        {
                            BrandName = !string.IsNullOrEmpty(brandName) ? brandName : null,
                            ShippingPreference = PaypalWalletContextShippingPreference.GetFromFile,
                            UserAction = PaypalExperienceUserAction.PayNow,
                            ReturnUrl = request.ReturnUrl,
                            CancelUrl = request.CancelUrl,
                            LandingPage = PaypalExperienceLandingPage.Login
                        }
                    }
                }
            };

            var createOrderInput = new CreateOrderInput()
            {
                Body = orderRequest,
                Prefer = "return=representation"
            };

            var response = await ordersController.CreateOrderAsync(createOrderInput);
            var order = response.Data;

            if (order is null)
            {
                return PaymentSessionResult.Failed("Failed to create PayPal order.");
            }

            // Determine funding source based on method alias
            var fundingSource = request.MethodAlias switch
            {
                "paylater" => "paylater",
                _ => "paypal"
            };

            // Return Widget session with adapter configuration for PayPal buttons
            return PaymentSessionResult.Widget(
                providerAlias: Metadata.Alias,
                methodAlias: request.MethodAlias ?? "paypal",
                adapterUrl: PayPalPaymentAdapterUrl,
                jsSdkUrl: BuildPayPalJsSdkUrl(request.Currency, fundingSource),
                sdkConfig: new Dictionary<string, object>
                {
                    // PayPal SDK configuration
                    ["clientId"] = _clientId,
                    ["orderId"] = order.Id ?? string.Empty,
                    ["currency"] = request.Currency.ToUpperInvariant(),
                    ["intent"] = "capture",

                    // Payment details
                    ["amount"] = request.Amount,
                    ["invoiceId"] = request.InvoiceId.ToString(),

                    // Funding source (paypal or paylater)
                    ["fundingSource"] = fundingSource,

                    // Enable/disable options based on method
                    ["enableFunding"] = fundingSource == "paylater" ? "paylater" : string.Empty,
                    ["disableFunding"] = fundingSource == "paylater" ? "card,credit" : "credit",

                    // URLs for frontend handling
                    ["returnUrl"] = request.ReturnUrl,
                    ["cancelUrl"] = request.CancelUrl
                },
                clientToken: order.Id,
                sessionId: order.Id);
        }
        catch (ApiException ex)
        {
            return PaymentSessionResult.Failed(
                errorMessage: ex.Message,
                errorCode: ex.ResponseCode.ToString());
        }
        catch (Exception ex)
        {
            return PaymentSessionResult.Failed(ex.Message);
        }
    }

    /// <summary>
    /// Builds the PayPal JavaScript SDK URL with appropriate parameters.
    /// </summary>
    private string BuildPayPalJsSdkUrl(string currency, string fundingSource)
    {
        List<string> parameters =
        [
            $"client-id={_clientId}",
            $"currency={currency.ToUpperInvariant()}",
            "intent=capture",
            "components=buttons,funding-eligibility"
        ];

        // Add Pay Later specific parameters
        if (fundingSource == "paylater")
        {
            parameters.Add("enable-funding=paylater");
        }

        return $"{PayPalJsSdkBaseUrl}?{string.Join("&", parameters)}";
    }

    /// <inheritdoc />
    public override async Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_client is null)
        {
            return PaymentResult.Failed("PayPal is not configured.");
        }

        // The SessionId contains the PayPal Order ID
        var orderId = request.SessionId;
        if (string.IsNullOrEmpty(orderId))
        {
            return PaymentResult.Failed("PayPal order ID is required.");
        }

        try
        {
            var ordersController = _client.OrdersController;

            // Capture the approved order
            var captureInput = new CaptureOrderInput()
            {
                Id = orderId,
                Prefer = "return=representation"
            };

            var response = await ordersController.CaptureOrderAsync(captureInput);
            var order = response.Data;

            if (order is null)
            {
                return PaymentResult.Failed("Failed to capture PayPal order.");
            }

            // Check if capture was successful
            if (order.Status == OrderStatus.Completed)
            {
                // Extract capture details
                var capture = order.PurchaseUnits?.FirstOrDefault()?
                    .Payments?.Captures?.FirstOrDefault();

                var transactionId = capture?.Id ?? order.Id ?? orderId;
                var capturedAmount = decimal.TryParse(capture?.Amount?.MValue, out var amt)
                    ? amt
                    : request.Amount ?? 0;

                return new PaymentResult
                {
                    Success = true,
                    TransactionId = transactionId,
                    Amount = capturedAmount,
                    Status = PaymentResultStatus.Completed
                };
            }

            // Handle other statuses
            return order.Status switch
            {
                OrderStatus.Approved => PaymentResult.Pending(
                    transactionId: order.Id ?? orderId,
                    amount: request.Amount ?? 0),

                OrderStatus.Voided => PaymentResult.Failed(
                    "Payment was cancelled."),

                _ => PaymentResult.Failed(
                    $"Unexpected order status: {order.Status}")
            };
        }
        catch (ApiException ex)
        {
            return PaymentResult.Failed(
                errorMessage: ex.Message,
                errorCode: ex.ResponseCode.ToString());
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
    /// URL to the PayPal unified adapter script for express checkout.
    /// Uses the same adapter as standard checkout for consistency.
    /// </summary>
    private const string PayPalExpressAdapterUrl = "/js/checkout/adapters/paypal-unified-adapter.js";

    /// <inheritdoc />
    /// <remarks>
    /// Returns PayPal JavaScript SDK configuration for express checkout methods (PayPal, Pay Later).
    /// Uses the PayPal JS SDK buttons component for a native checkout experience.
    /// </remarks>
    public override Task<ExpressCheckoutClientConfig?> GetExpressCheckoutClientConfigAsync(
        string methodAlias,
        decimal amount,
        string currency,
        CancellationToken cancellationToken = default)
    {
        // Express checkout requires configuration
        if (string.IsNullOrEmpty(_clientId))
        {
            return Task.FromResult<ExpressCheckoutClientConfig?>(null);
        }

        // Only provide config for express checkout methods
        var normalizedAlias = methodAlias.ToLowerInvariant();
        if (normalizedAlias != "paypal" && normalizedAlias != "paylater")
        {
            return Task.FromResult<ExpressCheckoutClientConfig?>(null);
        }

        // Map method alias to method type
        var methodType = normalizedAlias switch
        {
            "paypal" => PaymentMethodTypes.PayPal,
            "paylater" => PaymentMethodTypes.BuyNowPayLater,
            _ => (string?)null
        };

        // Build SDK URL with appropriate parameters
        var sdkUrl = BuildPayPalJsSdkUrl(currency, normalizedAlias);

        var config = new ExpressCheckoutClientConfig
        {
            ProviderAlias = Metadata.Alias,
            MethodAlias = methodAlias,
            MethodType = methodType,
            SdkUrl = sdkUrl,
            CustomAdapterUrl = PayPalExpressAdapterUrl,
            SdkConfig = new Dictionary<string, object>
            {
                ["clientId"] = _clientId,
                ["currency"] = currency.ToUpperInvariant(),
                ["intent"] = "capture",
                ["fundingSource"] = normalizedAlias,
                ["environment"] = IsTestMode ? "sandbox" : "production"
            },
            IsAvailable = true
        };

        return Task.FromResult<ExpressCheckoutClientConfig?>(config);
    }

    /// <inheritdoc />
    public override async Task<ExpressCheckoutResult> ProcessExpressCheckoutAsync(
        ExpressCheckoutRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_client is null)
        {
            return ExpressCheckoutResult.Failed("PayPal is not configured.");
        }

        if (string.IsNullOrEmpty(request.PaymentToken))
        {
            return ExpressCheckoutResult.Failed("PayPal order ID is required.");
        }

        try
        {
            var ordersController = _client.OrdersController;

            // Capture the approved order
            // The PaymentToken is the PayPal Order ID that was approved
            var captureInput = new CaptureOrderInput()
            {
                Id = request.PaymentToken,
                Prefer = "return=representation"
            };

            var response = await ordersController.CaptureOrderAsync(captureInput);
            var order = response.Data;

            if (order is null)
            {
                return ExpressCheckoutResult.Failed("Failed to capture PayPal order.");
            }

            if (order.Status == OrderStatus.Completed)
            {
                // Extract capture details
                var capture = order.PurchaseUnits?.FirstOrDefault()?
                    .Payments?.Captures?.FirstOrDefault();

                var transactionId = capture?.Id ?? order.Id ?? request.PaymentToken;
                var capturedAmount = decimal.TryParse(capture?.Amount?.MValue, out var amt)
                    ? amt
                    : request.Amount;

                return ExpressCheckoutResult.Completed(
                    transactionId: transactionId,
                    amount: capturedAmount);
            }

            return order.Status switch
            {
                OrderStatus.Approved => ExpressCheckoutResult.Pending(
                    transactionId: order.Id ?? request.PaymentToken,
                    amount: request.Amount),

                OrderStatus.Voided => ExpressCheckoutResult.Failed(
                    "Payment was cancelled.",
                    errorCode: "VOIDED"),

                _ => ExpressCheckoutResult.Failed(
                    $"Unexpected order status: {order.Status}",
                    errorCode: order.Status?.ToString())
            };
        }
        catch (ApiException ex)
        {
            return ExpressCheckoutResult.Failed(
                error: ex.Message,
                errorCode: ex.ResponseCode.ToString());
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
        if (_client is null)
        {
            return PaymentCaptureResult.Failure("PayPal is not configured.");
        }

        try
        {
            var paymentsController = _client.PaymentsController;

            var captureInput = new CaptureAuthorizedPaymentInput()
            {
                AuthorizationId = transactionId,
                Prefer = "return=representation"
            };

            // Add capture request body if partial amount specified
            if (amount.HasValue)
            {
                // Get the authorization to determine the correct currency
                var authInput = new GetAuthorizedPaymentInput() { AuthorizationId = transactionId };
                var authResponse = await paymentsController.GetAuthorizedPaymentAsync(authInput);
                var authorization = authResponse.Data;

                captureInput.Body = new CaptureRequest()
                {
                    Amount = new Money()
                    {
                        CurrencyCode = authorization?.Amount?.CurrencyCode ?? "USD",
                        MValue = amount.Value.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)
                    },
                    FinalCapture = false
                };
            }

            var response = await paymentsController.CaptureAuthorizedPaymentAsync(captureInput);
            var capture = response.Data;

            if (capture is null)
            {
                return PaymentCaptureResult.Failure("Failed to capture PayPal authorization.");
            }

            var capturedAmount = decimal.TryParse(capture.Amount?.MValue, out var amt)
                ? amt
                : amount ?? 0;

            return PaymentCaptureResult.Successful(
                transactionId: capture.Id ?? transactionId,
                amount: capturedAmount);
        }
        catch (ApiException ex)
        {
            return PaymentCaptureResult.Failure(
                errorMessage: ex.Message,
                errorCode: ex.ResponseCode.ToString());
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
        Merchello.Core.Payments.Models.RefundRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_client is null)
        {
            return RefundResult.Failure("PayPal is not configured.");
        }

        try
        {
            var paymentsController = _client.PaymentsController;

            var refundInput = new RefundCapturedPaymentInput()
            {
                CaptureId = request.TransactionId,
                Prefer = "return=representation"
            };

            // Add refund request body if partial amount or reason specified
            if (request.Amount.HasValue || !string.IsNullOrEmpty(request.Reason))
            {
                var refundRequestBody = new PaypalServerSdk.Standard.Models.RefundRequest();

                if (request.Amount.HasValue)
                {
                    // Get the original capture to determine currency
                    var getInput = new GetCapturedPaymentInput() { CaptureId = request.TransactionId };
                    var captureResponse = await paymentsController.GetCapturedPaymentAsync(getInput);
                    var originalCapture = captureResponse.Data;

                    refundRequestBody.Amount = new Money()
                    {
                        CurrencyCode = originalCapture?.Amount?.CurrencyCode ?? "USD",
                        MValue = request.Amount.Value.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)
                    };
                }

                if (!string.IsNullOrEmpty(request.Reason))
                {
                    refundRequestBody.NoteToPayer = request.Reason;
                }

                refundInput.Body = refundRequestBody;
            }

            var response = await paymentsController.RefundCapturedPaymentAsync(refundInput);
            var refund = response.Data;

            if (refund is null)
            {
                return RefundResult.Failure("Failed to process PayPal refund.");
            }

            var refundedAmount = decimal.TryParse(refund.Amount?.MValue, out var amt)
                ? amt
                : request.Amount ?? 0;

            return RefundResult.Successful(
                refundTransactionId: refund.Id ?? $"refund_{request.TransactionId}",
                amount: refundedAmount);
        }
        catch (ApiException ex)
        {
            return RefundResult.Failure(
                errorMessage: ex.Message,
                errorCode: ex.ResponseCode.ToString());
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
    /// <remarks>
    /// Validates the webhook signature by calling PayPal's verify-webhook-signature API.
    /// This ensures the webhook is authentic and hasn't been tampered with.
    /// </remarks>
    public override async Task<bool> ValidateWebhookAsync(
        string payload,
        IDictionary<string, string> headers,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_clientId) || string.IsNullOrEmpty(_webhookId))
        {
            return false;
        }

        var clientSecret = Configuration?.GetValue("clientSecret");
        if (string.IsNullOrEmpty(clientSecret))
        {
            return false;
        }

        try
        {
            // Get required headers (case-insensitive lookup)
            var transmissionId = GetHeaderValue(headers, "PAYPAL-TRANSMISSION-ID");
            var transmissionTime = GetHeaderValue(headers, "PAYPAL-TRANSMISSION-TIME");
            var certUrl = GetHeaderValue(headers, "PAYPAL-CERT-URL");
            var authAlgo = GetHeaderValue(headers, "PAYPAL-AUTH-ALGO");
            var transmissionSig = GetHeaderValue(headers, "PAYPAL-TRANSMISSION-SIG");

            // All required headers must be present
            if (string.IsNullOrEmpty(transmissionId) ||
                string.IsNullOrEmpty(transmissionTime) ||
                string.IsNullOrEmpty(certUrl) ||
                string.IsNullOrEmpty(authAlgo) ||
                string.IsNullOrEmpty(transmissionSig))
            {
                return false;
            }

            // Validate that we have a valid JSON payload
            if (string.IsNullOrEmpty(payload) || !payload.StartsWith("{"))
            {
                return false;
            }

            // Call PayPal's verify-webhook-signature API
            return await VerifyWebhookSignatureAsync(
                transmissionId,
                transmissionTime,
                certUrl,
                authAlgo,
                transmissionSig,
                payload,
                _clientId,
                clientSecret,
                cancellationToken);
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Gets a header value with case-insensitive key lookup.
    /// </summary>
    private static string? GetHeaderValue(IDictionary<string, string> headers, string key)
    {
        if (headers.TryGetValue(key, out var value))
        {
            return value;
        }

        if (headers.TryGetValue(key.ToLowerInvariant(), out value))
        {
            return value;
        }

        // Try mixed case variations
        foreach (var kvp in headers)
        {
            if (string.Equals(kvp.Key, key, StringComparison.OrdinalIgnoreCase))
            {
                return kvp.Value;
            }
        }

        return null;
    }

    /// <summary>
    /// Calls PayPal's verify-webhook-signature API to validate the webhook.
    /// </summary>
    private async Task<bool> VerifyWebhookSignatureAsync(
        string transmissionId,
        string transmissionTime,
        string certUrl,
        string authAlgo,
        string transmissionSig,
        string webhookPayload,
        string clientId,
        string clientSecret,
        CancellationToken cancellationToken)
    {
        using var httpClient = _httpClientFactory.CreateClient("PayPal");

        // Determine base URL based on test mode
        var baseUrl = IsTestMode
            ? "https://api-m.sandbox.paypal.com"
            : "https://api-m.paypal.com";

        // Get OAuth token
        using var tokenRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/v1/oauth2/token");
        var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
        tokenRequest.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
        tokenRequest.Content = new StringContent(
            "grant_type=client_credentials",
            Encoding.UTF8,
            "application/x-www-form-urlencoded");

        using var tokenResponse = await httpClient.SendAsync(tokenRequest, cancellationToken);
        if (!tokenResponse.IsSuccessStatusCode)
        {
            return false;
        }

        var tokenJson = await tokenResponse.Content.ReadAsStringAsync(cancellationToken);
        using var tokenDoc = JsonDocument.Parse(tokenJson);
        var accessToken = tokenDoc.RootElement.GetProperty("access_token").GetString();

        if (string.IsNullOrEmpty(accessToken))
        {
            return false;
        }

        // Build verification request
        using var verifyRequest = new HttpRequestMessage(
            HttpMethod.Post,
            $"{baseUrl}/v1/notifications/verify-webhook-signature");

        verifyRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        verifyRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        // Parse the webhook payload as a JSON element for the request
        using var webhookEventDoc = JsonDocument.Parse(webhookPayload);
        var webhookEvent = webhookEventDoc.RootElement;

        var verifyPayload = new
        {
            auth_algo = authAlgo,
            cert_url = certUrl,
            transmission_id = transmissionId,
            transmission_sig = transmissionSig,
            transmission_time = transmissionTime,
            webhook_id = _webhookId,
            webhook_event = webhookEvent
        };

        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };
        verifyRequest.Content = new StringContent(
            JsonSerializer.Serialize(verifyPayload, jsonOptions),
            Encoding.UTF8,
            "application/json");

        using var verifyResponse = await httpClient.SendAsync(verifyRequest, cancellationToken);
        if (!verifyResponse.IsSuccessStatusCode)
        {
            return false;
        }

        var verifyJson = await verifyResponse.Content.ReadAsStringAsync(cancellationToken);
        using var verifyDoc = JsonDocument.Parse(verifyJson);

        // Check verification_status is "SUCCESS"
        if (verifyDoc.RootElement.TryGetProperty("verification_status", out var status))
        {
            return string.Equals(status.GetString(), "SUCCESS", StringComparison.OrdinalIgnoreCase);
        }

        return false;
    }

    /// <inheritdoc />
    public override Task<WebhookProcessingResult> ProcessWebhookAsync(
        string payload,
        IDictionary<string, string> headers,
        CancellationToken cancellationToken = default)
    {
        if (_client is null)
        {
            return Task.FromResult(WebhookProcessingResult.Failure("PayPal is not configured."));
        }

        try
        {
            // Parse the webhook payload
            var webhookEvent = System.Text.Json.JsonSerializer.Deserialize<PayPalWebhookEvent>(
                payload,
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (webhookEvent is null)
            {
                return Task.FromResult(WebhookProcessingResult.Failure("Could not parse webhook payload."));
            }

            return Task.FromResult(ProcessPayPalEvent(webhookEvent));
        }
        catch (System.Text.Json.JsonException ex)
        {
            return Task.FromResult(WebhookProcessingResult.Failure($"Invalid JSON payload: {ex.Message}"));
        }
        catch (Exception ex)
        {
            return Task.FromResult(WebhookProcessingResult.Failure($"PayPal error: {ex.Message}"));
        }
    }

    /// <summary>
    /// Process a PayPal webhook event.
    /// </summary>
    private WebhookProcessingResult ProcessPayPalEvent(PayPalWebhookEvent webhookEvent)
    {
        return webhookEvent.EventType switch
        {
            "CHECKOUT.ORDER.APPROVED" => HandleOrderApproved(webhookEvent),
            "PAYMENT.CAPTURE.COMPLETED" => HandleCaptureCompleted(webhookEvent),
            "PAYMENT.CAPTURE.DENIED" => HandleCaptureDenied(webhookEvent),
            "PAYMENT.CAPTURE.REFUNDED" => HandleCaptureRefunded(webhookEvent),
            _ => WebhookProcessingResult.Successful(
                WebhookEventType.Unknown,
                transactionId: webhookEvent.Id ?? "unknown")
        };
    }

    private WebhookProcessingResult HandleOrderApproved(PayPalWebhookEvent webhookEvent)
    {
        var orderId = webhookEvent.Resource?.Id;

        // Try to extract invoice ID from reference_id
        Guid? invoiceId = null;
        var referenceId = webhookEvent.Resource?.PurchaseUnits?.FirstOrDefault()?.ReferenceId;
        if (!string.IsNullOrEmpty(referenceId) && Guid.TryParse(referenceId, out var parsedId))
        {
            invoiceId = parsedId;
        }

        // Order approved - waiting for capture
        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.PaymentCompleted,
            transactionId: orderId ?? webhookEvent.Id ?? "unknown",
            invoiceId: invoiceId);
    }

    private WebhookProcessingResult HandleCaptureCompleted(PayPalWebhookEvent webhookEvent)
    {
        var captureId = webhookEvent.Resource?.Id;
        var amountValue = webhookEvent.Resource?.Amount?.Value;

        decimal? amount = null;
        if (!string.IsNullOrEmpty(amountValue) && decimal.TryParse(amountValue, out var parsedAmount))
        {
            amount = parsedAmount;
        }

        // Try to extract invoice ID from custom_id
        Guid? invoiceId = null;
        var customId = webhookEvent.Resource?.CustomId;
        if (!string.IsNullOrEmpty(customId) && Guid.TryParse(customId, out var parsedId))
        {
            invoiceId = parsedId;
        }

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.PaymentCompleted,
            transactionId: captureId ?? webhookEvent.Id ?? "unknown",
            invoiceId: invoiceId,
            amount: amount);
    }

    private WebhookProcessingResult HandleCaptureDenied(PayPalWebhookEvent webhookEvent)
    {
        var captureId = webhookEvent.Resource?.Id;

        Guid? invoiceId = null;
        var customId = webhookEvent.Resource?.CustomId;
        if (!string.IsNullOrEmpty(customId) && Guid.TryParse(customId, out var parsedId))
        {
            invoiceId = parsedId;
        }

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.PaymentFailed,
            transactionId: captureId ?? webhookEvent.Id ?? "unknown",
            invoiceId: invoiceId);
    }

    private WebhookProcessingResult HandleCaptureRefunded(PayPalWebhookEvent webhookEvent)
    {
        var refundId = webhookEvent.Resource?.Id;
        var amountValue = webhookEvent.Resource?.Amount?.Value;

        decimal? amount = null;
        if (!string.IsNullOrEmpty(amountValue) && decimal.TryParse(amountValue, out var parsedAmount))
        {
            amount = parsedAmount;
        }

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.RefundCompleted,
            transactionId: refundId ?? webhookEvent.Id ?? "unknown",
            amount: amount);
    }

    // =====================================================
    // Webhook Testing (Simulation)
    // =====================================================

    /// <inheritdoc />
    /// <remarks>
    /// Returns the PayPal webhook events that can be simulated for testing.
    /// These match the events configured in the PayPal webhook endpoint.
    /// </remarks>
    public override ValueTask<IReadOnlyList<WebhookEventTemplate>> GetWebhookEventTemplatesAsync(
        CancellationToken cancellationToken = default)
    {
        List<WebhookEventTemplate> templates =
        [
            new()
            {
                EventType = "CHECKOUT.ORDER.APPROVED",
                DisplayName = "Order Approved",
                Description = "Fired when a customer approves the PayPal order (before capture).",
                Category = WebhookEventCategory.Payment,
                MerchelloEventType = WebhookEventType.PaymentCompleted
            },
            new()
            {
                EventType = "PAYMENT.CAPTURE.COMPLETED",
                DisplayName = "Capture Completed",
                Description = "Fired when payment is successfully captured. This is the primary payment confirmation event.",
                Category = WebhookEventCategory.Payment,
                MerchelloEventType = WebhookEventType.PaymentCompleted
            },
            new()
            {
                EventType = "PAYMENT.CAPTURE.DENIED",
                DisplayName = "Capture Denied",
                Description = "Fired when a payment capture is denied by PayPal or the payment processor.",
                Category = WebhookEventCategory.Payment,
                MerchelloEventType = WebhookEventType.PaymentFailed
            },
            new()
            {
                EventType = "PAYMENT.CAPTURE.REFUNDED",
                DisplayName = "Capture Refunded",
                Description = "Fired when a captured payment is refunded (full or partial).",
                Category = WebhookEventCategory.Refund,
                MerchelloEventType = WebhookEventType.RefundCompleted
            }
        ];

        return ValueTask.FromResult<IReadOnlyList<WebhookEventTemplate>>(templates);
    }

    /// <inheritdoc />
    /// <remarks>
    /// Generates a realistic PayPal webhook payload for testing.
    /// The payload format matches PayPal's actual webhook format.
    /// See: https://developer.paypal.com/docs/api-basics/notifications/webhooks/
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
                GeneratePayPalTestHeaders()));
        }

        // Generate appropriate payload based on event type
        var transactionId = parameters.TransactionId ?? $"PAYID-{Guid.NewGuid():N}"[..20].ToUpperInvariant();
        var invoiceId = parameters.InvoiceId ?? Guid.NewGuid();
        var amount = parameters.Amount.ToString("F2", System.Globalization.CultureInfo.InvariantCulture);
        var currency = parameters.Currency.ToUpperInvariant();
        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");

        var payload = parameters.EventType.ToUpperInvariant() switch
        {
            "CHECKOUT.ORDER.APPROVED" => GenerateOrderApprovedPayload(transactionId, invoiceId, amount, currency, timestamp),
            "PAYMENT.CAPTURE.COMPLETED" => GenerateCaptureCompletedPayload(transactionId, invoiceId, amount, currency, timestamp),
            "PAYMENT.CAPTURE.DENIED" => GenerateCaptureDeniedPayload(transactionId, invoiceId, amount, currency, timestamp),
            "PAYMENT.CAPTURE.REFUNDED" => GenerateCaptureRefundedPayload(transactionId, amount, currency, timestamp),
            _ => GenerateCaptureCompletedPayload(transactionId, invoiceId, amount, currency, timestamp)
        };

        return ValueTask.FromResult<(string, IDictionary<string, string>)>((payload, GeneratePayPalTestHeaders()));
    }

    private static IDictionary<string, string> GeneratePayPalTestHeaders()
    {
        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
        return new Dictionary<string, string>
        {
            ["PAYPAL-TRANSMISSION-ID"] = Guid.NewGuid().ToString(),
            ["PAYPAL-TRANSMISSION-TIME"] = timestamp,
            ["PAYPAL-CERT-URL"] = "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42-fca2a594-1d93a270",
            ["PAYPAL-AUTH-ALGO"] = "SHA256withRSA",
            ["PAYPAL-TRANSMISSION-SIG"] = "test_signature_for_simulation",
            ["Content-Type"] = "application/json"
        };
    }

    private static string GenerateOrderApprovedPayload(string transactionId, Guid invoiceId, string amount, string currency, string timestamp)
    {
        var orderId = $"ORDER-{Guid.NewGuid():N}".ToUpperInvariant()[..20];
        var webhookId = $"WH-{Guid.NewGuid():N}".ToUpperInvariant()[..20];
        return $$"""
            {
                "id": "{{webhookId}}",
                "event_version": "1.0",
                "create_time": "{{timestamp}}",
                "resource_type": "checkout-order",
                "event_type": "CHECKOUT.ORDER.APPROVED",
                "summary": "An order has been approved by buyer",
                "resource": {
                    "id": "{{orderId}}",
                    "status": "APPROVED",
                    "intent": "CAPTURE",
                    "purchase_units": [
                        {
                            "reference_id": "{{invoiceId}}",
                            "amount": {
                                "currency_code": "{{currency}}",
                                "value": "{{amount}}"
                            }
                        }
                    ],
                    "payer": {
                        "email_address": "test-buyer@example.com",
                        "payer_id": "TESTPAYERID123"
                    },
                    "create_time": "{{timestamp}}",
                    "update_time": "{{timestamp}}"
                }
            }
            """;
    }

    private static string GenerateCaptureCompletedPayload(string transactionId, Guid invoiceId, string amount, string currency, string timestamp)
    {
        var webhookId = $"WH-{Guid.NewGuid():N}".ToUpperInvariant()[..20];
        return $$"""
            {
                "id": "{{webhookId}}",
                "event_version": "1.0",
                "create_time": "{{timestamp}}",
                "resource_type": "capture",
                "event_type": "PAYMENT.CAPTURE.COMPLETED",
                "summary": "Payment completed for {{currency}} {{amount}}",
                "resource": {
                    "id": "{{transactionId}}",
                    "status": "COMPLETED",
                    "amount": {
                        "currency_code": "{{currency}}",
                        "value": "{{amount}}"
                    },
                    "custom_id": "{{invoiceId}}",
                    "final_capture": true,
                    "seller_protection": {
                        "status": "ELIGIBLE",
                        "dispute_categories": ["ITEM_NOT_RECEIVED", "UNAUTHORIZED_TRANSACTION"]
                    },
                    "seller_receivable_breakdown": {
                        "gross_amount": {
                            "currency_code": "{{currency}}",
                            "value": "{{amount}}"
                        },
                        "paypal_fee": {
                            "currency_code": "{{currency}}",
                            "value": "0.50"
                        },
                        "net_amount": {
                            "currency_code": "{{currency}}",
                            "value": "{{(decimal.Parse(amount) - 0.50m):F2}}"
                        }
                    },
                    "create_time": "{{timestamp}}",
                    "update_time": "{{timestamp}}"
                }
            }
            """;
    }

    private static string GenerateCaptureDeniedPayload(string transactionId, Guid invoiceId, string amount, string currency, string timestamp)
    {
        var webhookId = $"WH-{Guid.NewGuid():N}".ToUpperInvariant()[..20];
        return $$"""
            {
                "id": "{{webhookId}}",
                "event_version": "1.0",
                "create_time": "{{timestamp}}",
                "resource_type": "capture",
                "event_type": "PAYMENT.CAPTURE.DENIED",
                "summary": "Payment capture denied",
                "resource": {
                    "id": "{{transactionId}}",
                    "status": "DECLINED",
                    "amount": {
                        "currency_code": "{{currency}}",
                        "value": "{{amount}}"
                    },
                    "custom_id": "{{invoiceId}}",
                    "final_capture": true,
                    "create_time": "{{timestamp}}",
                    "update_time": "{{timestamp}}"
                }
            }
            """;
    }

    private static string GenerateCaptureRefundedPayload(string transactionId, string amount, string currency, string timestamp)
    {
        var refundId = $"REFUND-{Guid.NewGuid():N}".ToUpperInvariant()[..20];
        var webhookId = $"WH-{Guid.NewGuid():N}".ToUpperInvariant()[..20];
        return $$"""
            {
                "id": "{{webhookId}}",
                "event_version": "1.0",
                "create_time": "{{timestamp}}",
                "resource_type": "refund",
                "event_type": "PAYMENT.CAPTURE.REFUNDED",
                "summary": "Refund completed for {{currency}} {{amount}}",
                "resource": {
                    "id": "{{refundId}}",
                    "status": "COMPLETED",
                    "amount": {
                        "currency_code": "{{currency}}",
                        "value": "{{amount}}"
                    },
                    "note_to_payer": "Refund processed",
                    "seller_payable_breakdown": {
                        "gross_amount": {
                            "currency_code": "{{currency}}",
                            "value": "{{amount}}"
                        },
                        "paypal_fee": {
                            "currency_code": "{{currency}}",
                            "value": "0.00"
                        },
                        "net_amount": {
                            "currency_code": "{{currency}}",
                            "value": "{{amount}}"
                        }
                    },
                    "create_time": "{{timestamp}}",
                    "update_time": "{{timestamp}}"
                }
            }
            """;
    }

    // =====================================================
    // Payment Links (via PayPal Invoicing API)
    // =====================================================

    /// <inheritdoc />
    /// <remarks>
    /// Creates a shareable payment link using PayPal's Invoicing API.
    /// The invoice is created in DRAFT status, then sent (without email) to generate a shareable link.
    /// </remarks>
    public override async Task<PaymentLinkResult> CreatePaymentLinkAsync(
        PaymentLinkRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_clientId))
        {
            return PaymentLinkResult.Failed("PayPal is not configured. Please add your API credentials.");
        }

        var clientSecret = Configuration?.GetValue("clientSecret");
        if (string.IsNullOrEmpty(clientSecret))
        {
            return PaymentLinkResult.Failed("PayPal client secret is not configured.");
        }

        try
        {
            using var httpClient = _httpClientFactory.CreateClient("PayPal");
            var baseUrl = IsTestMode
                ? "https://api-m.sandbox.paypal.com"
                : "https://api-m.paypal.com";

            // Get OAuth access token
            var accessToken = await GetAccessTokenAsync(httpClient, baseUrl, _clientId, clientSecret, cancellationToken);
            if (string.IsNullOrEmpty(accessToken))
            {
                return PaymentLinkResult.Failed("Failed to authenticate with PayPal.");
            }

            // Build the invoice request
            var brandName = Configuration?.GetValue("brandName");
            var invoicePayload = BuildInvoicePayload(request, brandName);

            // Create the invoice (draft)
            using var createRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/v2/invoicing/invoices");
            createRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            createRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            createRequest.Content = new StringContent(invoicePayload, Encoding.UTF8, "application/json");

            using var createResponse = await httpClient.SendAsync(createRequest, cancellationToken);
            var createResponseContent = await createResponse.Content.ReadAsStringAsync(cancellationToken);

            if (!createResponse.IsSuccessStatusCode)
            {
                return PaymentLinkResult.Failed(
                    $"Failed to create PayPal invoice: {createResponseContent}",
                    createResponse.StatusCode.ToString());
            }

            using var createDoc = JsonDocument.Parse(createResponseContent);
            var invoiceId = createDoc.RootElement.GetProperty("id").GetString();

            if (string.IsNullOrEmpty(invoiceId))
            {
                return PaymentLinkResult.Failed("PayPal returned an invoice without an ID.");
            }

            // Send the invoice to generate the payment link (without sending email to customer)
            using var sendRequest = new HttpRequestMessage(
                HttpMethod.Post,
                $"{baseUrl}/v2/invoicing/invoices/{invoiceId}/send");
            sendRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            sendRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            sendRequest.Content = new StringContent(
                """{"send_to_recipient": false, "send_to_invoicer": false}""",
                Encoding.UTF8,
                "application/json");

            using var sendResponse = await httpClient.SendAsync(sendRequest, cancellationToken);

            if (!sendResponse.IsSuccessStatusCode)
            {
                var sendError = await sendResponse.Content.ReadAsStringAsync(cancellationToken);
                return PaymentLinkResult.Failed(
                    $"Failed to send PayPal invoice: {sendError}",
                    sendResponse.StatusCode.ToString());
            }

            // Get the invoice details to extract the payer-view link
            using var getRequest = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/v2/invoicing/invoices/{invoiceId}");
            getRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            getRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            using var getResponse = await httpClient.SendAsync(getRequest, cancellationToken);
            var getResponseContent = await getResponse.Content.ReadAsStringAsync(cancellationToken);

            if (!getResponse.IsSuccessStatusCode)
            {
                return PaymentLinkResult.Failed(
                    $"Failed to retrieve PayPal invoice: {getResponseContent}",
                    getResponse.StatusCode.ToString());
            }

            using var getDoc = JsonDocument.Parse(getResponseContent);

            // Extract the payer-view link from HATEOAS links
            string? payerViewUrl = null;
            if (getDoc.RootElement.TryGetProperty("links", out var links))
            {
                foreach (var link in links.EnumerateArray())
                {
                    if (link.TryGetProperty("rel", out var rel) &&
                        rel.GetString() == "payer-view" &&
                        link.TryGetProperty("href", out var href))
                    {
                        payerViewUrl = href.GetString();
                        break;
                    }
                }
            }

            if (string.IsNullOrEmpty(payerViewUrl))
            {
                return PaymentLinkResult.Failed("PayPal invoice created but no payment link was returned.");
            }

            return PaymentLinkResult.Created(
                paymentUrl: payerViewUrl,
                providerLinkId: invoiceId);
        }
        catch (HttpRequestException ex)
        {
            return PaymentLinkResult.Failed($"Network error: {ex.Message}");
        }
        catch (JsonException ex)
        {
            return PaymentLinkResult.Failed($"Invalid response from PayPal: {ex.Message}");
        }
        catch (Exception ex)
        {
            return PaymentLinkResult.Failed($"Unexpected error: {ex.Message}");
        }
    }

    /// <inheritdoc />
    /// <remarks>
    /// Cancels a PayPal invoice to deactivate the payment link.
    /// </remarks>
    public override async Task<bool> DeactivatePaymentLinkAsync(
        string providerLinkId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_clientId))
        {
            return false;
        }

        var clientSecret = Configuration?.GetValue("clientSecret");
        if (string.IsNullOrEmpty(clientSecret))
        {
            return false;
        }

        try
        {
            using var httpClient = _httpClientFactory.CreateClient("PayPal");
            var baseUrl = IsTestMode
                ? "https://api-m.sandbox.paypal.com"
                : "https://api-m.paypal.com";

            // Get OAuth access token
            var accessToken = await GetAccessTokenAsync(httpClient, baseUrl, _clientId, clientSecret, cancellationToken);
            if (string.IsNullOrEmpty(accessToken))
            {
                return false;
            }

            // Cancel the invoice
            using var cancelRequest = new HttpRequestMessage(
                HttpMethod.Post,
                $"{baseUrl}/v2/invoicing/invoices/{providerLinkId}/cancel");
            cancelRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            cancelRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            cancelRequest.Content = new StringContent(
                """{"send_to_recipient": false, "send_to_invoicer": false}""",
                Encoding.UTF8,
                "application/json");

            using var cancelResponse = await httpClient.SendAsync(cancelRequest, cancellationToken);

            return cancelResponse.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Gets an OAuth access token from PayPal.
    /// </summary>
    private async Task<string?> GetAccessTokenAsync(
        HttpClient httpClient,
        string baseUrl,
        string clientId,
        string clientSecret,
        CancellationToken cancellationToken)
    {
        using var tokenRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/v1/oauth2/token");
        var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
        tokenRequest.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
        tokenRequest.Content = new StringContent(
            "grant_type=client_credentials",
            Encoding.UTF8,
            "application/x-www-form-urlencoded");

        using var tokenResponse = await httpClient.SendAsync(tokenRequest, cancellationToken);
        if (!tokenResponse.IsSuccessStatusCode)
        {
            return null;
        }

        var tokenJson = await tokenResponse.Content.ReadAsStringAsync(cancellationToken);
        using var tokenDoc = JsonDocument.Parse(tokenJson);
        return tokenDoc.RootElement.TryGetProperty("access_token", out var accessToken)
            ? accessToken.GetString()
            : null;
    }

    /// <summary>
    /// Builds the PayPal invoice payload from the payment link request.
    /// </summary>
    private static string BuildInvoicePayload(PaymentLinkRequest request, string? brandName)
    {
        List<object> items = [];

        // Use line items if provided, otherwise create a single item
        if (request.LineItems is { Count: > 0 })
        {
            foreach (var lineItem in request.LineItems)
            {
                items.Add(new
                {
                    name = lineItem.Name,
                    description = lineItem.Description,
                    quantity = lineItem.Quantity.ToString(),
                    unit_amount = new
                    {
                        currency_code = request.Currency.ToUpperInvariant(),
                        value = lineItem.Amount.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)
                    }
                });
            }
        }
        else
        {
            // Single item for the total amount
            items.Add(new
            {
                name = request.Description ?? "Invoice Payment",
                quantity = "1",
                unit_amount = new
                {
                    currency_code = request.Currency.ToUpperInvariant(),
                    value = request.Amount.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)
                }
            });
        }

        var invoiceNumber = ("MER-" + request.InvoiceId.ToString("N"))[..20];
        var invoiceMemo = "Merchello Invoice " + request.InvoiceId;

        var invoice = new
        {
            detail = new
            {
                invoice_number = invoiceNumber,
                reference = request.InvoiceId.ToString(),
                currency_code = request.Currency.ToUpperInvariant(),
                note = request.Description,
                memo = invoiceMemo
            },
            invoicer = !string.IsNullOrEmpty(brandName)
                ? new { business_name = brandName }
                : null,
            primary_recipients = !string.IsNullOrEmpty(request.CustomerEmail)
                ? new[]
                {
                    new
                    {
                        billing_info = new
                        {
                            email_address = request.CustomerEmail,
                            name = !string.IsNullOrEmpty(request.CustomerName)
                                ? new { full_name = request.CustomerName }
                                : null
                        }
                    }
                }
                : null,
            items
        };

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        return JsonSerializer.Serialize(invoice, jsonOptions);
    }
}
