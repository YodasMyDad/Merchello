using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Merchello.Controllers;

/// <summary>
/// Public controller for receiving payment provider webhooks
/// </summary>
[ApiController]
[Route("umbraco/merchello/webhooks/payments")]
[AllowAnonymous]
public class PaymentWebhookController(
    IPaymentProviderManager providerManager,
    IPaymentService paymentService,
    ILogger<PaymentWebhookController> logger) : ControllerBase
{

    /// <summary>
    /// Receive webhook from payment provider
    /// </summary>
    [HttpPost("{providerAlias}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> HandleWebhook(
        string providerAlias,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Received webhook for provider: {Provider}", providerAlias);

        // Get the provider
        var registeredProvider = await providerManager.GetProviderAsync(
            providerAlias,
            requireEnabled: false, // Allow webhooks even if provider is disabled
            cancellationToken);

        if (registeredProvider == null)
        {
            logger.LogWarning("Webhook received for unknown provider: {Provider}", providerAlias);
            return NotFound($"Provider '{providerAlias}' not found.");
        }

        // Extract headers first (needed for both form and raw body handling)
        var headers = Request.Headers
            .ToDictionary(
                h => h.Key,
                h => h.Value.ToString(),
                StringComparer.OrdinalIgnoreCase);

        // Read the payload - handle form data for Braintree, raw body for others
        string payload;
        if (Request.ContentType?.Contains("application/x-www-form-urlencoded", StringComparison.OrdinalIgnoreCase) == true)
        {
            // Braintree sends webhooks as form data with bt_signature and bt_payload fields
            // See: https://developer.paypal.com/braintree/docs/guides/webhooks/parse/dotnet/
            var btSignature = Request.Form["bt_signature"].ToString();
            var btPayload = Request.Form["bt_payload"].ToString();

            if (string.IsNullOrEmpty(btSignature) || string.IsNullOrEmpty(btPayload))
            {
                logger.LogWarning("Missing bt_signature or bt_payload in form data for provider: {Provider}", providerAlias);
                return BadRequest("Missing bt_signature or bt_payload.");
            }

            // Pass bt_signature via headers dict so the provider can access it
            headers["bt_signature"] = btSignature;
            payload = btPayload;

            logger.LogDebug("Extracted Braintree webhook form data: signature length={SignatureLength}, payload length={PayloadLength}",
                btSignature.Length, btPayload.Length);
        }
        else
        {
            // Standard JSON/raw body for other providers (Stripe, PayPal, etc.)
            using var reader = new StreamReader(Request.Body);
            payload = await reader.ReadToEndAsync(cancellationToken);
        }

        if (string.IsNullOrEmpty(payload))
        {
            logger.LogWarning("Empty webhook payload received for provider: {Provider}", providerAlias);
            return BadRequest("Empty payload.");
        }

        // Validate webhook signature
        bool isValid;
        try
        {
            isValid = await registeredProvider.Provider.ValidateWebhookAsync(payload, headers, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error validating webhook signature for provider: {Provider}", providerAlias);
            return BadRequest("Webhook validation failed.");
        }

        if (!isValid)
        {
            logger.LogWarning("Invalid webhook signature for provider: {Provider}", providerAlias);
            return BadRequest("Invalid webhook signature.");
        }

        // Process the webhook
        WebhookProcessingResult result;
        try
        {
            result = await registeredProvider.Provider.ProcessWebhookAsync(payload, headers, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing webhook for provider: {Provider}", providerAlias);
            return BadRequest("Webhook processing failed.");
        }

        if (!result.Success)
        {
            logger.LogWarning(
                "Webhook processing failed for provider: {Provider}. Error: {Error}",
                providerAlias,
                result.ErrorMessage);
            return BadRequest(result.ErrorMessage);
        }

        if (result.AlreadyProcessed)
        {
            logger.LogInformation(
                "Webhook already processed for provider: {Provider}, TransactionId: {TransactionId}",
                providerAlias,
                result.TransactionId);
            return Ok(new { message = "Already processed" });
        }

        // Handle the event based on type
        await HandleWebhookEventAsync(providerAlias, result, cancellationToken);

        logger.LogInformation(
            "Webhook processed successfully for provider: {Provider}, Event: {Event}, TransactionId: {TransactionId}",
            providerAlias,
            result.EventType,
            result.TransactionId);

        return Ok(new { message = "Webhook processed", eventType = result.EventType?.ToString() });
    }

    private async Task HandleWebhookEventAsync(
        string providerAlias,
        WebhookProcessingResult result,
        CancellationToken cancellationToken)
    {
        switch (result.EventType)
        {
            case WebhookEventType.PaymentCompleted:
                if (result.InvoiceId.HasValue && !string.IsNullOrEmpty(result.TransactionId) && result.Amount.HasValue)
                {
                    // Check if payment already exists (idempotency)
                    var existingPayment = await paymentService.GetPaymentByTransactionIdAsync(
                        result.TransactionId,
                        cancellationToken);

                    if (existingPayment == null)
                    {
                        await paymentService.RecordPaymentAsync(
                            new RecordPaymentParameters
                            {
                                InvoiceId = result.InvoiceId.Value,
                                ProviderAlias = providerAlias,
                                TransactionId = result.TransactionId,
                                Amount = result.Amount.Value,
                                Description = "Payment via " + providerAlias + " webhook",
                                SettlementCurrencyCode = result.SettlementCurrency,
                                SettlementExchangeRate = result.SettlementExchangeRate,
                                SettlementAmount = result.SettlementAmount,
                                SettlementExchangeRateSource = providerAlias,
                                RiskScore = result.RiskScore,
                                RiskScoreSource = result.RiskScoreSource
                            },
                            cancellationToken);

                        logger.LogInformation(
                            "Payment recorded from webhook: InvoiceId={InvoiceId}, Amount={Amount}, TransactionId={TransactionId}, RiskScore={RiskScore}",
                            result.InvoiceId,
                            result.Amount,
                            result.TransactionId,
                            result.RiskScore);
                    }
                    else
                    {
                        logger.LogInformation(
                            "Payment already exists for TransactionId={TransactionId}",
                            result.TransactionId);
                    }
                }
                break;

            case WebhookEventType.PaymentFailed:
                logger.LogWarning(
                    "Payment failed event received: InvoiceId={InvoiceId}, TransactionId={TransactionId}",
                    result.InvoiceId,
                    result.TransactionId);
                // Could update invoice status or send notification
                break;

            case WebhookEventType.PaymentCancelled:
                logger.LogInformation(
                    "Payment cancelled event received: InvoiceId={InvoiceId}, TransactionId={TransactionId}",
                    result.InvoiceId,
                    result.TransactionId);
                break;

            case WebhookEventType.RefundCompleted:
                logger.LogInformation(
                    "Refund completed event received: TransactionId={TransactionId}, Amount={Amount}",
                    result.TransactionId,
                    result.Amount);
                // Refunds are typically initiated from backoffice, so already recorded
                break;

            case WebhookEventType.DisputeOpened:
                logger.LogWarning(
                    "Dispute opened event received: TransactionId={TransactionId}",
                    result.TransactionId);
                // Could send notification or update status
                break;

            case WebhookEventType.DisputeResolved:
                logger.LogInformation(
                    "Dispute resolved event received: TransactionId={TransactionId}",
                    result.TransactionId);
                break;

            case WebhookEventType.Unknown:
            default:
                logger.LogDebug(
                    "Unknown webhook event type received from {Provider}",
                    providerAlias);
                break;
        }
    }
}
