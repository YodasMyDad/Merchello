using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Stripe;
using Stripe.Checkout;

namespace Merchello.PaymentProviders.Stripe;

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
public class StripePaymentProvider : PaymentProviderBase
{
    /// <summary>
    /// Zero-decimal currencies that don't need multiplication by 100.
    /// </summary>
    private static readonly HashSet<string> ZeroDecimalCurrencies = new(StringComparer.OrdinalIgnoreCase)
    {
        "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF",
        "UGX", "VND", "VUV", "XAF", "XOF", "XPF"
    };

    private StripeClient? _client;
    private string? _webhookSecret;

    /// <inheritdoc />
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "stripe",
        DisplayName = "Stripe",
        Icon = "icon-credit-card",
        Description = "Accept payments via Stripe Checkout. Supports credit cards, Apple Pay, Google Pay, and more.",
        IntegrationType = PaymentIntegrationType.Redirect,
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

        try
        {
            var sessionService = new SessionService(_client);

            // Build line items - single line item for the invoice total
            var lineItems = new List<SessionLineItemOptions>
            {
                new()
                {
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = request.Currency.ToLowerInvariant(),
                        UnitAmount = ConvertToStripeAmount(request.Amount, request.Currency),
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = request.Description ?? $"Invoice Payment",
                            Description = $"Invoice #{request.InvoiceId}"
                        }
                    },
                    Quantity = 1
                }
            };

            // Build metadata for webhook correlation
            var metadata = new Dictionary<string, string>
            {
                ["invoiceId"] = request.InvoiceId.ToString(),
                ["source"] = "merchello"
            };

            // Merge any additional metadata from request
            if (request.Metadata is not null)
            {
                foreach (var kvp in request.Metadata)
                {
                    metadata[kvp.Key] = kvp.Value;
                }
            }

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
                    Metadata = metadata,
                    // Enable manual capture if auth-and-capture is needed
                    // CaptureMethod = "manual"
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

    /// <inheritdoc />
    public override Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        // For redirect-based providers, payment confirmation comes via webhook.
        // Return pending status - the webhook will update the payment to completed.
        return Task.FromResult(PaymentResult.Pending(
            transactionId: request.SessionId ?? $"pending_{request.InvoiceId}",
            amount: request.Amount ?? 0));
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
    public override Task<WebhookProcessingResult> ProcessWebhookAsync(
        string payload,
        IDictionary<string, string> headers,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_webhookSecret))
        {
            return Task.FromResult(WebhookProcessingResult.Failure("Webhook secret not configured."));
        }

        try
        {
            // Get signature header
            if (!headers.TryGetValue("Stripe-Signature", out var signature) &&
                !headers.TryGetValue("stripe-signature", out signature))
            {
                return Task.FromResult(WebhookProcessingResult.Failure("Missing Stripe-Signature header."));
            }

            // Parse and validate the event
            var stripeEvent = EventUtility.ConstructEvent(payload, signature, _webhookSecret);

            return Task.FromResult(ProcessStripeEvent(stripeEvent));
        }
        catch (StripeException ex)
        {
            return Task.FromResult(WebhookProcessingResult.Failure($"Stripe error: {ex.Message}"));
        }
    }

    /// <summary>
    /// Process a validated Stripe event.
    /// </summary>
    private WebhookProcessingResult ProcessStripeEvent(Event stripeEvent)
    {
        switch (stripeEvent.Type)
        {
            case "checkout.session.completed":
                return HandleCheckoutSessionCompleted(stripeEvent);

            case "payment_intent.succeeded":
                return HandlePaymentIntentSucceeded(stripeEvent);

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

    private WebhookProcessingResult HandleCheckoutSessionCompleted(Event stripeEvent)
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

        return WebhookProcessingResult.Successful(
            eventType: WebhookEventType.PaymentCompleted,
            transactionId: transactionId,
            invoiceId: invoiceId,
            amount: session.AmountTotal.HasValue
                ? ConvertFromStripeAmount(session.AmountTotal.Value, session.Currency)
                : null);
    }

    private WebhookProcessingResult HandlePaymentIntentSucceeded(Event stripeEvent)
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
            eventType: WebhookEventType.PaymentCompleted,
            transactionId: paymentIntent.Id,
            invoiceId: invoiceId,
            amount: ConvertFromStripeAmount(paymentIntent.Amount, paymentIntent.Currency));
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
    private static long ConvertToStripeAmount(decimal amount, string currency)
    {
        if (ZeroDecimalCurrencies.Contains(currency))
        {
            return (long)Math.Round(amount);
        }

        // Standard currencies: multiply by 100
        return (long)Math.Round(amount * 100);
    }

    /// <summary>
    /// Converts Stripe's smallest currency unit back to decimal.
    /// </summary>
    private static decimal ConvertFromStripeAmount(long amount, string? currency)
    {
        if (string.IsNullOrEmpty(currency))
        {
            return amount / 100m;
        }

        if (ZeroDecimalCurrencies.Contains(currency))
        {
            return amount;
        }

        return amount / 100m;
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
}
