using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Merchello.Core.Payments.Models;
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
    /// URL to the PayPal payment adapter script.
    /// </summary>
    private const string PayPalPaymentAdapterUrl = "/js/checkout/adapters/paypal-payment-adapter.js";

    /// <summary>
    /// SVG icon for PayPal.
    /// </summary>
    private const string PayPalIconSvg = """<svg class="w-16 h-5" viewBox="0 0 64 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.4 4.5H11.5C13.4 4.5 14.5 5.5 14.4 7.3C14.2 10.4 12.1 12.1 9.4 12.1H8.1L7.4 16.5H4.6L7.4 4.5Z" fill="#003087"/><path d="M9.2 7H10.6C11.5 7 12.2 7.3 12.1 8.3C11.9 9.8 11 10.2 9.9 10.2H8.8L9.2 7Z" fill="#003087"/><path d="M16.2 4.5H20.3C22.2 4.5 23.3 5.5 23.2 7.3C23 10.4 20.9 12.1 18.2 12.1H16.9L16.2 16.5H13.4L16.2 4.5Z" fill="#0070E0"/><path d="M18 7H19.4C20.3 7 21 7.3 20.9 8.3C20.7 9.8 19.8 10.2 18.7 10.2H17.6L18 7Z" fill="#0070E0"/><path d="M25.5 16.5L27.5 4.5H30.3L28.3 16.5H25.5Z" fill="#003087"/><path d="M36.8 4.2C39.8 4.2 41.6 6 41.3 9C41 12 38.8 13.9 35.8 13.9C32.8 13.9 31 12.1 31.3 9.1C31.6 6.1 33.8 4.2 36.8 4.2ZM36.1 11.5C37.5 11.5 38.6 10.5 38.8 8.9C39 7.3 38.2 6.3 36.8 6.3C35.4 6.3 34.3 7.3 34.1 8.9C33.9 10.5 34.7 11.5 36.1 11.5Z" fill="#003087"/><path d="M42.5 16.5L44.5 4.5H47.1L46.8 6.3C47.7 5.1 49.1 4.2 50.5 4.2C52.5 4.2 53.6 5.5 53.3 7.8L52.2 16.5H49.4L50.3 8.8C50.4 7.8 50 7.2 49 7.2C47.8 7.2 46.7 8.2 46.4 10.3L45.6 16.5H42.5Z" fill="#003087"/></svg>""";

    /// <summary>
    /// SVG icon for Pay Later.
    /// </summary>
    private const string PayLaterIconSvg = """<svg class="w-16 h-5" viewBox="0 0 64 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.4 4.5H11.5C13.4 4.5 14.5 5.5 14.4 7.3C14.2 10.4 12.1 12.1 9.4 12.1H8.1L7.4 16.5H4.6L7.4 4.5Z" fill="#003087"/><path d="M9.2 7H10.6C11.5 7 12.2 7.3 12.1 8.3C11.9 9.8 11 10.2 9.9 10.2H8.8L9.2 7Z" fill="#003087"/><path d="M16.2 4.5H20.3C22.2 4.5 23.3 5.5 23.2 7.3C23 10.4 20.9 12.1 18.2 12.1H16.9L16.2 16.5H13.4L16.2 4.5Z" fill="#0070E0"/><path d="M18 7H19.4C20.3 7 21 7.3 20.9 8.3C20.7 9.8 19.8 10.2 18.7 10.2H17.6L18 7Z" fill="#0070E0"/><rect x="26" y="3" width="36" height="14" rx="2" fill="#FFD140"/><text x="44" y="13" font-size="8" fill="#003087" text-anchor="middle" font-family="Arial" font-weight="bold">PAY LATER</text></svg>""";

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
            MethodType = PaymentMethodType.PayPal
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
            MethodType = PaymentMethodType.BuyNowPayLater
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
        var parameters = new List<string>
        {
            $"client-id={_clientId}",
            $"currency={currency.ToUpperInvariant()}",
            "intent=capture",
            "components=buttons,funding-eligibility"
        };

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
    /// URL to the PayPal express checkout adapter script.
    /// </summary>
    private const string PayPalExpressAdapterUrl = "/js/checkout/adapters/paypal-express-adapter.js";

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
            "paypal" => PaymentMethodType.PayPal,
            "paylater" => PaymentMethodType.BuyNowPayLater,
            _ => (PaymentMethodType?)null
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
        Models.RefundRequest request,
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
}

/// <summary>
/// PayPal webhook event model for deserialization.
/// </summary>
internal class PayPalWebhookEvent
{
    public string? Id { get; set; }
    public string? EventType { get; set; }
    public string? ResourceType { get; set; }
    public PayPalWebhookResource? Resource { get; set; }
}

/// <summary>
/// PayPal webhook resource model.
/// </summary>
internal class PayPalWebhookResource
{
    public string? Id { get; set; }
    public string? Status { get; set; }
    public string? CustomId { get; set; }
    public PayPalWebhookAmount? Amount { get; set; }
    public List<PayPalWebhookPurchaseUnit>? PurchaseUnits { get; set; }
}

/// <summary>
/// PayPal webhook amount model.
/// </summary>
internal class PayPalWebhookAmount
{
    public string? CurrencyCode { get; set; }
    public string? Value { get; set; }
}

/// <summary>
/// PayPal webhook purchase unit model.
/// </summary>
internal class PayPalWebhookPurchaseUnit
{
    public string? ReferenceId { get; set; }
    public string? CustomId { get; set; }
}
