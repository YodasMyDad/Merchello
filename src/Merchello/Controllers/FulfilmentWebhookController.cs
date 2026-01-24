using Merchello.Core.Fulfilment;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Controllers;

/// <summary>
/// Public controller for receiving fulfilment provider webhooks (from 3PLs).
/// </summary>
[ApiController]
[Route("umbraco/merchello/webhooks/fulfilment")]
[AllowAnonymous]
public class FulfilmentWebhookController(
    IFulfilmentProviderManager providerManager,
    IFulfilmentService fulfilmentService,
    IOptions<FulfilmentSettings> settings,
    ILogger<FulfilmentWebhookController> logger) : ControllerBase
{
    private readonly FulfilmentSettings _settings = settings.Value;

    /// <summary>
    /// Receive webhook from fulfilment provider (3PL).
    /// </summary>
    [HttpPost("{providerKey}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> HandleWebhook(
        string providerKey,
        CancellationToken cancellationToken = default)
    {
        if (!_settings.Enabled)
        {
            return BadRequest("Fulfilment system is disabled.");
        }

        var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        logger.LogInformation("Received fulfilment webhook for provider: {Provider} from {RemoteIp}",
            providerKey, remoteIp);

        // Get the provider
        var registeredProvider = await providerManager.GetProviderAsync(
            providerKey,
            requireEnabled: false, // Allow webhooks even if provider is disabled (might be mid-transition)
            cancellationToken);

        if (registeredProvider == null)
        {
            logger.LogWarning("Fulfilment webhook received for unknown provider: {Provider}", providerKey);
            return NotFound($"Provider '{providerKey}' not found.");
        }

        if (!registeredProvider.Metadata.SupportsWebhooks)
        {
            logger.LogWarning("Fulfilment webhook received for provider that doesn't support webhooks: {Provider}",
                providerKey);
            return BadRequest($"Provider '{providerKey}' does not support webhooks.");
        }

        // Validate webhook signature
        bool isValid;
        try
        {
            isValid = await registeredProvider.Provider.ValidateWebhookAsync(Request, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error validating fulfilment webhook signature for provider: {Provider}", providerKey);
            return BadRequest("Webhook validation failed.");
        }

        if (!isValid)
        {
            logger.LogWarning("Invalid fulfilment webhook signature for provider: {Provider} from {RemoteIp}",
                providerKey, remoteIp);
            return BadRequest("Invalid webhook signature.");
        }

        // Check for duplicate webhook (idempotency)
        var messageId = GetWebhookMessageId(Request);
        if (!string.IsNullOrEmpty(messageId) && registeredProvider.Configuration != null)
        {
            var isDuplicate = await fulfilmentService.IsDuplicateWebhookAsync(
                registeredProvider.Configuration.Id, messageId, cancellationToken);

            if (isDuplicate)
            {
                logger.LogInformation("Duplicate fulfilment webhook received. MessageId: {MessageId}", messageId);
                return Ok(new { message = "Already processed" });
            }
        }

        // Process the webhook
        FulfilmentWebhookResult result;
        try
        {
            result = await registeredProvider.Provider.ProcessWebhookAsync(Request, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing fulfilment webhook for provider: {Provider}", providerKey);
            return BadRequest("Webhook processing failed.");
        }

        if (!result.Success)
        {
            logger.LogWarning("Fulfilment webhook processing failed for provider: {Provider}. Error: {Error}",
                providerKey, result.ErrorMessage);
            return BadRequest(result.ErrorMessage);
        }

        // Log the webhook
        if (registeredProvider.Configuration != null)
        {
            string? payload = null;
            try
            {
                if (Request.Body.CanSeek)
                {
                    Request.Body.Position = 0;
                    using var reader = new StreamReader(Request.Body, leaveOpen: true);
                    payload = await reader.ReadToEndAsync(cancellationToken);
                    Request.Body.Position = 0;
                }
            }
            catch
            {
                // Payload capture is optional
            }

            await fulfilmentService.LogWebhookAsync(
                registeredProvider.Configuration.Id, messageId, result.EventType, payload, cancellationToken);
        }

        // Process status updates
        foreach (var statusUpdate in result.StatusUpdates)
        {
            try
            {
                await fulfilmentService.ProcessStatusUpdateAsync(statusUpdate, cancellationToken);
                logger.LogInformation("Processed status update for order {ProviderReference}: {Status}",
                    statusUpdate.ProviderReference, statusUpdate.MappedStatus);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing status update for order {ProviderReference}",
                    statusUpdate.ProviderReference);
            }
        }

        // Process shipment updates
        foreach (var shipmentUpdate in result.ShipmentUpdates)
        {
            try
            {
                await fulfilmentService.ProcessShipmentUpdateAsync(shipmentUpdate, cancellationToken);
                logger.LogInformation("Processed shipment update for order {ProviderReference}: Shipment {ShipmentId}",
                    shipmentUpdate.ProviderReference, shipmentUpdate.ProviderShipmentId);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing shipment update for order {ProviderReference}",
                    shipmentUpdate.ProviderReference);
            }
        }

        // Process inventory updates (if any)
        if (result.InventoryUpdates.Count > 0)
        {
            logger.LogInformation("Received {Count} inventory updates from {Provider}",
                result.InventoryUpdates.Count, providerKey);
            // Inventory updates are typically handled by IFulfilmentSyncService (Phase 4)
        }

        logger.LogInformation("Successfully processed fulfilment webhook from {Provider}. Event: {EventType}, StatusUpdates: {StatusCount}, ShipmentUpdates: {ShipmentCount}",
            providerKey, result.EventType, result.StatusUpdates.Count, result.ShipmentUpdates.Count);

        return Ok(new
        {
            message = "Webhook processed",
            eventType = result.EventType,
            statusUpdates = result.StatusUpdates.Count,
            shipmentUpdates = result.ShipmentUpdates.Count
        });
    }

    /// <summary>
    /// Extracts the webhook message ID from common header patterns.
    /// </summary>
    private static string? GetWebhookMessageId(HttpRequest request)
    {
        // Try common webhook ID headers
        if (request.Headers.TryGetValue("webhook-id", out var webhookId) && !string.IsNullOrEmpty(webhookId))
            return webhookId.ToString();

        if (request.Headers.TryGetValue("X-Webhook-Id", out var xWebhookId) && !string.IsNullOrEmpty(xWebhookId))
            return xWebhookId.ToString();

        if (request.Headers.TryGetValue("X-Shiphero-Message-ID", out var shipHeroId) && !string.IsNullOrEmpty(shipHeroId))
            return shipHeroId.ToString();

        if (request.Headers.TryGetValue("X-Request-Id", out var requestId) && !string.IsNullOrEmpty(requestId))
            return requestId.ToString();

        return null;
    }

}
