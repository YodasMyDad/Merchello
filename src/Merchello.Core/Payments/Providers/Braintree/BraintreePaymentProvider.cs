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
            Description = "Pay with Visa, Mastercard, American Express, Discover, and more.",
            IntegrationType = PaymentIntegrationType.HostedFields,
            IsExpressCheckout = false,
            DefaultSortOrder = 10
        },
        new PaymentMethodDefinition
        {
            Alias = "paypal",
            DisplayName = "PayPal",
            Icon = "icon-paypal",
            Description = "Fast, secure checkout with your PayPal account.",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 0
        },
        new PaymentMethodDefinition
        {
            Alias = "applepay",
            DisplayName = "Apple Pay",
            Icon = "icon-apple",
            Description = "Fast, secure checkout with Apple Pay.",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 1
        },
        new PaymentMethodDefinition
        {
            Alias = "googlepay",
            DisplayName = "Google Pay",
            Icon = "icon-google",
            Description = "Fast, secure checkout with Google Pay.",
            IntegrationType = PaymentIntegrationType.Widget,
            IsExpressCheckout = true,
            DefaultSortOrder = 2
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

            // Return session with all SDK configuration needed for HostedFields and express checkout
            // SDK versions updated to 3.106.0+ for SSL certificate compatibility (expires June 2025)
            return PaymentSessionResult.HostedFields(
                clientToken: clientToken,
                jsSdkUrl: "https://js.braintreegateway.com/web/dropin/1.44.1/js/dropin.min.js",
                sdkConfig: new Dictionary<string, object>
                {
                    // Provider identifier for frontend SDK detection
                    ["provider"] = "braintree",

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
            if (!headers.TryGetValue("bt_signature", out var signature) &&
                !headers.TryGetValue("Bt-Signature", out signature))
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
            // Get signature from headers
            if (!headers.TryGetValue("bt_signature", out var signature) &&
                !headers.TryGetValue("Bt-Signature", out signature))
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
