using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Shipping.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Fulfilment.Services;

/// <summary>
/// Service for managing order fulfilment operations.
/// </summary>
public class FulfilmentService(
    MerchelloDbContext dbContext,
    IFulfilmentProviderManager providerManager,
    ShipmentFactory shipmentFactory,
    IOptions<FulfilmentSettings> settings,
    ILogger<FulfilmentService> logger) : IFulfilmentService
{
    private readonly FulfilmentSettings _settings = settings.Value;

    /// <inheritdoc />
    public async Task<CrudResult<Order>> SubmitOrderAsync(Guid orderId, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Order>();

        var order = await dbContext.Orders
            .Include(o => o.Invoice)
            .Include(o => o.LineItems)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);

        if (order == null)
        {
            result.AddErrorMessage($"Order {orderId} not found.");
            return result;
        }

        // Guard: Already submitted
        if (!string.IsNullOrEmpty(order.FulfilmentProviderReference))
        {
            result.AddWarningMessage("Order has already been submitted to fulfilment provider.");
            result.ResultObject = order;
            return result;
        }

        // Guard: Already processing (submission in progress)
        if (order.Status == OrderStatus.Processing && order.FulfilmentProviderConfigurationId.HasValue)
        {
            result.AddWarningMessage("Order submission is already in progress.");
            result.ResultObject = order;
            return result;
        }

        // Resolve provider configuration
        var providerConfig = await ResolveProviderForWarehouseAsync(order.WarehouseId, cancellationToken);

        // If no provider configured, this is manual fulfilment - not an error
        if (providerConfig == null)
        {
            logger.LogDebug("No fulfilment provider configured for order {OrderId} warehouse {WarehouseId}. Manual fulfilment assumed.",
                orderId, order.WarehouseId);
            result.ResultObject = order;
            return result;
        }

        // Get the provider instance
        var registeredProvider = await providerManager.GetConfiguredProviderAsync(providerConfig.Id, cancellationToken);
        if (registeredProvider == null)
        {
            result.AddErrorMessage($"Fulfilment provider configuration {providerConfig.Id} not found.");
            return result;
        }

        // Check if provider is enabled
        if (!registeredProvider.IsEnabled)
        {
            result.AddErrorMessage($"Fulfilment provider '{registeredProvider.Metadata.Key}' is disabled.");
            return result;
        }

        // Check if provider supports order submission
        if (!registeredProvider.Metadata.SupportsOrderSubmission)
        {
            logger.LogDebug("Provider {ProviderKey} does not support order submission. Manual fulfilment assumed.",
                registeredProvider.Metadata.Key);
            result.ResultObject = order;
            return result;
        }

        // Set provider configuration on order before submission
        order.FulfilmentProviderConfigurationId = providerConfig.Id;
        order.Status = OrderStatus.Processing;
        order.DateUpdated = DateTime.UtcNow;

        // Build fulfilment request
        var request = await BuildFulfilmentRequestAsync(order, providerConfig, cancellationToken);

        try
        {
            // Submit to provider
            var providerResult = await registeredProvider.Provider.SubmitOrderAsync(request, cancellationToken);

            if (providerResult.Success)
            {
                order.FulfilmentProviderReference = providerResult.ProviderReference;
                order.FulfilmentSubmittedAt = DateTime.UtcNow;
                order.FulfilmentErrorMessage = null;
                order.DateUpdated = DateTime.UtcNow;

                // Store any extended data from provider
                if (providerResult.ExtendedData.Count > 0)
                {
                    foreach (var kvp in providerResult.ExtendedData)
                    {
                        order.ExtendedData[$"Fulfilment:{kvp.Key}"] = kvp.Value;
                    }
                }

                await dbContext.SaveChangesAsync(cancellationToken);

                logger.LogInformation("Order {OrderId} successfully submitted to {ProviderKey}. Reference: {Reference}",
                    orderId, registeredProvider.Metadata.Key, providerResult.ProviderReference);

                result.ResultObject = order;
                result.AddSuccessMessage($"Order submitted to {registeredProvider.Metadata.DisplayName}.");
            }
            else
            {
                // Submission failed
                order.FulfilmentErrorMessage = providerResult.ErrorMessage;
                order.FulfilmentRetryCount++;
                order.DateUpdated = DateTime.UtcNow;

                // Check if max retries exceeded
                if (order.FulfilmentRetryCount >= _settings.MaxRetryAttempts)
                {
                    order.Status = OrderStatus.FulfilmentFailed;
                    logger.LogError("Order {OrderId} fulfilment failed after {RetryCount} attempts. Error: {Error}",
                        orderId, order.FulfilmentRetryCount, providerResult.ErrorMessage);
                }
                else
                {
                    logger.LogWarning("Order {OrderId} fulfilment attempt {RetryCount} failed. Error: {Error}. Will retry.",
                        orderId, order.FulfilmentRetryCount, providerResult.ErrorMessage);
                }

                await dbContext.SaveChangesAsync(cancellationToken);

                result.AddErrorMessage(providerResult.ErrorMessage ?? "Failed to submit order to fulfilment provider.");
                result.ResultObject = order;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Exception submitting order {OrderId} to fulfilment provider {ProviderKey}",
                orderId, registeredProvider.Metadata.Key);

            order.FulfilmentErrorMessage = ex.Message;
            order.FulfilmentRetryCount++;
            order.DateUpdated = DateTime.UtcNow;

            if (order.FulfilmentRetryCount >= _settings.MaxRetryAttempts)
            {
                order.Status = OrderStatus.FulfilmentFailed;
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            result.AddErrorMessage($"Exception during fulfilment submission: {ex.Message}");
            result.ResultObject = order;
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Order>> RetrySubmissionAsync(Guid orderId, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Order>();

        var order = await dbContext.Orders
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);

        if (order == null)
        {
            result.AddErrorMessage($"Order {orderId} not found.");
            return result;
        }

        // Can only retry failed orders or orders with errors
        if (order.Status != OrderStatus.FulfilmentFailed &&
            string.IsNullOrEmpty(order.FulfilmentErrorMessage))
        {
            result.AddErrorMessage("Order is not in a retryable state.");
            result.ResultObject = order;
            return result;
        }

        // Already has a provider reference - can't retry
        if (!string.IsNullOrEmpty(order.FulfilmentProviderReference))
        {
            result.AddWarningMessage("Order has already been submitted successfully.");
            result.ResultObject = order;
            return result;
        }

        // Reset status for retry
        order.Status = OrderStatus.Processing;
        order.FulfilmentErrorMessage = null;
        order.DateUpdated = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return await SubmitOrderAsync(orderId, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<CrudResult<Order>> CancelOrderAsync(Guid orderId, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Order>();

        var order = await dbContext.Orders
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);

        if (order == null)
        {
            result.AddErrorMessage($"Order {orderId} not found.");
            return result;
        }

        // If no provider reference, nothing to cancel at 3PL
        if (string.IsNullOrEmpty(order.FulfilmentProviderReference))
        {
            logger.LogDebug("Order {OrderId} has no fulfilment provider reference. No 3PL cancellation needed.", orderId);
            result.ResultObject = order;
            return result;
        }

        // Get provider
        if (!order.FulfilmentProviderConfigurationId.HasValue)
        {
            result.AddWarningMessage("Order has no fulfilment provider configuration.");
            result.ResultObject = order;
            return result;
        }

        var registeredProvider = await providerManager.GetConfiguredProviderAsync(
            order.FulfilmentProviderConfigurationId.Value, cancellationToken);

        if (registeredProvider == null)
        {
            result.AddWarningMessage("Fulfilment provider configuration not found. Unable to cancel at 3PL.");
            result.ResultObject = order;
            return result;
        }

        if (!registeredProvider.Metadata.SupportsOrderCancellation)
        {
            logger.LogDebug("Provider {ProviderKey} does not support order cancellation.", registeredProvider.Metadata.Key);
            result.ResultObject = order;
            return result;
        }

        try
        {
            var cancelResult = await registeredProvider.Provider.CancelOrderAsync(
                order.FulfilmentProviderReference, cancellationToken);

            if (cancelResult.Success)
            {
                logger.LogInformation("Order {OrderId} cancelled at {ProviderKey}. Reference: {Reference}",
                    orderId, registeredProvider.Metadata.Key, order.FulfilmentProviderReference);
                result.AddSuccessMessage("Order cancelled at fulfilment provider.");
            }
            else
            {
                logger.LogWarning("Failed to cancel order {OrderId} at {ProviderKey}. Error: {Error}",
                    orderId, registeredProvider.Metadata.Key, cancelResult.ErrorMessage);
                result.AddWarningMessage($"Could not cancel at 3PL: {cancelResult.ErrorMessage}");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Exception cancelling order {OrderId} at fulfilment provider", orderId);
            result.AddWarningMessage($"Exception during 3PL cancellation: {ex.Message}");
        }

        result.ResultObject = order;
        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Order>> ProcessStatusUpdateAsync(FulfilmentStatusUpdate update, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Order>();

        var order = await dbContext.Orders
            .FirstOrDefaultAsync(o => o.FulfilmentProviderReference == update.ProviderReference, cancellationToken);

        if (order == null)
        {
            result.AddErrorMessage($"Order with provider reference '{update.ProviderReference}' not found.");
            return result;
        }

        var oldStatus = order.Status;
        order.Status = update.MappedStatus;
        order.DateUpdated = DateTime.UtcNow;

        // Store provider status in extended data for reference
        order.ExtendedData["Fulfilment:ProviderStatus"] = update.ProviderStatus;
        order.ExtendedData["Fulfilment:StatusUpdatedAt"] = update.StatusDate.ToString("O");

        if (!string.IsNullOrEmpty(update.ErrorMessage))
        {
            order.FulfilmentErrorMessage = update.ErrorMessage;
        }

        // Update date fields based on status
        switch (update.MappedStatus)
        {
            case OrderStatus.Processing:
                order.ProcessingStartedDate ??= DateTime.UtcNow;
                break;
            case OrderStatus.Shipped:
                order.ShippedDate ??= DateTime.UtcNow;
                break;
            case OrderStatus.Completed:
                order.CompletedDate = DateTime.UtcNow;
                break;
            case OrderStatus.Cancelled:
                order.CancelledDate = DateTime.UtcNow;
                break;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Order {OrderId} status updated from {OldStatus} to {NewStatus} via provider update",
            order.Id, oldStatus, update.MappedStatus);

        result.ResultObject = order;
        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Shipment>> ProcessShipmentUpdateAsync(FulfilmentShipmentUpdate update, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Shipment>();

        // Find the order
        var order = await dbContext.Orders
            .Include(o => o.Shipments)
            .Include(o => o.LineItems)
            .FirstOrDefaultAsync(o => o.FulfilmentProviderReference == update.ProviderReference, cancellationToken);

        if (order == null)
        {
            result.AddErrorMessage($"Order with provider reference '{update.ProviderReference}' not found.");
            return result;
        }

        // Check if shipment already exists (by provider shipment ID)
        var existingShipment = order.Shipments?
            .FirstOrDefault(s => s.ExtendedData.TryGetValue("Fulfilment:ProviderShipmentId", out var id) &&
                                 id?.ToString() == update.ProviderShipmentId);

        Shipment shipment;

        if (existingShipment != null)
        {
            // Update existing shipment
            shipment = existingShipment;
            shipment.TrackingNumber = update.TrackingNumber ?? shipment.TrackingNumber;
            shipment.TrackingUrl = update.TrackingUrl ?? shipment.TrackingUrl;
            shipment.Carrier = update.Carrier ?? shipment.Carrier;

            if (update.ShippedDate.HasValue && shipment.Status == ShipmentStatus.Preparing)
            {
                shipment.Status = ShipmentStatus.Shipped;
                shipment.ShippedDate = update.ShippedDate;
            }
        }
        else
        {
            // Create new shipment
            shipment = shipmentFactory.CreateFromWebhook(
                order,
                trackingNumber: update.TrackingNumber,
                trackingUrl: update.TrackingUrl,
                carrier: update.Carrier,
                shippedDate: update.ShippedDate);

            shipment.ExtendedData["Fulfilment:ProviderShipmentId"] = update.ProviderShipmentId;

            // Assign line items to shipment
            if (update.Items != null && update.Items.Count > 0)
            {
                // Partial shipment - assign specified items
                foreach (var item in update.Items)
                {
                    var lineItem = order.LineItems?.FirstOrDefault(li =>
                        string.Equals(li.Sku, item.Sku, StringComparison.OrdinalIgnoreCase));

                    if (lineItem != null)
                    {
                        shipment.LineItems.Add(lineItem);
                    }
                }
            }
            else if (order.LineItems != null)
            {
                // Full shipment - assign all items
                shipment.LineItems.AddRange(order.LineItems);
            }

            dbContext.Shipments.Add(shipment);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        // Update order status based on shipments
        await UpdateOrderShipmentStatusAsync(order, cancellationToken);

        logger.LogInformation("Processed shipment update for order {OrderId}. Shipment: {ShipmentId}, Tracking: {TrackingNumber}",
            order.Id, shipment.Id, shipment.TrackingNumber);

        result.ResultObject = shipment;
        return result;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<Order>> GetOrdersForPollingAsync(Guid providerConfigId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Orders
            .Where(o => o.FulfilmentProviderConfigurationId == providerConfigId)
            .Where(o => o.Status == OrderStatus.Processing ||
                        o.Status == OrderStatus.PartiallyShipped ||
                        o.Status == OrderStatus.Shipped)
            .Where(o => !string.IsNullOrEmpty(o.FulfilmentProviderReference))
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<FulfilmentProviderConfiguration?> ResolveProviderForWarehouseAsync(Guid warehouseId, CancellationToken cancellationToken = default)
    {
        var warehouse = await dbContext.Warehouses
            .Include(w => w.FulfilmentProviderConfiguration)
            .Include(w => w.Supplier)
            .ThenInclude(s => s!.DefaultFulfilmentProviderConfiguration)
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == warehouseId, cancellationToken);

        if (warehouse == null)
        {
            return null;
        }

        // Hierarchical resolution: Warehouse override > Supplier default
        return warehouse.FulfilmentProviderConfiguration
               ?? warehouse.Supplier?.DefaultFulfilmentProviderConfiguration;
    }

    /// <summary>
    /// Gets orders that are ready for retry based on retry count and delay.
    /// </summary>
    public async Task<IReadOnlyList<Order>> GetOrdersReadyForRetryAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        var orders = await dbContext.Orders
            .Where(o => o.Status == OrderStatus.Processing || o.Status == OrderStatus.FulfilmentFailed)
            .Where(o => !string.IsNullOrEmpty(o.FulfilmentErrorMessage))
            .Where(o => string.IsNullOrEmpty(o.FulfilmentProviderReference))
            .Where(o => o.FulfilmentRetryCount < _settings.MaxRetryAttempts)
            .Where(o => o.FulfilmentProviderConfigurationId != null)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        // Filter by delay (done in memory as delay calculation depends on retry count)
        return orders.Where(o =>
        {
            var lastAttempt = o.DateUpdated;
            var delay = _settings.GetNextRetryDelay(o.FulfilmentRetryCount - 1);
            return now >= lastAttempt.Add(delay);
        }).ToList();
    }

    private async Task<FulfilmentOrderRequest> BuildFulfilmentRequestAsync(
        Order order,
        FulfilmentProviderConfiguration providerConfig,
        CancellationToken cancellationToken)
    {
        // Get invoice for customer details
        var invoice = order.Invoice ?? await dbContext.Invoices
            .Include(i => i.BillingAddress)
            .Include(i => i.ShippingAddress)
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == order.InvoiceId, cancellationToken);

        var lineItems = order.LineItems ?? await dbContext.LineItems
            .Where(li => li.OrderId == order.Id)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var fulfilmentLineItems = lineItems.Select(li => new FulfilmentLineItem
        {
            LineItemId = li.Id,
            Sku = li.Sku ?? "",
            Name = li.Name ?? "",
            Quantity = li.Quantity,
            UnitPrice = li.Amount,
            ExtendedData = li.ExtendedData
        }).ToList();

        var shippingAddress = MapToFulfilmentAddress(invoice?.ShippingAddress);

        // Resolve 3PL shipping method via fallback chain
        var shippingServiceCode = ResolveShippingServiceCode(order, providerConfig.SettingsJson);

        return new FulfilmentOrderRequest
        {
            OrderId = order.Id,
            OrderNumber = invoice?.InvoiceNumber ?? order.Id.ToString("N")[..8].ToUpperInvariant(),
            LineItems = fulfilmentLineItems,
            ShippingAddress = shippingAddress,
            BillingAddress = invoice?.BillingAddress != null ? MapToFulfilmentAddress(invoice.BillingAddress) : null,
            CustomerEmail = invoice?.BillingAddress?.Email,
            ShippingServiceCode = shippingServiceCode,
            RequestedDeliveryDate = order.RequestedDeliveryDate,
            InternalNotes = order.InternalNotes,
            ExtendedData = order.ExtendedData
        };
    }

    internal static string? ResolveShippingServiceCode(Order order, string? settingsJson)
    {
        if (string.IsNullOrEmpty(settingsJson)) return order.ShippingServiceCode;

        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(settingsJson);
            var root = doc.RootElement;

            // 1. Flat-rate: lookup by ShippingOptionId in ServiceMappings
            if (order.ShippingOptionId != Guid.Empty &&
                root.TryGetProperty("ServiceMappings", out var mappingsElement))
            {
                var optionKey = order.ShippingOptionId.ToString();
                // ServiceMappings is stored as a JSON string value (serialized by frontend)
                var mappingsJson = mappingsElement.GetString();
                if (!string.IsNullOrEmpty(mappingsJson))
                {
                    using var mappingsDoc = System.Text.Json.JsonDocument.Parse(mappingsJson);
                    if (mappingsDoc.RootElement.TryGetProperty(optionKey, out var mapped))
                    {
                        var code = mapped.GetString();
                        if (!string.IsNullOrEmpty(code)) return code;
                    }
                }
            }

            // 2. Category inference (works for both flat-rate and dynamic)
            if (order.ShippingServiceCategory.HasValue)
            {
                var categoryKey = $"ServiceCategoryMapping_{order.ShippingServiceCategory.Value}";
                if (root.TryGetProperty(categoryKey, out var categoryMapping))
                {
                    var code = categoryMapping.GetString();
                    if (!string.IsNullOrEmpty(code)) return code;
                }
            }

            // 3. DefaultShippingMethod
            if (root.TryGetProperty("DefaultShippingMethod", out var defaultVal))
            {
                var code = defaultVal.GetString();
                if (!string.IsNullOrEmpty(code)) return code;
            }
        }
        catch (System.Text.Json.JsonException) { /* fall through */ }

        // 4. Raw carrier code (last resort)
        return order.ShippingServiceCode;
    }

    private static FulfilmentAddress MapToFulfilmentAddress(Locality.Models.Address? address)
    {
        if (address == null)
        {
            return new FulfilmentAddress
            {
                Address1 = "",
                City = "",
                PostalCode = "",
                CountryCode = ""
            };
        }

        return new FulfilmentAddress
        {
            Name = address.Name,
            Company = address.Company,
            Address1 = address.AddressOne ?? "",
            Address2 = address.AddressTwo,
            City = address.TownCity ?? "",
            StateOrProvince = address.CountyState?.RegionCode,
            PostalCode = address.PostalCode ?? "",
            CountryCode = address.CountryCode ?? "",
            Phone = address.Phone
        };
    }

    private async Task UpdateOrderShipmentStatusAsync(Order order, CancellationToken cancellationToken)
    {
        // Reload shipments
        var shipments = await dbContext.Shipments
            .Where(s => s.OrderId == order.Id)
            .ToListAsync(cancellationToken);

        if (shipments.Count == 0)
        {
            return;
        }

        var lineItems = order.LineItems ?? await dbContext.LineItems
            .Where(li => li.OrderId == order.Id)
            .ToListAsync(cancellationToken);

        var totalItems = lineItems.Count;
        var shippedItems = shipments
            .Where(s => s.Status == ShipmentStatus.Shipped || s.Status == ShipmentStatus.Delivered)
            .SelectMany(s => s.LineItems)
            .Distinct()
            .Count();

        var oldStatus = order.Status;

        if (shippedItems >= totalItems)
        {
            order.Status = OrderStatus.Shipped;
            order.ShippedDate ??= DateTime.UtcNow;
        }
        else if (shippedItems > 0)
        {
            order.Status = OrderStatus.PartiallyShipped;
        }

        if (oldStatus != order.Status)
        {
            order.DateUpdated = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);

            logger.LogInformation("Order {OrderId} status updated from {OldStatus} to {NewStatus} based on shipments",
                order.Id, oldStatus, order.Status);
        }
    }

    /// <inheritdoc />
    public async Task<bool> IsDuplicateWebhookAsync(Guid providerConfigId, string messageId, CancellationToken cancellationToken = default)
    {
        return await dbContext.FulfilmentWebhookLogs
            .AnyAsync(l => l.ProviderConfigurationId == providerConfigId && l.MessageId == messageId, cancellationToken);
    }

    /// <inheritdoc />
    public async Task LogWebhookAsync(Guid providerConfigId, string? messageId, string? eventType, string? payload, CancellationToken cancellationToken = default)
    {
        var log = new FulfilmentWebhookLog
        {
            ProviderConfigurationId = providerConfigId,
            MessageId = messageId ?? Guid.NewGuid().ToString(),
            EventType = eventType,
            Payload = payload,
            ProcessedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(_settings.WebhookLogRetentionDays)
        };

        dbContext.FulfilmentWebhookLogs.Add(log);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
