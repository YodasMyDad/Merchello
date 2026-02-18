using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers.SupplierDirect;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Models;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Shipping.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Fulfilment.Services;

/// <summary>
/// Service for managing order fulfilment operations.
/// </summary>
public class FulfilmentService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
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

        using var scope = efCoreScopeProvider.CreateScope();
        var order = await scope.ExecuteWithContextAsync(async db =>
            await db.Orders
                .Include(o => o.Invoice)
                .Include(o => o.LineItems)
                .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken));

        if (order == null)
        {
            scope.Complete();
            result.AddErrorMessage($"Order {orderId} not found.");
            return result;
        }

        // Guard: Already submitted
        if (!string.IsNullOrEmpty(order.FulfilmentProviderReference))
        {
            scope.Complete();
            result.AddWarningMessage("Order has already been submitted to fulfilment provider.");
            result.ResultObject = order;
            return result;
        }

        // Guard: Already processing (submission in progress).
        // Allow retries when a previous attempt recorded an error.
        if (order.Status == OrderStatus.Processing &&
            order.FulfilmentProviderConfigurationId.HasValue &&
            string.IsNullOrWhiteSpace(order.FulfilmentErrorMessage) &&
            order.FulfilmentRetryCount == 0)
        {
            scope.Complete();
            result.AddWarningMessage("Order submission is already in progress.");
            result.ResultObject = order;
            return result;
        }

        // Resolve provider configuration
        var providerConfig = await ResolveProviderForWarehouseInternalAsync(scope, order.WarehouseId, cancellationToken);

        // If no provider configured, this is manual fulfilment - not an error
        if (providerConfig == null)
        {
            scope.Complete();
            logger.LogDebug("No fulfilment provider configured for order {OrderId} warehouse {WarehouseId}. Manual fulfilment assumed.",
                orderId, order.WarehouseId);
            result.ResultObject = order;
            return result;
        }

        // Get the provider instance
        var registeredProvider = await providerManager.GetConfiguredProviderAsync(providerConfig.Id, cancellationToken);
        if (registeredProvider == null)
        {
            scope.Complete();
            result.AddErrorMessage($"Fulfilment provider configuration {providerConfig.Id} not found.");
            return result;
        }

        // Check if provider is enabled
        if (!registeredProvider.IsEnabled)
        {
            scope.Complete();
            result.AddErrorMessage($"Fulfilment provider '{registeredProvider.Metadata.Key}' is disabled.");
            return result;
        }

        // Check if provider supports order submission
        if (!registeredProvider.Metadata.SupportsOrderSubmission)
        {
            scope.Complete();
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
        var request = await BuildFulfilmentRequestInternalAsync(scope, order, providerConfig, cancellationToken);

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

                await scope.ExecuteWithContextAsync<bool>(async db =>
                {
                    await db.SaveChangesAsync(cancellationToken);
                    return true;
                });
                scope.Complete();

                logger.LogInformation("Order {OrderId} successfully submitted to {ProviderKey}. Reference: {Reference}",
                    orderId, registeredProvider.Metadata.Key, providerResult.ProviderReference);

                result.ResultObject = order;
                result.AddSuccessMessage($"Order submitted to {registeredProvider.Metadata.DisplayName}.");
            }
            else
            {
                // Submission failed
                order.FulfilmentErrorMessage = providerResult.ErrorMessage;
                if (!string.IsNullOrWhiteSpace(providerResult.ErrorCode))
                {
                    order.ExtendedData["Fulfilment:ErrorCode"] = providerResult.ErrorCode;
                }
                order.FulfilmentRetryCount++;
                order.DateUpdated = DateTime.UtcNow;

                var isRetryableError = IsRetryableFulfilmentError(providerResult.ErrorCode);
                if (!isRetryableError)
                {
                    order.Status = OrderStatus.FulfilmentFailed;
                    // Prevent retry job from re-processing non-retryable failures.
                    order.FulfilmentRetryCount = Math.Max(order.FulfilmentRetryCount, _settings.MaxRetryAttempts);
                    logger.LogError(
                        "Order {OrderId} fulfilment failed with non-retryable error code {ErrorCode}. Error: {Error}",
                        orderId,
                        providerResult.ErrorCode,
                        providerResult.ErrorMessage);
                }
                else if (order.FulfilmentRetryCount >= _settings.MaxRetryAttempts)
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

                await scope.ExecuteWithContextAsync<bool>(async db =>
                {
                    await db.SaveChangesAsync(cancellationToken);
                    return true;
                });
                scope.Complete();

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

            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                await db.SaveChangesAsync(cancellationToken);
                return true;
            });
            scope.Complete();

            result.AddErrorMessage($"Exception during fulfilment submission: {ex.Message}");
            result.ResultObject = order;
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Order>> RetrySubmissionAsync(Guid orderId, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Order>();

        using var scope = efCoreScopeProvider.CreateScope();
        var order = await scope.ExecuteWithContextAsync(async db =>
            await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken));

        if (order == null)
        {
            scope.Complete();
            result.AddErrorMessage($"Order {orderId} not found.");
            return result;
        }

        // Can only retry failed orders or orders with errors
        if (order.Status != OrderStatus.FulfilmentFailed &&
            string.IsNullOrEmpty(order.FulfilmentErrorMessage))
        {
            scope.Complete();
            result.AddErrorMessage("Order is not in a retryable state.");
            result.ResultObject = order;
            return result;
        }

        // Already has a provider reference - can't retry
        if (!string.IsNullOrEmpty(order.FulfilmentProviderReference))
        {
            scope.Complete();
            result.AddWarningMessage("Order has already been submitted successfully.");
            result.ResultObject = order;
            return result;
        }

        // Reset status for retry
        order.Status = OrderStatus.Processing;
        order.FulfilmentErrorMessage = null;
        order.DateUpdated = DateTime.UtcNow;
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();

        return await SubmitOrderAsync(orderId, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<CrudResult<Order>> CancelOrderAsync(Guid orderId, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Order>();

        using var scope = efCoreScopeProvider.CreateScope();
        var order = await scope.ExecuteWithContextAsync(async db =>
            await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken));
        scope.Complete();

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

        using var scope = efCoreScopeProvider.CreateScope();
        var order = await scope.ExecuteWithContextAsync(async db =>
            await db.Orders.FirstOrDefaultAsync(o => o.FulfilmentProviderReference == update.ProviderReference, cancellationToken));

        if (order == null)
        {
            scope.Complete();
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

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();

        logger.LogInformation("Order {OrderId} status updated from {OldStatus} to {NewStatus} via provider update",
            order.Id, oldStatus, update.MappedStatus);

        result.ResultObject = order;
        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Shipment>> ProcessShipmentUpdateAsync(FulfilmentShipmentUpdate update, CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Shipment>();

        using var scope = efCoreScopeProvider.CreateScope();

        // Find the order
        var order = await scope.ExecuteWithContextAsync(async db =>
            await db.Orders
                .Include(o => o.Shipments)
                .Include(o => o.LineItems)
                .FirstOrDefaultAsync(o => o.FulfilmentProviderReference == update.ProviderReference, cancellationToken));

        if (order == null)
        {
            scope.Complete();
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
                foreach (var item in update.Items
                             .Where(i => !string.IsNullOrWhiteSpace(i.Sku) && i.QuantityShipped > 0)
                             .GroupBy(i => i.Sku, StringComparer.OrdinalIgnoreCase)
                             .Select(g => new { Sku = g.Key, Quantity = g.Sum(i => i.QuantityShipped) }))
                {
                    var lineItem = order.LineItems?.FirstOrDefault(li =>
                        string.Equals(li.Sku, item.Sku, StringComparison.OrdinalIgnoreCase));

                    if (lineItem != null && IsShippableLineItem(lineItem))
                    {
                        shipment.LineItems.Add(LineItemFactory.CreateShipmentTrackingLineItem(lineItem, item.Quantity));
                    }
                }
            }
            else if (order.LineItems != null)
            {
                // Full shipment - assign all items
                shipment.LineItems.AddRange(order.LineItems
                    .Where(IsShippableLineItem)
                    .Select(li => LineItemFactory.CreateShipmentTrackingLineItem(li, li.Quantity)));
            }

            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                db.Shipments.Add(shipment);
                return true;
            });
        }

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });

        // Update order status based on shipments
        await UpdateOrderShipmentStatusInternalAsync(scope, order, cancellationToken);

        scope.Complete();

        logger.LogInformation("Processed shipment update for order {OrderId}. Shipment: {ShipmentId}, Tracking: {TrackingNumber}",
            order.Id, shipment.Id, shipment.TrackingNumber);

        result.ResultObject = shipment;
        return result;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<Order>> GetOrdersForPollingAsync(Guid providerConfigId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var orders = await scope.ExecuteWithContextAsync(async db =>
            await db.Orders
                .Where(o => o.FulfilmentProviderConfigurationId == providerConfigId)
                .Where(o => o.Status == OrderStatus.Processing ||
                            o.Status == OrderStatus.PartiallyShipped ||
                            o.Status == OrderStatus.Shipped)
                .Where(o => !string.IsNullOrEmpty(o.FulfilmentProviderReference))
                .AsNoTracking()
                .ToListAsync(cancellationToken));
        scope.Complete();
        return orders;
    }

    /// <inheritdoc />
    public async Task<FulfilmentProviderConfiguration?> ResolveProviderForWarehouseAsync(Guid warehouseId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await ResolveProviderForWarehouseInternalAsync(scope, warehouseId, cancellationToken);
        scope.Complete();
        return result;
    }

    private async Task<FulfilmentProviderConfiguration?> ResolveProviderForWarehouseInternalAsync(
        IEfCoreScope<MerchelloDbContext> scope,
        Guid warehouseId,
        CancellationToken cancellationToken)
    {
        var warehouse = await scope.ExecuteWithContextAsync(async db =>
            await db.Warehouses
                .Include(w => w.FulfilmentProviderConfiguration)
                .Include(w => w.Supplier)
                .ThenInclude(s => s!.DefaultFulfilmentProviderConfiguration)
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.Id == warehouseId, cancellationToken));

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

        using var scope = efCoreScopeProvider.CreateScope();
        var orders = await scope.ExecuteWithContextAsync(async db =>
            await db.Orders
                .Where(o => o.Status == OrderStatus.Processing || o.Status == OrderStatus.FulfilmentFailed)
                .Where(o => !string.IsNullOrEmpty(o.FulfilmentErrorMessage))
                .Where(o => string.IsNullOrEmpty(o.FulfilmentProviderReference))
                .Where(o => o.FulfilmentRetryCount < _settings.MaxRetryAttempts)
                .Where(o => o.FulfilmentProviderConfigurationId != null)
                .AsNoTracking()
                .ToListAsync(cancellationToken));
        scope.Complete();

        // Filter by delay (done in memory as delay calculation depends on retry count)
        return orders.Where(o =>
        {
            var lastAttempt = o.DateUpdated;
            var delay = _settings.GetNextRetryDelay(o.FulfilmentRetryCount - 1);
            return now >= lastAttempt.Add(delay);
        }).ToList();
    }

    private async Task<FulfilmentOrderRequest> BuildFulfilmentRequestInternalAsync(
        IEfCoreScope<MerchelloDbContext> scope,
        Order order,
        FulfilmentProviderConfiguration providerConfig,
        CancellationToken cancellationToken)
    {
        // Get invoice for customer details
        var invoice = order.Invoice;
        if (invoice == null)
        {
            invoice = await scope.ExecuteWithContextAsync(async db =>
                await db.Invoices
                    .Include(i => i.BillingAddress)
                    .Include(i => i.ShippingAddress)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(i => i.Id == order.InvoiceId, cancellationToken));
        }

        var lineItems = order.LineItems;
        if (lineItems == null)
        {
            lineItems = await scope.ExecuteWithContextAsync(async db =>
                await db.LineItems
                    .Where(li => li.OrderId == order.Id)
                    .AsNoTracking()
                    .ToListAsync(cancellationToken));
        }

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

        // Build extended data with supplier context for providers that need it
        var extendedData = new Dictionary<string, object>(order.ExtendedData);

        // Load warehouse and supplier context
        if (order.WarehouseId != Guid.Empty)
        {
            var warehouse = await scope.ExecuteWithContextAsync(async db =>
                await db.Warehouses
                    .Include(w => w.Supplier)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(w => w.Id == order.WarehouseId, cancellationToken));

            if (warehouse != null)
            {
                extendedData["WarehouseId"] = warehouse.Id;
                extendedData["WarehouseName"] = warehouse.Name ?? "";

                if (warehouse.Supplier != null)
                {
                    extendedData["SupplierId"] = warehouse.Supplier.Id;
                    extendedData["SupplierName"] = warehouse.Supplier.Name;
                    extendedData["SupplierCode"] = warehouse.Supplier.Code ?? "";
                    extendedData["SupplierContactEmail"] = warehouse.Supplier.ContactEmail ?? "";

                    // Include supplier extended data for profile settings
                    if (warehouse.Supplier.ExtendedData.Count > 0)
                    {
                        if (warehouse.Supplier.ExtendedData.TryGetValue(SupplierDirectExtendedDataKeys.Profile, out var profileObj))
                        {
                            var profileJson = profileObj?.UnwrapJsonElement()?.ToString();
                            if (!string.IsNullOrWhiteSpace(profileJson))
                            {
                                extendedData[SupplierDirectExtendedDataKeys.Profile] = profileJson;

                                var profile = SupplierDirectProfile.FromJson(profileJson);
                                if (profile != null)
                                {
                                    extendedData[SupplierDirectExtendedDataKeys.DeliveryMethod] = profile.DeliveryMethod.ToString();

                                    var emailRecipient = profile.EmailSettings?.RecipientEmail;
                                    if (!string.IsNullOrWhiteSpace(emailRecipient))
                                    {
                                        extendedData[SupplierDirectExtendedDataKeys.OrderEmail] = emailRecipient;
                                    }

                                    var ftpSettings = profile.FtpSettings;
                                    if (ftpSettings != null)
                                    {
                                        if (!string.IsNullOrWhiteSpace(ftpSettings.Host))
                                        {
                                            extendedData[SupplierDirectExtendedDataKeys.FtpHost] = ftpSettings.Host;
                                        }

                                        if (!string.IsNullOrWhiteSpace(ftpSettings.Username))
                                        {
                                            extendedData[SupplierDirectExtendedDataKeys.FtpUsername] = ftpSettings.Username;
                                        }

                                        if (!string.IsNullOrWhiteSpace(ftpSettings.Password))
                                        {
                                            extendedData[SupplierDirectExtendedDataKeys.FtpPassword] = ftpSettings.Password;
                                        }

                                        if (ftpSettings.Port.HasValue)
                                        {
                                            extendedData[SupplierDirectExtendedDataKeys.FtpPort] = ftpSettings.Port.Value.ToString();
                                        }

                                        if (!string.IsNullOrWhiteSpace(ftpSettings.RemotePath))
                                        {
                                            extendedData[SupplierDirectExtendedDataKeys.FtpRemotePath] = ftpSettings.RemotePath;
                                        }

                                        if (!string.IsNullOrWhiteSpace(ftpSettings.HostFingerprint))
                                        {
                                            extendedData[SupplierDirectExtendedDataKeys.SftpHostFingerprint] = ftpSettings.HostFingerprint;
                                        }
                                    }
                                }
                            }
                        }

                        foreach (var kvp in warehouse.Supplier.ExtendedData)
                        {
                            // Prefix supplier data to avoid conflicts
                            if (kvp.Key.StartsWith("SupplierDirect:"))
                            {
                                extendedData[kvp.Key] = kvp.Value;
                            }
                        }
                    }
                }
            }
        }

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
            ExtendedData = extendedData
        };
    }

    internal static string? ResolveShippingServiceCode(Order order, string? settingsJson)
    {
        if (string.IsNullOrEmpty(settingsJson)) return order.ShippingServiceCode;

        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(settingsJson);
            var root = doc.RootElement;

            // 1. Category inference (works for both flat-rate and dynamic)
            if (order.ShippingServiceCategory.HasValue)
            {
                var categoryKey = $"ServiceCategoryMapping_{order.ShippingServiceCategory.Value}";
                if (root.TryGetProperty(categoryKey, out var categoryMapping))
                {
                    var code = categoryMapping.GetString();
                    if (!string.IsNullOrEmpty(code)) return code;
                }
            }

            // 2. DefaultShippingMethod
            if (root.TryGetProperty("DefaultShippingMethod", out var defaultVal))
            {
                var code = defaultVal.GetString();
                if (!string.IsNullOrEmpty(code)) return code;
            }
        }
        catch (System.Text.Json.JsonException) { /* fall through */ }

        // 3. Raw carrier code (last resort)
        return order.ShippingServiceCode;
    }

    private static FulfilmentAddress MapToFulfilmentAddress(Locality.Models.Address? address)
    {
        if (address == null)
        {
            return new FulfilmentAddress
            {
                AddressOne = "",
                TownCity = "",
                PostalCode = "",
                CountryCode = ""
            };
        }

        return new FulfilmentAddress
        {
            Name = address.Name,
            Company = address.Company,
            AddressOne = address.AddressOne ?? "",
            AddressTwo = address.AddressTwo,
            TownCity = address.TownCity ?? "",
            CountyState = address.CountyState?.RegionCode,
            PostalCode = address.PostalCode ?? "",
            CountryCode = address.CountryCode ?? "",
            Phone = address.Phone
        };
    }

    private async Task UpdateOrderShipmentStatusInternalAsync(
        IEfCoreScope<MerchelloDbContext> scope,
        Order order,
        CancellationToken cancellationToken)
    {
        // Reload shipments
        var shipments = await scope.ExecuteWithContextAsync(async db =>
            await db.Shipments
                .Where(s => s.OrderId == order.Id)
                .ToListAsync(cancellationToken));

        if (shipments.Count == 0)
        {
            return;
        }

        var lineItems = order.LineItems;
        if (lineItems == null)
        {
            lineItems = await scope.ExecuteWithContextAsync(async db =>
                await db.LineItems
                    .Where(li => li.OrderId == order.Id)
                    .ToListAsync(cancellationToken));
        }

        var totalOrdered = lineItems
            .Where(IsShippableLineItem)
            .Sum(li => li.Quantity);

        var totalShipped = shipments
            .Where(s => s.Status == ShipmentStatus.Shipped || s.Status == ShipmentStatus.Delivered)
            .SelectMany(s => s.LineItems ?? [])
            .Where(IsShippableLineItem)
            .Sum(li => li.Quantity);

        if (totalOrdered <= 0)
        {
            return;
        }

        var oldStatus = order.Status;

        if (totalShipped >= totalOrdered)
        {
            order.Status = OrderStatus.Shipped;
            order.ShippedDate ??= DateTime.UtcNow;
        }
        else if (totalShipped > 0)
        {
            order.Status = OrderStatus.PartiallyShipped;
        }

        if (oldStatus != order.Status)
        {
            order.DateUpdated = DateTime.UtcNow;
            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                await db.SaveChangesAsync(cancellationToken);
                return true;
            });

            logger.LogInformation("Order {OrderId} status updated from {OldStatus} to {NewStatus} based on shipments",
                order.Id, oldStatus, order.Status);
        }
    }

    /// <inheritdoc />
    public async Task<bool> IsDuplicateWebhookAsync(Guid providerConfigId, string messageId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(messageId))
        {
            return false;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var isDuplicate = await scope.ExecuteWithContextAsync(async db =>
            await db.FulfilmentWebhookLogs
                .AnyAsync(l => l.ProviderConfigurationId == providerConfigId && l.MessageId == messageId, cancellationToken));
        scope.Complete();
        return isDuplicate;
    }

    /// <inheritdoc />
    public async Task<bool> TryLogWebhookAsync(Guid providerConfigId, string messageId, string? eventType, string? payload, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(messageId))
        {
            throw new ArgumentException("Webhook message ID cannot be empty.", nameof(messageId));
        }

        var log = new FulfilmentWebhookLog
        {
            ProviderConfigurationId = providerConfigId,
            MessageId = messageId.Trim(),
            EventType = eventType,
            Payload = payload,
            ProcessedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(_settings.WebhookLogRetentionDays)
        };

        using var scope = efCoreScopeProvider.CreateScope();
        try
        {
            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                db.FulfilmentWebhookLogs.Add(log);
                await db.SaveChangesAsync(cancellationToken);
                return true;
            });
            scope.Complete();
            return true;
        }
        catch (DbUpdateException ex) when (IsDuplicateWebhookInsertException(ex))
        {
            logger.LogDebug("Duplicate fulfilment webhook ignored. ProviderConfig: {ProviderConfigId}, MessageId: {MessageId}",
                providerConfigId, messageId);
            return false;
        }
    }

    /// <inheritdoc />
    public async Task CompleteWebhookLogAsync(Guid providerConfigId, string messageId, string? eventType, string? payload, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(messageId))
        {
            throw new ArgumentException("Webhook message ID cannot be empty.", nameof(messageId));
        }

        var resolvedMessageId = messageId.Trim();
        var completedAt = DateTime.UtcNow;

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var existing = await db.FulfilmentWebhookLogs
                .FirstOrDefaultAsync(x => x.ProviderConfigurationId == providerConfigId && x.MessageId == resolvedMessageId, cancellationToken);

            if (existing == null)
            {
                return false;
            }

            existing.EventType = string.IsNullOrWhiteSpace(eventType) ? existing.EventType : eventType.Trim();
            if (payload != null)
            {
                existing.Payload = payload;
            }

            existing.ProcessedAt = completedAt;
            existing.ExpiresAt = completedAt.AddDays(_settings.WebhookLogRetentionDays);
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();
    }

    /// <inheritdoc />
    public async Task RemoveWebhookLogAsync(Guid providerConfigId, string messageId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(messageId))
        {
            return;
        }

        var resolvedMessageId = messageId.Trim();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var existing = await db.FulfilmentWebhookLogs
                .FirstOrDefaultAsync(x => x.ProviderConfigurationId == providerConfigId && x.MessageId == resolvedMessageId, cancellationToken);

            if (existing == null)
            {
                return false;
            }

            db.FulfilmentWebhookLogs.Remove(existing);
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();
    }

    /// <inheritdoc />
    public async Task LogWebhookAsync(Guid providerConfigId, string? messageId, string? eventType, string? payload, CancellationToken cancellationToken = default)
    {
        var resolvedMessageId = string.IsNullOrWhiteSpace(messageId)
            ? throw new ArgumentException("Webhook message ID cannot be empty.", nameof(messageId))
            : messageId.Trim();

        var inserted = await TryLogWebhookAsync(providerConfigId, resolvedMessageId, eventType, payload, cancellationToken);
        if (!inserted)
        {
            throw new InvalidOperationException($"Webhook '{resolvedMessageId}' has already been logged.");
        }
    }

    private static bool IsDuplicateWebhookInsertException(DbUpdateException ex)
    {
        var message = ex.InnerException?.Message ?? ex.Message;
        return message.Contains("UNIQUE constraint failed", StringComparison.OrdinalIgnoreCase) ||
               message.Contains("duplicate key", StringComparison.OrdinalIgnoreCase) ||
               message.Contains("Cannot insert duplicate key", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsRetryableFulfilmentError(string? errorCode)
    {
        if (string.IsNullOrWhiteSpace(errorCode))
        {
            return true;
        }

        if (!Enum.TryParse<ErrorClassification>(errorCode, true, out var classification))
        {
            return true;
        }

        return SupplierDirectErrorClassifier.IsRetryable(classification);
    }

    private static bool IsShippableLineItem(LineItem lineItem) =>
        lineItem.LineItemType is LineItemType.Product or LineItemType.Custom;
}
