using System.Text.Json;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers.ShipBob.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shared.Providers;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Fulfilment.Providers.ShipBob;

/// <summary>
/// ShipBob fulfilment provider implementation.
/// Supports all fulfilment operations: orders, webhooks, polling, products, inventory.
/// </summary>
public sealed class ShipBobFulfilmentProvider : FulfilmentProviderBase, IDisposable
{
    private readonly ILogger<ShipBobFulfilmentProvider> _logger;
    private ShipBobSettings? _settings;
    private ShipBobApiClient? _apiClient;
    private bool _disposed;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    public ShipBobFulfilmentProvider(ILogger<ShipBobFulfilmentProvider> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public override FulfilmentProviderMetadata Metadata => new()
    {
        Key = "shipbob",
        DisplayName = "ShipBob",
        Description = "Enterprise 3PL fulfilment with global distribution network. Supports order submission, real-time tracking via webhooks, inventory sync, and product catalog management.",
        Icon = "icon-truck",
        IconSvg = ShipBobIcon.Svg,
        SetupInstructions = """
            ## ShipBob Setup

            1. Log into your [ShipBob Dashboard](https://app.shipbob.com)
            2. Navigate to **Settings** → **Integrations** → **Developer API**
            3. Create a new **Personal Access Token** (PAT)
            4. Copy the **Channel ID** from your account settings
            5. For webhooks, copy the **Webhook Secret** from your webhook configuration

            ### Required Permissions

            Your PAT needs these scopes:
            - `orders_read`, `orders_write` - Create and manage orders
            - `products_read`, `products_write` - Sync product catalog
            - `inventory_read` - Retrieve inventory levels
            - `webhooks_read`, `webhooks_write` - Configure webhooks

            [ShipBob API Documentation](https://developer.shipbob.com)
            """,
        SupportsOrderSubmission = true,
        SupportsOrderCancellation = true,
        SupportsWebhooks = true,
        SupportsPolling = true,
        SupportsProductSync = true,
        SupportsInventorySync = true,
        ApiStyle = FulfilmentApiStyle.Rest
    };

    #region Configuration

    /// <inheritdoc />
    public override ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
        [
            new ProviderConfigurationField
            {
                Key = "PersonalAccessToken",
                Label = "Personal Access Token",
                FieldType = ConfigurationFieldType.Password,
                IsRequired = true,
                IsSensitive = true,
                Description = "API token from ShipBob Developer Settings",
                Placeholder = "pat_..."
            },
            new ProviderConfigurationField
            {
                Key = "ChannelId",
                Label = "Channel ID",
                FieldType = ConfigurationFieldType.Number,
                IsRequired = true,
                Description = "Your ShipBob channel identifier (found in Settings → Channels)"
            },
            new ProviderConfigurationField
            {
                Key = "WebhookSecret",
                Label = "Webhook Secret",
                FieldType = ConfigurationFieldType.Password,
                IsRequired = false,
                IsSensitive = true,
                Description = "Secret for validating webhook signatures (optional but recommended)"
            },
            new ProviderConfigurationField
            {
                Key = "ApiVersion",
                Label = "API Version",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                DefaultValue = "2025-07",
                Description = "ShipBob API version (default: 2025-07)"
            },
            new ProviderConfigurationField
            {
                Key = "DefaultFulfillmentCenterId",
                Label = "Default Fulfillment Center",
                FieldType = ConfigurationFieldType.Number,
                IsRequired = false,
                Description = "Optional: Force all orders to a specific fulfillment center"
            },
            new ProviderConfigurationField
            {
                Key = "EnableDebugLogging",
                Label = "Debug Logging",
                FieldType = ConfigurationFieldType.Checkbox,
                IsRequired = false,
                DefaultValue = "false",
                Description = "Log API requests and responses for troubleshooting"
            },
            new ProviderConfigurationField
            {
                Key = "DefaultShippingMethod",
                Label = "Default Shipping Method",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                DefaultValue = "Standard",
                Description = "Fallback ShipBob shipping method when no category mapping matches"
            },
            new ProviderConfigurationField
            {
                Key = "ServiceCategoryMapping_Standard",
                Label = "Standard (4-7 days)",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                DefaultValue = "Ground",
                Description = "ShipBob shipping method for Standard speed tier"
            },
            new ProviderConfigurationField
            {
                Key = "ServiceCategoryMapping_Express",
                Label = "Express (2-3 days)",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                DefaultValue = "2-Day",
                Description = "ShipBob shipping method for Express speed tier"
            },
            new ProviderConfigurationField
            {
                Key = "ServiceCategoryMapping_Overnight",
                Label = "Overnight (next day)",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                DefaultValue = "Overnight",
                Description = "ShipBob shipping method for Overnight speed tier"
            },
            new ProviderConfigurationField
            {
                Key = "ServiceCategoryMapping_Economy",
                Label = "Economy (8+ days)",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                DefaultValue = "Standard",
                Description = "ShipBob shipping method for Economy speed tier"
            }
        ]);
    }

    /// <inheritdoc />
    public override ValueTask ConfigureAsync(
        FulfilmentProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        // Clean up existing client
        _apiClient?.Dispose();
        _apiClient = null;
        _settings = null;

        if (configuration?.SettingsJson == null)
        {
            _logger.LogDebug("ShipBob provider configured without settings");
            return base.ConfigureAsync(configuration, cancellationToken);
        }

        _settings = ShipBobSettings.FromJson(configuration.SettingsJson);

        if (_settings?.IsValid == true)
        {
            _apiClient = new ShipBobApiClient(_settings, _logger);
            _logger.LogDebug("ShipBob provider configured successfully for channel {ChannelId}", _settings.ChannelId);
        }
        else
        {
            _logger.LogWarning("ShipBob settings are invalid or incomplete");
        }

        return base.ConfigureAsync(configuration, cancellationToken);
    }

    /// <inheritdoc />
    public override async Task<FulfilmentConnectionTestResult> TestConnectionAsync(
        CancellationToken cancellationToken = default)
    {
        if (_apiClient == null || _settings == null || !_settings.IsValid)
        {
            return FulfilmentConnectionTestResult.Failed("ShipBob provider not configured");
        }

        try
        {
            var result = await _apiClient.GetFulfillmentCentersAsync(cancellationToken);

            if (!result.Success || result.Data == null)
            {
                return FulfilmentConnectionTestResult.Failed(
                    result.Error?.GetDisplayMessage() ?? "Failed to connect to ShipBob",
                    result.Error?.Type);
            }

            var centers = result.Data;
            var activeCenters = centers.Count(c => c.IsActive);

            return new FulfilmentConnectionTestResult
            {
                Success = true,
                ProviderVersion = _settings.ApiVersion,
                AccountName = $"Channel {_settings.ChannelId}",
                WarehouseCount = activeCenters
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing ShipBob connection");
            return FulfilmentConnectionTestResult.Failed($"Connection error: {ex.Message}");
        }
    }

    #endregion

    #region Orders

    /// <inheritdoc />
    public override async Task<FulfilmentOrderResult> SubmitOrderAsync(
        FulfilmentOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_apiClient == null || _settings == null || !_settings.IsValid)
        {
            return FulfilmentOrderResult.Failed("ShipBob provider not configured");
        }

        try
        {
            var shipBobRequest = MapToShipBobOrder(request);

            _logger.LogDebug("Submitting order {OrderNumber} to ShipBob", request.OrderNumber);

            var result = await _apiClient.CreateOrderAsync(shipBobRequest, cancellationToken);

            if (!result.Success || result.Data == null)
            {
                _logger.LogWarning("Failed to submit order {OrderNumber} to ShipBob: {Error}",
                    request.OrderNumber, result.ErrorMessage);

                return FulfilmentOrderResult.Failed(
                    result.Error?.GetDisplayMessage() ?? "Failed to create order",
                    result.Error?.Type);
            }

            var response = result.Data;

            _logger.LogInformation("Order {OrderNumber} submitted to ShipBob as {ShipBobOrderId}",
                request.OrderNumber, response.Id);

            return new FulfilmentOrderResult
            {
                Success = true,
                ProviderReference = response.Id.ToString(),
                ExtendedData = new Dictionary<string, object>
                {
                    ["ShipBobOrderNumber"] = response.OrderNumber ?? "",
                    ["ShipBobReferenceId"] = response.ReferenceId ?? "",
                    ["ShipBobStatus"] = response.Status ?? "",
                    ["ShipBobCreatedAt"] = response.CreatedDate?.ToString("O") ?? ""
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting order {OrderNumber} to ShipBob", request.OrderNumber);
            return FulfilmentOrderResult.Failed($"Error: {ex.Message}", "EXCEPTION");
        }
    }

    /// <inheritdoc />
    public override async Task<FulfilmentCancelResult> CancelOrderAsync(
        string providerReference,
        CancellationToken cancellationToken = default)
    {
        if (_apiClient == null || _settings == null || !_settings.IsValid)
        {
            return FulfilmentCancelResult.Failed("ShipBob provider not configured");
        }

        if (!int.TryParse(providerReference, out var orderId))
        {
            return FulfilmentCancelResult.Failed($"Invalid provider reference: {providerReference}");
        }

        try
        {
            // First get the order to find shipment IDs
            var orderResult = await _apiClient.GetOrderAsync(orderId, cancellationToken);

            if (!orderResult.Success || orderResult.Data == null)
            {
                return FulfilmentCancelResult.Failed(
                    orderResult.Error?.GetDisplayMessage() ?? "Failed to get order");
            }

            var order = orderResult.Data;

            // Check if order can be cancelled
            if (order.Status?.ToLowerInvariant() is "fulfilled" or "completed" or "delivered")
            {
                return FulfilmentCancelResult.Failed($"Cannot cancel order in {order.Status} status");
            }

            // Cancel each shipment
            var shipments = order.Shipments ?? [];
            var errors = new List<string>();

            foreach (var shipment in shipments)
            {
                var cancelResult = await _apiClient.CancelShipmentAsync(shipment.Id, cancellationToken);

                if (!cancelResult.Success)
                {
                    errors.Add($"Shipment {shipment.Id}: {cancelResult.ErrorMessage}");
                }
            }

            if (errors.Count > 0)
            {
                return FulfilmentCancelResult.Failed(string.Join("; ", errors));
            }

            _logger.LogInformation("Cancelled ShipBob order {OrderId} ({ShipmentCount} shipments)",
                orderId, shipments.Count);

            return FulfilmentCancelResult.Succeeded();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling ShipBob order {OrderId}", orderId);
            return FulfilmentCancelResult.Failed($"Error: {ex.Message}");
        }
    }

    private ShipBobOrderRequest MapToShipBobOrder(FulfilmentOrderRequest request)
    {
        return new ShipBobOrderRequest
        {
            ReferenceId = request.OrderId.ToString(),
            OrderNumber = request.OrderNumber,
            ShippingMethod = request.ShippingServiceCode,
            PurchaseDate = DateTime.UtcNow,
            FulfillmentCenterId = _settings?.DefaultFulfillmentCenterId,
            Recipient = new ShipBobRecipient
            {
                Name = request.ShippingAddress.Name ?? "Customer",
                Email = request.CustomerEmail,
                PhoneNumber = request.CustomerPhone ?? request.ShippingAddress.Phone,
                Address = new Models.ShipBobAddress
                {
                    Address1 = request.ShippingAddress.Address1,
                    Address2 = request.ShippingAddress.Address2,
                    City = request.ShippingAddress.City,
                    State = request.ShippingAddress.StateOrProvince,
                    ZipCode = request.ShippingAddress.PostalCode,
                    Country = request.ShippingAddress.CountryCode,
                    CompanyName = request.ShippingAddress.Company
                }
            },
            Products = request.LineItems.Select(li => new ShipBobOrderProduct
            {
                ReferenceId = li.LineItemId.ToString(),
                Sku = li.Sku,
                Name = li.Name,
                Quantity = li.Quantity,
                UnitPrice = li.UnitPrice,
                Gtin = li.Barcode
            }).ToList(),
            Tags = BuildOrderTags(request)
        };
    }

    private static IReadOnlyList<ShipBobTag>? BuildOrderTags(FulfilmentOrderRequest request)
    {
        var tags = new List<ShipBobTag>();

        if (!string.IsNullOrWhiteSpace(request.InternalNotes))
        {
            tags.Add(new ShipBobTag { Name = "internal_notes", Value = request.InternalNotes });
        }

        if (request.RequestedDeliveryDate.HasValue)
        {
            tags.Add(new ShipBobTag
            {
                Name = "requested_delivery",
                Value = request.RequestedDeliveryDate.Value.ToString("yyyy-MM-dd")
            });
        }

        // Add any extended data as tags
        foreach (var (key, value) in request.ExtendedData)
        {
            if (value != null)
            {
                tags.Add(new ShipBobTag { Name = key, Value = value.ToString() });
            }
        }

        return tags.Count > 0 ? tags : null;
    }

    #endregion

    #region Webhooks

    /// <inheritdoc />
    public override async Task<bool> ValidateWebhookAsync(
        HttpRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_settings == null)
        {
            _logger.LogWarning("ShipBob webhook validation failed: provider not configured");
            return false;
        }

        // If no webhook secret configured, allow all webhooks (not recommended)
        if (string.IsNullOrWhiteSpace(_settings.WebhookSecret))
        {
            _logger.LogWarning("ShipBob webhook secret not configured - skipping signature validation");
            return true;
        }

        try
        {
            // Read body for validation
            request.EnableBuffering();
            request.Body.Position = 0;

            using var reader = new StreamReader(request.Body, leaveOpen: true);
            var body = await reader.ReadToEndAsync(cancellationToken);
            request.Body.Position = 0;

            var validator = new ShipBobWebhookValidator();
            var result = validator.Validate(request, body, _settings.WebhookSecret);

            if (!result.IsValid)
            {
                _logger.LogWarning("ShipBob webhook signature validation failed: {Error}", result.ErrorMessage);
            }

            return result.IsValid;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating ShipBob webhook");
            return false;
        }
    }

    /// <inheritdoc />
    public override async Task<FulfilmentWebhookResult> ProcessWebhookAsync(
        HttpRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Read body
            request.EnableBuffering();
            request.Body.Position = 0;

            using var reader = new StreamReader(request.Body, leaveOpen: true);
            var body = await reader.ReadToEndAsync(cancellationToken);
            request.Body.Position = 0;

            var payload = JsonSerializer.Deserialize<ShipBobWebhookPayload>(body, JsonOptions);

            if (payload?.Data == null)
            {
                return new FulfilmentWebhookResult
                {
                    Success = false,
                    ErrorMessage = "Invalid webhook payload"
                };
            }

            var topic = request.Headers["x-webhook-topic"].FirstOrDefault() ?? payload.Topic;
            var eventType = ShipBobStatusMapper.MapWebhookTopic(topic);

            _logger.LogDebug("Processing ShipBob webhook: {Topic} ({EventType})", topic, eventType);

            var statusUpdates = new List<FulfilmentStatusUpdate>();
            var shipmentUpdates = new List<FulfilmentShipmentUpdate>();

            // Get the reference ID (our order ID)
            var referenceId = payload.Data.ReferenceId;
            if (string.IsNullOrWhiteSpace(referenceId))
            {
                // Fall back to ShipBob order ID
                referenceId = payload.Data.OrderId?.ToString() ?? payload.Data.Id?.ToString();
            }

            if (string.IsNullOrWhiteSpace(referenceId))
            {
                return new FulfilmentWebhookResult
                {
                    Success = false,
                    ErrorMessage = "Missing order reference in webhook"
                };
            }

            // Create status update
            var mappedStatus = ShipBobStatusMapper.MapWebhookTopicToStatus(topic);
            var providerStatus = payload.Data.Status ?? eventType;

            statusUpdates.Add(new FulfilmentStatusUpdate
            {
                ProviderReference = referenceId,
                ProviderStatus = providerStatus,
                MappedStatus = mappedStatus,
                StatusDate = payload.Data.UpdatedDate ?? DateTime.UtcNow,
                ErrorMessage = payload.Data.Exception?.Message
            });

            // Process shipment data if present
            var shipments = GetShipmentsFromPayload(payload.Data);
            foreach (var shipment in shipments)
            {
                if (shipment.Tracking != null)
                {
                    var items = shipment.Products?.Select(p => new FulfilmentShippedItem
                    {
                        Sku = p.Sku ?? "",
                        QuantityShipped = p.Quantity
                    }).ToList();

                    shipmentUpdates.Add(new FulfilmentShipmentUpdate
                    {
                        ProviderReference = referenceId,
                        ProviderShipmentId = shipment.Id.ToString(),
                        TrackingNumber = shipment.Tracking.TrackingNumber,
                        TrackingUrl = shipment.Tracking.TrackingUrl,
                        Carrier = shipment.Tracking.Carrier,
                        ShippedDate = shipment.Tracking.ShippingDate ?? shipment.ActualFulfillmentDate,
                        Items = items
                    });
                }
            }

            _logger.LogInformation("Processed ShipBob webhook {Topic} for order {ReferenceId}: {StatusUpdates} status, {ShipmentUpdates} shipments",
                topic, referenceId, statusUpdates.Count, shipmentUpdates.Count);

            return new FulfilmentWebhookResult
            {
                Success = true,
                EventType = eventType,
                StatusUpdates = statusUpdates,
                ShipmentUpdates = shipmentUpdates
            };
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Error parsing ShipBob webhook JSON");
            return new FulfilmentWebhookResult
            {
                Success = false,
                ErrorMessage = $"Invalid JSON: {ex.Message}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing ShipBob webhook");
            return new FulfilmentWebhookResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    private static IReadOnlyList<ShipBobWebhookShipment> GetShipmentsFromPayload(ShipBobWebhookData data)
    {
        var result = new List<ShipBobWebhookShipment>();

        if (data.Shipment != null)
        {
            result.Add(data.Shipment);
        }

        if (data.Shipments != null)
        {
            result.AddRange(data.Shipments);
        }

        return result;
    }

    #endregion

    #region Polling

    /// <inheritdoc />
    public override async Task<IReadOnlyList<FulfilmentStatusUpdate>> PollOrderStatusAsync(
        IEnumerable<string> providerReferences,
        CancellationToken cancellationToken = default)
    {
        if (_apiClient == null || _settings == null || !_settings.IsValid)
        {
            _logger.LogWarning("Cannot poll ShipBob: provider not configured");
            return [];
        }

        var updates = new List<FulfilmentStatusUpdate>();
        var references = providerReferences.ToList();

        if (references.Count == 0)
        {
            return updates;
        }

        try
        {
            // Batch by reference IDs if possible
            var result = await _apiClient.GetOrdersByReferenceIdsAsync(references, cancellationToken);

            if (!result.Success || result.Data == null)
            {
                _logger.LogWarning("Failed to poll ShipBob orders: {Error}", result.ErrorMessage);
                return updates;
            }

            foreach (var order in result.Data)
            {
                var referenceId = order.ReferenceId ?? order.Id.ToString();
                var status = order.Status ?? "Processing";
                var mappedStatus = ShipBobStatusMapper.MapOrderStatus(status);

                // Get most specific status from shipments if available
                var shipments = order.Shipments ?? [];
                if (shipments.Count > 0)
                {
                    var latestShipment = shipments
                        .OrderByDescending(s => s.LastUpdatedAt ?? s.CreatedDate)
                        .FirstOrDefault();

                    if (latestShipment != null)
                    {
                        var detailId = latestShipment.StatusDetails?.FirstOrDefault()?.Id;
                        mappedStatus = ShipBobStatusMapper.MapShipmentStatus(latestShipment.Status, detailId);
                    }
                }

                updates.Add(new FulfilmentStatusUpdate
                {
                    ProviderReference = referenceId,
                    ProviderStatus = status,
                    MappedStatus = mappedStatus,
                    StatusDate = DateTime.UtcNow
                });
            }

            _logger.LogDebug("Polled {Count} orders from ShipBob", updates.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error polling ShipBob order status");
        }

        return updates;
    }

    #endregion

    #region Product Sync

    /// <inheritdoc />
    public override async Task<FulfilmentSyncResult> SyncProductsAsync(
        IEnumerable<FulfilmentProduct> products,
        CancellationToken cancellationToken = default)
    {
        if (_apiClient == null || _settings == null || !_settings.IsValid)
        {
            return new FulfilmentSyncResult
            {
                Success = false,
                Errors = ["ShipBob provider not configured"]
            };
        }

        var productList = products.ToList();
        var processed = 0;
        var succeeded = 0;
        var failed = 0;
        var errors = new List<string>();

        foreach (var product in productList)
        {
            processed++;
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                var request = new ShipBobProductRequest
                {
                    Name = product.Name,
                    Sku = product.Sku,
                    Barcode = product.Barcode,
                    ReferenceId = product.ProductId.ToString(),
                    UnitPrice = product.Cost
                };

                // Try to find existing product first
                var existingResult = await _apiClient.GetProductsBySkusAsync([product.Sku], cancellationToken);

                if (existingResult.Success && existingResult.Data?.Count > 0)
                {
                    // Update existing
                    var existing = existingResult.Data[0];
                    var updateResult = await _apiClient.UpdateProductAsync(existing.Id, request, cancellationToken);

                    if (updateResult.Success)
                    {
                        succeeded++;
                        _logger.LogDebug("Updated product {Sku} in ShipBob", product.Sku);
                    }
                    else
                    {
                        failed++;
                        errors.Add($"{product.Sku}: {updateResult.ErrorMessage}");
                    }
                }
                else
                {
                    // Create new
                    var createResult = await _apiClient.CreateProductAsync(request, cancellationToken);

                    if (createResult.Success)
                    {
                        succeeded++;
                        _logger.LogDebug("Created product {Sku} in ShipBob", product.Sku);
                    }
                    else
                    {
                        failed++;
                        errors.Add($"{product.Sku}: {createResult.ErrorMessage}");
                    }
                }
            }
            catch (Exception ex)
            {
                failed++;
                errors.Add($"{product.Sku}: {ex.Message}");
                _logger.LogError(ex, "Error syncing product {Sku} to ShipBob", product.Sku);
            }
        }

        _logger.LogInformation("ShipBob product sync complete: {Processed} processed, {Succeeded} succeeded, {Failed} failed",
            processed, succeeded, failed);

        return new FulfilmentSyncResult
        {
            Success = failed == 0,
            ItemsProcessed = processed,
            ItemsSucceeded = succeeded,
            ItemsFailed = failed,
            Errors = errors
        };
    }

    #endregion

    #region Inventory Sync

    /// <inheritdoc />
    public override async Task<IReadOnlyList<FulfilmentInventoryLevel>> GetInventoryLevelsAsync(
        CancellationToken cancellationToken = default)
    {
        if (_apiClient == null || _settings == null || !_settings.IsValid)
        {
            _logger.LogWarning("Cannot get ShipBob inventory: provider not configured");
            return [];
        }

        try
        {
            var result = await _apiClient.GetInventoryLevelsAsync(cancellationToken: cancellationToken);

            if (!result.Success || result.Data == null)
            {
                _logger.LogWarning("Failed to get ShipBob inventory: {Error}", result.ErrorMessage);
                return [];
            }

            var levels = new List<FulfilmentInventoryLevel>();

            foreach (var item in result.Data)
            {
                // If there are fulfillment center quantities, create one level per center
                if (item.FulfillmentCenterQuantities?.Count > 0)
                {
                    foreach (var fcQuantity in item.FulfillmentCenterQuantities)
                    {
                        levels.Add(new FulfilmentInventoryLevel
                        {
                            Sku = item.Name ?? item.Id.ToString(),
                            WarehouseCode = fcQuantity.Name ?? fcQuantity.Id.ToString(),
                            AvailableQuantity = fcQuantity.FulfillableQuantity,
                            ReservedQuantity = fcQuantity.CommittedQuantity,
                            IncomingQuantity = fcQuantity.AwaitingQuantity,
                            LastUpdated = DateTime.UtcNow
                        });
                    }
                }
                else
                {
                    // Total quantities only
                    levels.Add(new FulfilmentInventoryLevel
                    {
                        Sku = item.Name ?? item.Id.ToString(),
                        AvailableQuantity = item.TotalFulfillableQuantity,
                        ReservedQuantity = item.TotalCommittedQuantity,
                        IncomingQuantity = item.TotalAwaitingQuantity,
                        LastUpdated = DateTime.UtcNow
                    });
                }
            }

            _logger.LogDebug("Retrieved {Count} inventory levels from ShipBob", levels.Count);
            return levels;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting ShipBob inventory levels");
            return [];
        }
    }

    #endregion

    #region IDisposable

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _apiClient?.Dispose();
        _disposed = true;
    }

    #endregion
}
