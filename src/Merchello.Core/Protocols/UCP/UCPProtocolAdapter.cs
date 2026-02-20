using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.BasketNotifications;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.Notifications;
using Merchello.Core.Protocols.Payments;
using Merchello.Core.Protocols.Payments.Interfaces;
using Merchello.Core.Protocols.UCP.Dtos;
using Merchello.Core.Protocols.UCP.Models;
using Merchello.Core.Protocols.UCP.Services;
using Merchello.Core.Protocols.UCP.Services.Interfaces;
using Merchello.Core.Protocols.Webhooks;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Merchello.Core.Settings.Models;
using Merchello.Core.Settings.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Security;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP;

/// <summary>
/// UCP (Universal Commerce Protocol) adapter implementation.
/// Translates between UCP protocol format and Merchello's internal models.
/// </summary>
public class UCPProtocolAdapter : ICommerceProtocolAdapter
{
    private readonly ICheckoutService _checkoutService;
    private readonly ICheckoutSessionService _checkoutSessionService;
    private readonly ICheckoutDiscountService _checkoutDiscountService;
    private readonly IInvoiceService _invoiceService;
    private readonly IPaymentService _paymentService;
    private readonly IProductService _productService;
    private readonly IPaymentHandlerExporter _paymentHandlerExporter;
    private readonly ISigningKeyStore _signingKeyStore;
    private readonly IUcpAgentProfileService _agentProfileService;
    private readonly LineItemFactory _lineItemFactory;
    private readonly IMerchelloNotificationPublisher _notificationPublisher;
    private readonly ILogger<UCPProtocolAdapter> _logger;
    private readonly ProtocolSettings _protocolSettings;
    private readonly MerchelloSettings _merchelloSettings;
    private readonly IMerchelloStoreSettingsService? _storeSettingsService;

    public UCPProtocolAdapter(
        ICheckoutService checkoutService,
        ICheckoutSessionService checkoutSessionService,
        ICheckoutDiscountService checkoutDiscountService,
        IInvoiceService invoiceService,
        IPaymentService paymentService,
        IProductService productService,
        IPaymentHandlerExporter paymentHandlerExporter,
        ISigningKeyStore signingKeyStore,
        IUcpAgentProfileService agentProfileService,
        LineItemFactory lineItemFactory,
        IMerchelloNotificationPublisher notificationPublisher,
        ILogger<UCPProtocolAdapter> logger,
        IOptions<ProtocolSettings> protocolSettings,
        IOptions<MerchelloSettings> merchelloSettings,
        IMerchelloStoreSettingsService? storeSettingsService = null)
    {
        _checkoutService = checkoutService;
        _checkoutSessionService = checkoutSessionService;
        _checkoutDiscountService = checkoutDiscountService;
        _invoiceService = invoiceService;
        _paymentService = paymentService;
        _productService = productService;
        _paymentHandlerExporter = paymentHandlerExporter;
        _signingKeyStore = signingKeyStore;
        _agentProfileService = agentProfileService;
        _lineItemFactory = lineItemFactory;
        _notificationPublisher = notificationPublisher;
        _logger = logger;
        _protocolSettings = protocolSettings.Value;
        _merchelloSettings = merchelloSettings.Value;
        _storeSettingsService = storeSettingsService;
    }

    /// <inheritdoc />
    public CommerceProtocolAdapterMetadata Metadata => new(
        Alias: ProtocolAliases.Ucp,
        DisplayName: "Universal Commerce Protocol",
        Version: _protocolSettings.Ucp.Version,
        Icon: "icon-globe",
        Description: "UCP enables AI agents to conduct commerce on behalf of users.",
        SupportsIdentityLinking: _protocolSettings.Ucp.Capabilities.IdentityLinking,
        SupportsOrderWebhooks: _protocolSettings.Ucp.Capabilities.Order
    );

    /// <inheritdoc />
    public bool IsEnabled => true;

    /// <inheritdoc />
    public async Task<object> GenerateManifestAsync(CancellationToken ct = default)
    {
        var capabilities = BuildCapabilities();
        var paymentHandlers = await _paymentHandlerExporter.ExportHandlersAsync(
            ProtocolAliases.Ucp, null, ct);
        var signingKeys = await _signingKeyStore.GetPublicKeysAsync(ct);

        return new UcpManifest
        {
            Ucp = new UcpManifestMetadata
            {
                Version = _protocolSettings.Ucp.Version,
                Services = new UcpServices
                {
                    Shopping = new UcpShoppingService
                    {
                        Rest = new UcpRestEndpoint
                        {
                            Endpoint = BuildAbsoluteUrl("/api/v1"),
                            Schema = "https://ucp.dev/services/shopping/rest.openapi.json"
                        }
                    }
                },
                Capabilities = capabilities
            },
            Payment = new UcpPaymentInfo
            {
                Handlers = paymentHandlers
            },
            SigningKeys = signingKeys.Select(k => new UcpSigningKey
            {
                Kty = k.Kty,
                Kid = k.Kid,
                Crv = k.Crv,
                X = k.X,
                Y = k.Y
            }).ToList()
        };
    }

    /// <inheritdoc />
    public async Task<ProtocolResponse> CreateSessionAsync(
        object request,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default)
    {
        try
        {
            // Publish "Creating" notification - handlers can cancel
            var creatingNotification = new ProtocolSessionCreatingNotification(
                request, ProtocolAliases.Ucp, agentIdentity);
            if (await _notificationPublisher.PublishCancelableAsync(creatingNotification, ct))
            {
                return ProtocolResponse.BadRequest(
                    creatingNotification.CancelReason ?? "Session creation cancelled");
            }

            var ucpRequest = request as UcpCreateSessionRequestDto;

            // Determine currency - use request currency or store default
            var currency = ucpRequest?.Currency ?? _merchelloSettings.StoreCurrencyCode;

            // Create a new basket
            var basket = _checkoutService.CreateBasket(currency, _merchelloSettings.CurrencySymbol);

            // Add line items if provided
            if (ucpRequest?.LineItems != null)
            {
                foreach (var lineItem in ucpRequest.LineItems)
                {
                    await AddLineItemToBasketAsync(basket, lineItem, ct);
                }
            }

            // Save basket first - must exist in DB before applying buyer info or discounts
            // because SaveAddressesAsync and ApplyDiscountCodeAsync use Update()
            await _checkoutService.SaveBasketAsync(new SaveBasketParameters { Basket = basket }, ct);

            // Apply buyer info if provided (updates the basket in DB)
            if (ucpRequest?.Buyer != null)
            {
                await ApplyBuyerInfoAsync(basket, ucpRequest.Buyer, ct);
            }

            // Apply/replace promotional discount codes if provided.
            await SyncPromotionalDiscountCodesAsync(basket, ucpRequest?.Discounts?.Codes, ct);

            var sessionState = await _checkoutService.GetSessionStateAsync(
                new GetSessionStateParameters { BasketId = basket.Id },
                ct);
            if (sessionState == null)
            {
                return ProtocolResponse.NotFound("Failed to create session");
            }

            // Publish "Created" notification
            await _notificationPublisher.PublishAsync(
                new ProtocolSessionCreatedNotification(sessionState, ProtocolAliases.Ucp, agentIdentity), ct);

            var envelope = await WrapSessionInEnvelopeAsync(sessionState, ct);
            return ProtocolResponse.Created(envelope);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create UCP checkout session");
            return ProtocolResponse.BadRequest(ex.Message);
        }
    }

    /// <inheritdoc />
    public async Task<ProtocolResponse> GetSessionAsync(
        string sessionId,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default)
    {
        if (!Guid.TryParse(sessionId, out var basketId))
        {
            return ProtocolResponse.BadRequest("Invalid session ID format");
        }

        var sessionState = await _checkoutService.GetSessionStateAsync(
            new GetSessionStateParameters { BasketId = basketId },
            ct);
        if (sessionState == null)
        {
            return ProtocolResponse.NotFound($"Session '{sessionId}' not found");
        }

        var envelope = await WrapSessionInEnvelopeAsync(sessionState, ct);
        return ProtocolResponse.Ok(envelope);
    }

    /// <inheritdoc />
    public async Task<ProtocolResponse> UpdateSessionAsync(
        string sessionId,
        object request,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default)
    {
        if (!Guid.TryParse(sessionId, out var basketId))
        {
            return ProtocolResponse.BadRequest("Invalid session ID format");
        }

        try
        {
            // Publish "Updating" notification - handlers can cancel
            var updatingNotification = new ProtocolSessionUpdatingNotification(
                sessionId, request, ProtocolAliases.Ucp, agentIdentity);
            if (await _notificationPublisher.PublishCancelableAsync(updatingNotification, ct))
            {
                return ProtocolResponse.BadRequest(
                    updatingNotification.CancelReason ?? "Session update cancelled");
            }

            // Load the basket
            var basket = await _checkoutService.GetBasketByIdAsync(
                new GetBasketByIdParameters { BasketId = basketId },
                ct);
            if (basket == null)
            {
                return ProtocolResponse.NotFound($"Session '{sessionId}' not found");
            }

            var ucpRequest = request as UcpUpdateSessionRequestDto;
            _logger.LogInformation(
                "UCP session {SessionId} update requested. Buyer: {HasBuyer}, Discounts: {HasDiscounts}, Fulfillment: {HasFulfillment}",
                sessionId,
                ucpRequest?.Buyer != null,
                ucpRequest?.Discounts?.Codes?.Count > 0,
                ucpRequest?.Fulfillment?.Groups?.Count > 0);

            // Apply line item updates if provided
            if (ucpRequest?.LineItems is { Count: > 0 } lineItems)
            {
                await ApplyLineItemsAsync(basket, lineItems, ct);
            }

            // Merge fulfillment destination address into buyer if present
            var fulfillmentDestination = GetFulfillmentDestinationAddress(ucpRequest);
            var buyerInfo = ucpRequest?.Buyer;
            if (fulfillmentDestination != null)
            {
                if (buyerInfo == null)
                {
                    buyerInfo = new UcpBuyerInfoDto { ShippingAddress = fulfillmentDestination };
                }
                else if (buyerInfo.ShippingAddress == null && buyerInfo.ShippingSameAsBilling != true)
                {
                    buyerInfo.ShippingAddress = fulfillmentDestination;
                }
            }

            // Apply buyer info if provided
            if (buyerInfo != null)
            {
                await ApplyBuyerInfoAsync(basket, buyerInfo, ct);
            }

            // Apply/replace promotional discount codes if provided.
            await SyncPromotionalDiscountCodesAsync(basket, ucpRequest?.Discounts?.Codes, ct);

            // Apply fulfillment selections if provided
            var fulfillmentGroups = GetFulfillmentGroupSelections(ucpRequest);
            if (fulfillmentGroups.Count > 0)
            {
                var checkoutSession = await _checkoutSessionService.GetSessionAsync(basketId, ct);
                var selections = new Dictionary<Guid, string>();

                foreach (var group in fulfillmentGroups)
                {
                    if (Guid.TryParse(group.Id, out var groupId) &&
                        TryNormalizeSelectionKey(group.SelectedOptionId, out var normalizedSelectionKey))
                    {
                        selections[groupId] = normalizedSelectionKey;
                    }
                }

                if (selections.Count > 0)
                {
                    await _checkoutService.SaveShippingSelectionsAsync(new SaveShippingSelectionsParameters
                    {
                        Basket = basket,
                        Session = checkoutSession,
                        Selections = selections
                    }, ct);
                }
            }

            // Save basket and return updated state
            await _checkoutService.SaveBasketAsync(new SaveBasketParameters { Basket = basket }, ct);

            var sessionState = await _checkoutService.GetSessionStateAsync(
                new GetSessionStateParameters { BasketId = basketId },
                ct);
            if (sessionState == null)
            {
                return ProtocolResponse.NotFound($"Session '{sessionId}' not found after update");
            }

            // Publish "Updated" notification
            await _notificationPublisher.PublishAsync(
                new ProtocolSessionUpdatedNotification(sessionState, ProtocolAliases.Ucp, agentIdentity), ct);

            var envelope = await WrapSessionInEnvelopeAsync(sessionState, ct);
            return ProtocolResponse.Ok(envelope);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update UCP checkout session {SessionId}", sessionId);
            return ProtocolResponse.BadRequest(ex.Message);
        }
    }

    /// <inheritdoc />
    public async Task<ProtocolResponse> CompleteSessionAsync(
        string sessionId,
        object paymentData,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default)
    {
        if (!Guid.TryParse(sessionId, out var basketId))
        {
            return ProtocolResponse.BadRequest("Invalid session ID format");
        }

        try
        {
            // Publish "Completing" notification - handlers can cancel
            var completingNotification = new ProtocolSessionCompletingNotification(
                sessionId, paymentData, ProtocolAliases.Ucp, agentIdentity);
            if (await _notificationPublisher.PublishCancelableAsync(completingNotification, ct))
            {
                return ProtocolResponse.BadRequest(
                    completingNotification.CancelReason ?? "Session completion cancelled");
            }

            // Get basket
            var basket = await _checkoutService.GetBasketByIdAsync(
                new GetBasketByIdParameters { BasketId = basketId },
                ct);
            if (basket == null)
            {
                return ProtocolResponse.NotFound($"Session '{sessionId}' not found");
            }

            // Get session state to verify status
            var sessionState = await _checkoutService.GetSessionStateAsync(
                new GetSessionStateParameters { BasketId = basketId },
                ct);
            if (sessionState == null)
            {
                return ProtocolResponse.NotFound($"Session '{sessionId}' not found");
            }

            // Parse payment data
            var completeRequest = paymentData as UcpCompleteSessionRequestDto;
            if (completeRequest == null || string.IsNullOrEmpty(completeRequest.PaymentHandlerId))
            {
                return ProtocolResponse.BadRequest("Payment handler ID is required");
            }

            // Parse handler ID format: "providerAlias:methodAlias"
            var handlerParts = completeRequest.PaymentHandlerId.Split(':', 2);
            if (handlerParts.Length != 2 || string.IsNullOrWhiteSpace(handlerParts[0]) || string.IsNullOrWhiteSpace(handlerParts[1]))
            {
                return ProtocolResponse.BadRequest("Payment handler ID must be in the format 'provider:method'");
            }
            var providerAlias = handlerParts[0];
            var methodAlias = handlerParts[1];

            // Validate handler exists
            var availableHandlers = await _paymentHandlerExporter.ExportHandlersAsync(
                ProtocolAliases.Ucp,
                sessionId,
                ct);

            var selectedHandler = availableHandlers.FirstOrDefault(h =>
                string.Equals(h.HandlerId, completeRequest.PaymentHandlerId, StringComparison.OrdinalIgnoreCase));

            if (selectedHandler == null)
            {
                return ProtocolResponse.BadRequest("Payment handler is not available for this session");
            }

            // Get checkout session
            var checkoutSession = await _checkoutSessionService.GetSessionAsync(basketId, ct);

            // If there is only one shipping option per group and no selection yet, auto-select it.
            if (await AutoSelectSingleOptionGroupsAsync(basket, sessionState, checkoutSession, ct))
            {
                sessionState = await _checkoutService.GetSessionStateAsync(
                    new GetSessionStateParameters { BasketId = basketId },
                    ct);
                if (sessionState == null)
                {
                    return ProtocolResponse.NotFound($"Session '{sessionId}' not found");
                }
            }

            if (sessionState.Status != ProtocolSessionStatuses.ReadyForComplete)
            {
                return ProtocolResponse.BadRequest(
                    $"Session is not ready for completion. Current status: {sessionState.Status}");
            }

            // Check for existing unpaid invoice to prevent ghost orders
            var invoice = await _invoiceService.GetUnpaidInvoiceForBasketAsync(basketId, ct);
            if (invoice == null)
            {
                // Fetch agent profile to get webhook URL for order updates
                var sourceMetadata = await BuildSourceMetadataAsync(agentIdentity, ct);

                // Build source tracking info from agent identity
                var source = new InvoiceSource
                {
                    Type = Constants.InvoiceSources.Ucp,
                    DisplayName = "UCP Agent",
                    SourceId = agentIdentity?.AgentId,
                    SourceName = agentIdentity?.AgentId,
                    ProfileUri = agentIdentity?.ProfileUri,
                    ProtocolVersion = _protocolSettings.Ucp.Version,
                    SessionId = sessionId,
                    Metadata = sourceMetadata
                };

                // Create invoice from basket with source tracking
                var invoiceResult = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession, source, ct);
                if (!invoiceResult.Success || invoiceResult.ResultObject == null)
                {
                    var errorMsg = invoiceResult.Messages.FirstOrDefault()?.Message ?? "Failed to create invoice";
                    return ProtocolResponse.BadRequest($"Invoice creation failed: {errorMsg}");
                }
                invoice = invoiceResult.ResultObject;
                _logger.LogInformation(
                    "UCP: Invoice {InvoiceId} created from session {SessionId} via agent {AgentId}. Webhook URL: {WebhookUrl}",
                    invoice.Id,
                    sessionId,
                    agentIdentity?.AgentId ?? "unknown",
                    sourceMetadata?.GetValueOrDefault(Constants.UcpMetadataKeys.WebhookUrl) ?? "none");
            }

            // Map payment instrument data to request fields based on handler type
            var instrumentData = ConvertInstrumentData(completeRequest.PaymentInstrument?.Data);
            var paymentMethodToken = completeRequest.PaymentInstrument?.Token;

            if (selectedHandler.Type == ProtocolPaymentHandlerTypes.Tokenized && string.IsNullOrWhiteSpace(paymentMethodToken))
            {
                return ProtocolResponse.BadRequest("Payment token is required for tokenized handlers");
            }

            if (selectedHandler.Type == ProtocolPaymentHandlerTypes.Wallet && string.IsNullOrWhiteSpace(paymentMethodToken))
            {
                return ProtocolResponse.BadRequest("Authorization token is required for wallet handlers");
            }

            if (selectedHandler.Type == ProtocolPaymentHandlerTypes.Form && (instrumentData == null || instrumentData.Count == 0))
            {
                return ProtocolResponse.BadRequest("Form data is required for form handlers");
            }

            if (selectedHandler.Type == ProtocolPaymentHandlerTypes.Redirect && (instrumentData == null || instrumentData.Count == 0))
            {
                return ProtocolResponse.BadRequest("Redirect parameters are required for redirect handlers");
            }

            // Build payment request
            var processRequest = new ProcessPaymentRequest
            {
                InvoiceId = invoice.Id,
                ProviderAlias = providerAlias,
                MethodAlias = methodAlias,
                PaymentMethodToken = selectedHandler.Type == ProtocolPaymentHandlerTypes.Tokenized
                    ? paymentMethodToken
                    : null,
                AuthorizationToken = selectedHandler.Type == ProtocolPaymentHandlerTypes.Wallet
                    ? paymentMethodToken
                    : null,
                FormData = selectedHandler.Type == ProtocolPaymentHandlerTypes.Form
                    ? instrumentData
                    : null,
                RedirectParams = selectedHandler.Type == ProtocolPaymentHandlerTypes.Redirect
                    ? instrumentData
                    : null,
                Amount = invoice.Total,
                CustomerEmail = basket.BillingAddress?.Email,
                CustomerName = basket.BillingAddress?.Name,
                CurrencyCode = invoice.CurrencyCode,
                IdempotencyKey = agentIdentity != null
                    ? $"ucp:{sessionId}:{agentIdentity.AgentId}"
                    : $"ucp:{sessionId}"
            };

            // Process payment
            var paymentResult = await _paymentService.ProcessPaymentAsync(processRequest, ct);

            if (!paymentResult.Success)
            {
                var errorMessages = paymentResult.Messages
                    .Where(m => m.ResultMessageType == ResultMessageType.Error)
                    .Select(m => m.Message)
                    .ToList();
                var errorMessage = errorMessages.Count > 0
                    ? string.Join("; ", errorMessages)
                    : "Payment processing failed";

                _logger.LogWarning(
                    "UCP: Payment failed for session {SessionId}: {Error}",
                    sessionId,
                    errorMessage);

                return ProtocolResponse.BadRequest(errorMessage, "payment_failed");
            }

            // Store invoice ID in session for order retrieval
            await _checkoutSessionService.SetInvoiceIdAsync(basketId, invoice.Id, ct);

            _logger.LogInformation(
                "UCP: Session {SessionId} completed. Invoice: {InvoiceId}, InvoiceNumber: {InvoiceNumber}",
                sessionId,
                invoice.Id,
                invoice.InvoiceNumber);

            var paymentStatus = paymentResult.ResultObject?.PaymentResult?.Status;
            var completionStatus = paymentStatus switch
            {
                PaymentResultStatus.Completed => ProtocolSessionStatuses.Completed,
                PaymentResultStatus.Pending => ProtocolSessionStatuses.CompleteInProgress,
                PaymentResultStatus.Authorized => ProtocolSessionStatuses.CompleteInProgress,
                _ => ProtocolSessionStatuses.CompleteInProgress
            };

            if (completionStatus == ProtocolSessionStatuses.Completed)
            {
                await _checkoutService.DeleteBasket(basketId, ct);

                // Publish "Completed" notification
                await _notificationPublisher.PublishAsync(
                    new ProtocolSessionCompletedNotification(
                        sessionState, invoice.Id.ToString(), ProtocolAliases.Ucp, agentIdentity), ct);
            }

            var completionData = new
            {
                id = sessionId,
                status = completionStatus,
                order_id = invoice.Id.ToString(),
                order_number = invoice.InvoiceNumber,
                permalink_url = BuildAbsoluteUrl($"/order/{invoice.Id}"),
                totals = BuildTotalsArray(
                    invoice.CurrencyCode,
                    ("subtotal", ToMinorUnits(invoice.SubTotal)),
                    ("tax", ToMinorUnits(invoice.Tax)),
                    ("total", ToMinorUnits(invoice.Total)))
            };

            return ProtocolResponse.Ok(WrapDataInEnvelope(completionData));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "UCP: Failed to complete session {SessionId}", sessionId);
            return ProtocolResponse.BadRequest(ex.Message);
        }
    }

    /// <inheritdoc />
    public async Task<ProtocolResponse> CancelSessionAsync(
        string sessionId,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default)
    {
        if (!Guid.TryParse(sessionId, out var basketId))
        {
            return ProtocolResponse.BadRequest("Invalid session ID format");
        }

        try
        {
            // Check if basket exists before attempting to delete
            var basket = await _checkoutService.GetBasketByIdAsync(
                new GetBasketByIdParameters { BasketId = basketId },
                ct);
            if (basket == null)
            {
                return ProtocolResponse.NotFound($"Session '{sessionId}' not found");
            }

            await _checkoutService.DeleteBasket(basketId, ct);

            var cancelData = new
            {
                id = sessionId,
                status = ProtocolSessionStatuses.Canceled
            };

            return ProtocolResponse.Ok(WrapDataInEnvelope(cancelData));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cancel session {SessionId}", sessionId);
            return ProtocolResponse.BadRequest(ex.Message);
        }
    }

    /// <inheritdoc />
    public async Task<ProtocolResponse> GetOrderAsync(
        string orderId,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default)
    {
        if (!Guid.TryParse(orderId, out var invoiceId))
        {
            return ProtocolResponse.BadRequest("Invalid order ID format");
        }

        var invoice = await _invoiceService.GetInvoiceAsync(invoiceId, ct);
        if (invoice == null)
        {
            return ProtocolResponse.NotFound($"Order '{orderId}' not found");
        }

        if (invoice.Source?.Type != Constants.InvoiceSources.Ucp)
        {
            return ProtocolResponse.NotFound($"Order '{orderId}' not found");
        }

        if (!string.IsNullOrWhiteSpace(agentIdentity?.AgentId) &&
            !string.IsNullOrWhiteSpace(invoice.Source?.SourceId) &&
            !string.Equals(invoice.Source.SourceId, agentIdentity.AgentId, StringComparison.OrdinalIgnoreCase))
        {
            return ProtocolResponse.NotFound($"Order '{orderId}' not found");
        }

        // Map invoice to UCP order format
        var ucpOrder = MapInvoiceToUcpOrder(invoice);

        return ProtocolResponse.Ok(WrapDataInEnvelope(ucpOrder));
    }

    private object MapInvoiceToUcpOrder(Invoice invoice)
    {
        // Determine overall fulfillment status from orders
        var fulfillmentStatus = DetermineFulfillmentStatus(invoice.Orders);
        var paymentStatus = DeterminePaymentStatus(invoice);

        // Map line items from all orders
        var lineItems = invoice.Orders?
            .SelectMany(o => o.LineItems ?? [])
            .Where(li => li.LineItemType == LineItemType.Product)
            .Select(li => new
            {
                id = li.Id.ToString(),
                product_id = li.ProductId?.ToString(),
                sku = li.Sku ?? string.Empty,
                name = li.Name ?? string.Empty,
                quantity = new
                {
                    total = li.Quantity,
                    fulfilled = GetFulfilledQuantity(li, invoice.Orders)
                },
                totals = BuildTotalsArray(
                    invoice.CurrencyCode,
                    ("subtotal", ToMinorUnits(li.Amount * li.Quantity)),
                    ("total", ToMinorUnits(li.Amount * li.Quantity))),
                status = GetLineItemStatus(li, invoice.Orders)
            })
            .ToList() ?? [];

        // Map fulfillment events from shipments
        var fulfillmentEvents = invoice.Orders?
            .SelectMany(o => o.Shipments ?? [])
            .Select(s => new
            {
                occurred_at = s.ShippedDate?.ToString("O") ?? s.DateCreated.ToString("O"),
                type = MapShipmentStatusToEventType(s.Status),
                line_items = s.LineItems?.Select(li => new
                {
                    id = li.Id.ToString(),
                    quantity = li.Quantity
                }).ToList(),
                tracking = !string.IsNullOrEmpty(s.TrackingNumber) ? new
                {
                    number = s.TrackingNumber,
                    url = s.TrackingUrl
                } : null
            })
            .ToList() ?? [];

        return new
        {
            id = invoice.Id.ToString(),
            checkout_id = invoice.Source?.SessionId,
            permalink_url = BuildAbsoluteUrl($"/order/{invoice.Id}"),
            line_items = lineItems,
            totals = BuildTotalsArray(
                invoice.CurrencyCode,
                ("subtotal", ToMinorUnits(invoice.SubTotal)),
                ("tax", ToMinorUnits(invoice.Tax)),
                ("total", ToMinorUnits(invoice.Total))),
            fulfillment = new
            {
                status = fulfillmentStatus,
                events = fulfillmentEvents
            },
            payment_status = paymentStatus
        };
    }

    private static string DetermineFulfillmentStatus(ICollection<Order>? orders)
    {
        if (orders == null || orders.Count == 0)
        {
            return "unfulfilled";
        }

        var statuses = orders.Select(o => o.Status).ToList();

        if (statuses.All(s => s == OrderStatus.Completed))
        {
            return "fulfilled";
        }

        if (statuses.Any(s => s == OrderStatus.Shipped || s == OrderStatus.Completed))
        {
            return "partial";
        }

        if (statuses.Any(s => s == OrderStatus.Processing))
        {
            return "in_progress";
        }

        return "unfulfilled";
    }

    private string DeterminePaymentStatus(Invoice invoice)
    {
        var status = _paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
        {
            Payments = invoice.Payments ?? [],
            InvoiceTotal = invoice.Total,
            CurrencyCode = invoice.CurrencyCode ?? _merchelloSettings.StoreCurrencyCode
        });

        return MapPaymentStatusToUcp(status.Status);
    }

    private static string MapPaymentStatusToUcp(InvoicePaymentStatus status) => status switch
    {
        InvoicePaymentStatus.Paid => "paid",
        InvoicePaymentStatus.PartiallyPaid => "partially_paid",
        InvoicePaymentStatus.PartiallyRefunded => "partially_refunded",
        InvoicePaymentStatus.Refunded => "refunded",
        InvoicePaymentStatus.AwaitingPayment => "awaiting_payment",
        _ => "unpaid"
    };

    private static long ToMinorUnits(decimal amount) => (long)Math.Round(amount * 100);

    private static string MapShipmentStatusToEventType(ShipmentStatus status)
    {
        return status switch
        {
            ShipmentStatus.Preparing => ProtocolFulfillmentEventTypes.Processing,
            ShipmentStatus.Shipped => ProtocolFulfillmentEventTypes.Shipped,
            ShipmentStatus.Delivered => ProtocolFulfillmentEventTypes.Delivered,
            ShipmentStatus.Cancelled => ProtocolFulfillmentEventTypes.Canceled,
            _ => ProtocolFulfillmentEventTypes.Processing
        };
    }

    private static int GetFulfilledQuantity(LineItem lineItem, ICollection<Order>? orders)
    {
        if (orders == null)
        {
            return 0;
        }

        return orders
            .SelectMany(o => o.Shipments ?? [])
            .SelectMany(s => s.LineItems ?? [])
            .Where(li => li.Id == lineItem.Id)
            .Sum(li => li.Quantity);
    }

    private static string GetLineItemStatus(LineItem lineItem, ICollection<Order>? orders)
    {
        var fulfilled = GetFulfilledQuantity(lineItem, orders);
        if (fulfilled >= lineItem.Quantity)
        {
            return "fulfilled";
        }

        return fulfilled > 0 ? "partial" : "unfulfilled";
    }

    /// <inheritdoc />
    public async Task<object> GetPaymentHandlersAsync(
        string? sessionId,
        CancellationToken ct = default)
    {
        return await _paymentHandlerExporter.ExportHandlersAsync(
            ProtocolAliases.Ucp, sessionId, ct);
    }

    /// <inheritdoc />
    public Task<object?> NegotiateCapabilitiesAsync(
        object fullManifest,
        IReadOnlyList<string> agentCapabilities,
        CancellationToken ct = default)
    {
        if (fullManifest is not UcpManifest manifest)
        {
            return Task.FromResult<object?>(fullManifest);
        }

        // Server-selects: return intersection of capabilities
        var businessCapabilities = manifest.Ucp.Capabilities
            .Select(c => c.Name)
            .ToHashSet();

        var commonCapabilities = agentCapabilities
            .Where(businessCapabilities.Contains)
            .ToList();

        if (commonCapabilities.Count == 0)
        {
            return Task.FromResult<object?>(null);
        }

        // Filter manifest to only include common capabilities
        var filteredCapabilities = manifest.Ucp.Capabilities
            .Where(c => commonCapabilities.Contains(c.Name))
            .ToList();

        var filteredManifest = manifest with
        {
            Ucp = manifest.Ucp with
            {
                Capabilities = filteredCapabilities
            }
        };

        return Task.FromResult<object?>(filteredManifest);
    }

    #region Helper Methods

    /// <summary>
    /// Builds source metadata by fetching the agent profile and extracting webhook URL.
    /// </summary>
    private async Task<Dictionary<string, object>?> BuildSourceMetadataAsync(
        AgentIdentity? agentIdentity,
        CancellationToken ct)
    {
        if (string.IsNullOrEmpty(agentIdentity?.ProfileUri))
        {
            return null;
        }

        try
        {
            var profile = await _agentProfileService.GetProfileAsync(agentIdentity.ProfileUri, ct);
            if (profile == null)
            {
                _logger.LogDebug("Could not fetch agent profile from {ProfileUri}", agentIdentity.ProfileUri);
                return null;
            }

            var metadata = new Dictionary<string, object>();

            // Store agent name if available
            if (!string.IsNullOrEmpty(profile.Name))
            {
                metadata[Constants.UcpMetadataKeys.AgentName] = profile.Name;
            }

            // Extract and store webhook URL for order updates
            var webhookUrl = _agentProfileService.GetOrderWebhookUrl(profile);
            if (!string.IsNullOrEmpty(webhookUrl))
            {
                if (UrlSecurityValidator.TryValidatePublicHttpUrl(
                        webhookUrl,
                        requireHttps: true,
                        out _,
                        out var urlError))
                {
                    metadata[Constants.UcpMetadataKeys.WebhookUrl] = webhookUrl;
                    _logger.LogDebug(
                        "Extracted order webhook URL from agent profile: {WebhookUrl}",
                        webhookUrl);
                }
                else
                {
                    _logger.LogWarning(
                        "Rejected UCP webhook URL from agent profile {ProfileUri}. URL: {WebhookUrl}. Reason: {Reason}",
                        agentIdentity.ProfileUri,
                        webhookUrl,
                        urlError);
                }
            }

            // Store agent capabilities
            if (profile.Ucp?.Capabilities is { Count: > 0 })
            {
                var capabilityNames = profile.Ucp.Capabilities
                    .Where(c => !string.IsNullOrEmpty(c.Name))
                    .Select(c => c.Name!)
                    .ToList();
                metadata[Constants.UcpMetadataKeys.AgentCapabilities] = capabilityNames;
            }

            return metadata.Count > 0 ? metadata : null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to build source metadata from agent profile {ProfileUri}", agentIdentity.ProfileUri);
            return null;
        }
    }

    private async Task AddLineItemToBasketAsync(Basket basket, UcpLineItemRequestDto lineItem, CancellationToken ct)
    {
        Guid? relatedLineItemId = null;
        if (!string.IsNullOrWhiteSpace(lineItem.Id) && Guid.TryParse(lineItem.Id, out var parsedLineItemId))
        {
            relatedLineItemId = parsedLineItemId;
        }

        if (lineItem.Item?.Id == null)
        {
            basket.Errors.Add(new BasketError { Message = "Line item is missing item.id", RelatedLineItemId = relatedLineItemId });
            return;
        }

        if (lineItem.Quantity <= 0)
        {
            basket.Errors.Add(new BasketError { Message = "Line item quantity must be greater than zero", RelatedLineItemId = relatedLineItemId });
            return;
        }

        // Try to parse item.id as a product GUID
        var itemId = lineItem.Item.Id;
        if (!Guid.TryParse(itemId, out var productId))
        {
            _logger.LogWarning("UCP line item id '{ItemId}' is not a valid product GUID", itemId);
            basket.Errors.Add(new BasketError { Message = $"Invalid product id '{itemId}'", RelatedLineItemId = relatedLineItemId });
            return;
        }

        var product = await _productService.GetProduct(new GetProductParameters
        {
            ProductId = productId,
            IncludeProductRoot = true,
            IncludeTaxGroup = true,
            NoTracking = true
        }, ct);

        if (product == null)
        {
            _logger.LogWarning("Product {ProductId} not found when adding to UCP session", productId);
            basket.Errors.Add(new BasketError { Message = $"Product '{productId}' not found", RelatedLineItemId = relatedLineItemId });
            return;
        }

        // Create line item from product via factory (ensures TaxRate/TaxGroupId are set correctly)
        var newLineItem = _lineItemFactory.CreateFromProduct(product, lineItem.Quantity);
        newLineItem.Name = product.Name ?? product.ProductRoot?.RootName ?? lineItem.Item!.Title ?? "Unknown Product";
        if (product.ProductRoot?.IsDigitalProduct == true)
        {
            newLineItem.ExtendedData["IsDigital"] = true;
        }

        var countryCode = basket.ShippingAddress?.CountryCode ?? _merchelloSettings.DefaultShippingCountry ?? "US";
        await _checkoutService.AddToBasketAsync(basket, newLineItem, countryCode, ct);
    }

    private async Task ApplyBuyerInfoAsync(Basket basket, UcpBuyerInfoDto buyer, CancellationToken ct)
    {
        var hasBuyerUpdates = buyer.BillingAddress != null ||
                              buyer.ShippingAddress != null ||
                              buyer.ShippingSameAsBilling.HasValue ||
                              !string.IsNullOrWhiteSpace(buyer.Email) ||
                              !string.IsNullOrWhiteSpace(buyer.Phone);

        if (!hasBuyerUpdates)
        {
            return;
        }

        var session = await _checkoutSessionService.GetSessionAsync(basket.Id, ct);
        var shippingSameAsBilling = buyer.ShippingSameAsBilling ?? session.ShippingSameAsBilling;

        var existingBilling = MapAddressToCheckoutAddress(basket.BillingAddress);
        var existingShipping = MapAddressToCheckoutAddress(basket.ShippingAddress);

        var updatedBilling = MergeCheckoutAddress(existingBilling, buyer.BillingAddress, buyer.Phone);
        var updatedShipping = MergeCheckoutAddress(existingShipping, buyer.ShippingAddress, buyer.Phone);

        if (shippingSameAsBilling)
        {
            updatedShipping = updatedBilling;
        }

        var email = !string.IsNullOrWhiteSpace(buyer.Email)
            ? buyer.Email
            : basket.BillingAddress.Email ?? basket.ShippingAddress.Email ?? string.Empty;

        var result = await _checkoutService.SaveAddressesAsync(new SaveAddressesParameters
        {
            Basket = basket,
            Email = email,
            BillingAddress = updatedBilling,
            ShippingAddress = updatedShipping,
            ShippingSameAsBilling = shippingSameAsBilling
        }, ct);

        if (!result.Success)
        {
            var errors = result.Messages.Where(m => m.ResultMessageType == ResultMessageType.Error);
            var errorMessages = string.Join(", ", errors.Select(m => m.Message));
            _logger.LogWarning("Failed to save addresses for UCP session: {Error}", errorMessages);
        }
    }

    private static AddressDto? MapUcpAddressToCheckoutAddress(UcpAddressDto? ucpAddress)
    {
        if (ucpAddress == null) return null;

        var nameParts = new List<string>();
        if (!string.IsNullOrEmpty(ucpAddress.GivenName)) nameParts.Add(ucpAddress.GivenName);
        if (!string.IsNullOrEmpty(ucpAddress.FamilyName)) nameParts.Add(ucpAddress.FamilyName);
        var name = nameParts.Count > 0 ? string.Join(" ", nameParts) : null;

        return new AddressDto
        {
            Name = name,
            Company = ucpAddress.Organization,
            AddressOne = ucpAddress.AddressLine1,
            AddressTwo = ucpAddress.AddressLine2,
            TownCity = ucpAddress.Locality,
            CountyState = ucpAddress.AdministrativeArea,
            RegionCode = ucpAddress.AdministrativeArea,
            PostalCode = ucpAddress.PostalCode,
            CountryCode = ucpAddress.CountryCode,
            Phone = ucpAddress.Phone
        };
    }

    private static AddressDto MapAddressToCheckoutAddress(Address? address)
    {
        if (address == null)
        {
            return new AddressDto();
        }

        return new AddressDto
        {
            Name = address.Name,
            Company = address.Company,
            AddressOne = address.AddressOne,
            AddressTwo = address.AddressTwo,
            TownCity = address.TownCity,
            CountyState = string.IsNullOrWhiteSpace(address.CountyState?.Name)
                ? address.CountyState?.RegionCode
                : address.CountyState?.Name,
            RegionCode = address.CountyState?.RegionCode,
            PostalCode = address.PostalCode,
            Country = address.Country,
            CountryCode = address.CountryCode,
            Email = address.Email,
            Phone = address.Phone
        };
    }

    private static AddressDto MergeCheckoutAddress(
        AddressDto existing,
        UcpAddressDto? update,
        string? fallbackPhone)
    {
        var merged = new AddressDto
        {
            Name = existing.Name,
            Company = existing.Company,
            AddressOne = existing.AddressOne,
            AddressTwo = existing.AddressTwo,
            TownCity = existing.TownCity,
            CountyState = existing.CountyState,
            RegionCode = existing.RegionCode,
            PostalCode = existing.PostalCode,
            Country = existing.Country,
            CountryCode = existing.CountryCode,
            Email = existing.Email,
            Phone = existing.Phone
        };

        if (update == null)
        {
            if (!string.IsNullOrWhiteSpace(fallbackPhone) && string.IsNullOrWhiteSpace(merged.Phone))
            {
                merged.Phone = fallbackPhone;
            }
            return merged;
        }

        if (!string.IsNullOrWhiteSpace(update.GivenName) || !string.IsNullOrWhiteSpace(update.FamilyName))
        {
            merged.Name = string.Join(" ", new[] { update.GivenName, update.FamilyName }
                .Where(part => !string.IsNullOrWhiteSpace(part)));
        }

        if (!string.IsNullOrWhiteSpace(update.Organization)) merged.Company = update.Organization;
        if (!string.IsNullOrWhiteSpace(update.AddressLine1)) merged.AddressOne = update.AddressLine1;
        if (!string.IsNullOrWhiteSpace(update.AddressLine2)) merged.AddressTwo = update.AddressLine2;
        if (!string.IsNullOrWhiteSpace(update.Locality)) merged.TownCity = update.Locality;
        if (!string.IsNullOrWhiteSpace(update.AdministrativeArea))
        {
            merged.CountyState = update.AdministrativeArea;
            merged.RegionCode = update.AdministrativeArea;
        }
        if (!string.IsNullOrWhiteSpace(update.PostalCode)) merged.PostalCode = update.PostalCode;
        if (!string.IsNullOrWhiteSpace(update.CountryCode)) merged.CountryCode = update.CountryCode;
        if (!string.IsNullOrWhiteSpace(update.Phone)) merged.Phone = update.Phone;
        else if (!string.IsNullOrWhiteSpace(fallbackPhone) && string.IsNullOrWhiteSpace(merged.Phone))
        {
            merged.Phone = fallbackPhone;
        }

        return merged;
    }

    private async Task ApplyLineItemsAsync(
        Basket basket,
        IReadOnlyList<UcpLineItemRequestDto> lineItems,
        CancellationToken ct)
    {
        if (lineItems.Count == 0)
        {
            return;
        }

        var countryCode = basket.ShippingAddress?.CountryCode
            ?? _merchelloSettings.DefaultShippingCountry
            ?? "US";

        foreach (var lineItem in lineItems)
        {
            var existing = FindExistingLineItem(basket, lineItem);
            Guid? relatedLineItemId = null;
            if (!string.IsNullOrWhiteSpace(lineItem.Id) && Guid.TryParse(lineItem.Id, out var parsedLineItemId))
            {
                relatedLineItemId = parsedLineItemId;
            }

            if (lineItem.Quantity <= 0)
            {
                if (existing != null)
                {
                    await _checkoutService.RemoveFromBasketAsync(basket, existing.Id, countryCode, ct);
                }
                else
                {
                    basket.Errors.Add(new BasketError
                    {
                        Message = "Line item not found for removal",
                        RelatedLineItemId = relatedLineItemId
                    });
                }
                continue;
            }

            if (existing != null)
            {
                await UpdateLineItemQuantityAsync(basket, existing, lineItem.Quantity, countryCode, ct);
                continue;
            }

            await AddLineItemToBasketAsync(basket, lineItem, ct);
        }
    }

    private static LineItem? FindExistingLineItem(Basket basket, UcpLineItemRequestDto lineItem)
    {
        if (!string.IsNullOrWhiteSpace(lineItem.Id) && Guid.TryParse(lineItem.Id, out var lineItemId))
        {
            return basket.LineItems.FirstOrDefault(li => li.Id == lineItemId && li.LineItemType == LineItemType.Product);
        }

        var productIdString = lineItem.Item?.Id;
        if (!string.IsNullOrWhiteSpace(productIdString) && Guid.TryParse(productIdString, out var productId))
        {
            return basket.LineItems.FirstOrDefault(li => li.ProductId == productId && li.LineItemType == LineItemType.Product);
        }

        return null;
    }

    private async Task UpdateLineItemQuantityAsync(
        Basket basket,
        LineItem lineItem,
        int quantity,
        string? countryCode,
        CancellationToken ct)
    {
        if (lineItem.Quantity == quantity)
        {
            return;
        }

        var oldQuantity = lineItem.Quantity;
        var changingNotification = new BasketItemQuantityChangingNotification(basket, lineItem, oldQuantity, quantity);
        if (await _notificationPublisher.PublishCancelableAsync(changingNotification, ct))
        {
            basket.Errors.Add(new BasketError
            {
                Message = changingNotification.CancelReason ?? "Line item quantity change cancelled",
                RelatedLineItemId = lineItem.Id
            });
            return;
        }

        lineItem.Quantity = quantity;
        basket.DateUpdated = DateTime.UtcNow;
        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = countryCode
        }, ct);

        await _notificationPublisher.PublishAsync(
            new BasketItemQuantityChangedNotification(basket, lineItem, oldQuantity, quantity), ct);
    }

    private static List<UcpFulfillmentGroupSelectionDto> GetFulfillmentGroupSelections(UcpUpdateSessionRequestDto? request)
    {
        var selections = new List<UcpFulfillmentGroupSelectionDto>();

        if (request?.Fulfillment?.Groups != null)
        {
            selections.AddRange(request.Fulfillment.Groups);
        }

        if (request?.Fulfillment?.Methods != null)
        {
            foreach (var method in request.Fulfillment.Methods)
            {
                if (method.Groups != null)
                {
                    selections.AddRange(method.Groups);
                }
            }
        }

        return selections
            .Where(g => !string.IsNullOrWhiteSpace(g.Id))
            .GroupBy(g => g.Id!)
            .Select(g => g.Last())
            .ToList();
    }

    private static UcpAddressDto? GetFulfillmentDestinationAddress(UcpUpdateSessionRequestDto? request)
    {
        if (request?.Fulfillment?.Methods == null)
        {
            return null;
        }

        foreach (var method in request.Fulfillment.Methods)
        {
            var destination = method.Destinations?.FirstOrDefault(d => d.Address != null);
            if (destination?.Address != null)
            {
                return destination.Address;
            }
        }

        return null;
    }

    private async Task SyncPromotionalDiscountCodesAsync(
        Basket basket,
        IReadOnlyList<string>? requestedCodes,
        CancellationToken ct)
    {
        if (requestedCodes == null)
        {
            return;
        }

        var countryCode = basket.ShippingAddress?.CountryCode ?? _merchelloSettings.DefaultShippingCountry;
        var normalizedRequested = requestedCodes
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Select(code => code.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var existingDiscountLineItems = basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Discount && !string.IsNullOrWhiteSpace(GetDiscountCode(li)))
            .ToList();

        var existingCodes = existingDiscountLineItems
            .Select(GetDiscountCode)
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Select(code => code!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var discountLineItem in existingDiscountLineItems)
        {
            var existingCode = GetDiscountCode(discountLineItem);
            if (string.IsNullOrWhiteSpace(existingCode))
            {
                continue;
            }

            if (!normalizedRequested.Contains(existingCode, StringComparer.OrdinalIgnoreCase))
            {
                await _checkoutDiscountService.RemoveDiscountFromBasketAsync(
                    basket,
                    discountLineItem.Id,
                    countryCode,
                    ct);
            }
        }

        foreach (var requestedCode in normalizedRequested)
        {
            if (existingCodes.Contains(requestedCode))
            {
                continue;
            }

            await _checkoutDiscountService.ApplyDiscountCodeAsync(
                basket,
                requestedCode,
                countryCode,
                ct);
        }
    }

    private static string? GetDiscountCode(LineItem lineItem)
    {
        if (!lineItem.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountCode, out var code))
        {
            return null;
        }

        return code.UnwrapJsonElement()?.ToString();
    }

    private static Dictionary<string, string>? ConvertInstrumentData(Dictionary<string, object>? data)
    {
        if (data == null || data.Count == 0)
        {
            return null;
        }

        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (key, value) in data)
        {
            var stringValue = CoerceToString(value);
            if (!string.IsNullOrWhiteSpace(key) && stringValue != null)
            {
                result[key] = stringValue;
            }
        }

        return result.Count > 0 ? result : null;
    }

    private static string? CoerceToString(object? value) =>
        value.UnwrapJsonElement()?.ToString();

    private static bool TryNormalizeSelectionKey(string? selection, out string normalized)
    {
        normalized = string.Empty;
        if (!Shipping.Extensions.SelectionKeyExtensions.TryParse(selection, out var shippingOptionId, out var providerKey, out var serviceCode))
        {
            return false;
        }

        if (shippingOptionId.HasValue)
        {
            normalized = Shipping.Extensions.SelectionKeyExtensions.ForShippingOption(shippingOptionId.Value);
            return true;
        }

        if (!string.IsNullOrWhiteSpace(providerKey) && !string.IsNullOrWhiteSpace(serviceCode))
        {
            normalized = Shipping.Extensions.SelectionKeyExtensions.ForDynamicProvider(providerKey, serviceCode);
            return true;
        }

        return false;
    }

    private async Task<bool> AutoSelectSingleOptionGroupsAsync(
        Basket basket,
        CheckoutSessionState sessionState,
        CheckoutSession checkoutSession,
        CancellationToken ct)
    {
        var fulfillment = sessionState.Fulfillment;
        if (fulfillment?.Methods == null)
        {
            return false;
        }

        var selections = checkoutSession.SelectedShippingOptions != null
            ? new Dictionary<Guid, string>(checkoutSession.SelectedShippingOptions)
            : new Dictionary<Guid, string>();

        var added = false;

        foreach (var method in fulfillment.Methods)
        {
            if (method.Groups == null)
            {
                continue;
            }

            foreach (var group in method.Groups)
            {
                if (!string.IsNullOrWhiteSpace(group.SelectedOptionId))
                {
                    continue;
                }

                if (group.Options == null || group.Options.Count != 1)
                {
                    continue;
                }

                if (!Guid.TryParse(group.GroupId, out var groupId) ||
                    !TryNormalizeSelectionKey(group.Options[0].OptionId, out var normalizedSelectionKey))
                {
                    continue;
                }

                if (!selections.ContainsKey(groupId))
                {
                    selections[groupId] = normalizedSelectionKey;
                    added = true;
                }
            }
        }

        if (!added)
        {
            return false;
        }

        var saveResult = await _checkoutService.SaveShippingSelectionsAsync(new SaveShippingSelectionsParameters
        {
            Basket = basket,
            Session = checkoutSession,
            Selections = selections
        }, ct);

        if (!saveResult.Success)
        {
            _logger.LogWarning("Auto-selecting shipping options failed for session {SessionId}", sessionState.SessionId);
            return false;
        }

        return true;
    }

    #endregion

    private List<UcpCapability> BuildCapabilities()
    {
        var capabilities = new List<UcpCapability>();
        var settings = GetEffectiveUcp();

        if (settings.Capabilities.Checkout)
        {
                capabilities.Add(new UcpCapability
                {
                    Name = UcpCapabilityNames.Checkout,
                    Version = settings.Version,
                    Spec = "https://ucp.dev/specification/checkout/",
                    Schema = "https://ucp.dev/schemas/shopping/checkout.json"
                });

            // Add extensions that extend Checkout
            if (settings.Extensions.Discount)
            {
                capabilities.Add(new UcpCapability
                {
                    Name = UcpExtensionNames.Discount,
                    Version = settings.Version,
                    Spec = "https://ucp.dev/specification/discount/",
                    Schema = "https://ucp.dev/schemas/shopping/discount.json",
                    Extends = UcpCapabilityNames.Checkout
                });
            }

            if (settings.Extensions.Fulfillment)
            {
                capabilities.Add(new UcpCapability
                {
                    Name = UcpExtensionNames.Fulfillment,
                    Version = settings.Version,
                    Spec = "https://ucp.dev/specification/fulfillment/",
                    Schema = "https://ucp.dev/schemas/shopping/fulfillment.json",
                    Extends = UcpCapabilityNames.Checkout
                });
            }

            if (settings.Extensions.BuyerConsent)
            {
                capabilities.Add(new UcpCapability
                {
                    Name = UcpExtensionNames.BuyerConsent,
                    Version = settings.Version,
                    Spec = "https://ucp.dev/specification/buyer-consent/",
                    Schema = "https://ucp.dev/schemas/shopping/buyer-consent.json",
                    Extends = UcpCapabilityNames.Checkout
                });
            }

            if (settings.Extensions.Ap2Mandates)
            {
                capabilities.Add(new UcpCapability
                {
                    Name = UcpExtensionNames.Ap2Mandates,
                    Version = settings.Version,
                    Spec = "https://ucp.dev/specification/ap2-mandates/",
                    Schema = "https://ucp.dev/schemas/shopping/ap2-mandates.json",
                    Extends = UcpCapabilityNames.Checkout
                });
            }
        }

        if (settings.Capabilities.Order)
        {
            capabilities.Add(new UcpCapability
            {
                Name = UcpCapabilityNames.Order,
                Version = settings.Version,
                Spec = "https://ucp.dev/specification/order/",
                Schema = "https://ucp.dev/schemas/shopping/order.json"
            });
        }

        if (settings.Capabilities.IdentityLinking)
        {
            capabilities.Add(new UcpCapability
            {
                Name = UcpCapabilityNames.IdentityLinking,
                Version = settings.Version,
                Spec = "https://ucp.dev/specification/identity-linking/",
                Schema = "https://ucp.dev/schemas/common/identity-linking.json"
            });
        }

        return capabilities;
    }

    private async Task<object> WrapSessionInEnvelopeAsync(
        CheckoutSessionState session,
        CancellationToken ct)
    {
        var handlers = await _paymentHandlerExporter.ExportHandlersAsync(
            ProtocolAliases.Ucp,
            session.SessionId,
            ct);

        var ucpSession = MapSessionToUcpSession(session);

        var ucp = new UcpMetadata
        {
            Version = _protocolSettings.Ucp.Version,
            Capabilities = GetActiveCapabilities(),
            PaymentHandlers = handlers
        };

        return MergeWithUcpMetadata(ucpSession, ucp);
    }

    private object MapSessionToUcpSession(CheckoutSessionState session)
    {
        return new
        {
            id = session.SessionId,
            status = session.Status,
            created_at = session.CreatedAt,
            updated_at = session.UpdatedAt,
            expires_at = session.ExpiresAt,
            currency = session.Currency,
            buyer = MapBuyer(session),
            line_items = session.LineItems.Select(li => MapSessionLineItem(li, session.Currency)).ToList(),
            discounts = MapSessionDiscounts(session.Discounts),
            totals = MapSessionTotals(session.Totals),
            messages = session.Messages.Select(MapSessionMessage).ToList(),
            fulfillment = MapSessionFulfillment(session.Fulfillment),
            continue_url = string.IsNullOrWhiteSpace(session.ContinueUrl)
                ? null
                : BuildAbsoluteUrl(session.ContinueUrl),
            links = BuildLegalLinks()
        };
    }

    private static UcpBuyerInfoDto? MapBuyer(CheckoutSessionState session)
    {
        if (session.BuyerEmail == null &&
            session.BillingAddress == null &&
            session.ShippingAddress == null)
        {
            return null;
        }

        var billing = MapAddress(session.BillingAddress);
        var shipping = MapAddress(session.ShippingAddress);

        return new UcpBuyerInfoDto
        {
            Email = session.BuyerEmail,
            Phone = session.BillingAddress?.Phone ?? session.ShippingAddress?.Phone,
            BillingAddress = billing,
            ShippingAddress = shipping,
            ShippingSameAsBilling = session.ShippingSameAsBilling
        };
    }

    private static UcpAddressDto? MapAddress(CheckoutAddressState? address)
    {
        if (address == null)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(address.CountryCode) &&
            string.IsNullOrWhiteSpace(address.Email))
        {
            return null;
        }

        return new UcpAddressDto
        {
            GivenName = address.FirstName,
            FamilyName = address.LastName,
            Organization = address.Company,
            AddressLine1 = address.AddressOne,
            AddressLine2 = address.AddressTwo,
            Locality = address.TownCity,
            AdministrativeArea = address.RegionCode ?? address.CountyState,
            PostalCode = address.PostalCode,
            CountryCode = address.CountryCode,
            Phone = address.Phone
        };
    }

    private static object MapSessionLineItem(CheckoutLineItemState lineItem, string currency)
    {
        return new
        {
            id = lineItem.LineItemId,
            item = new UcpItemInfoDto
            {
                Id = lineItem.ProductId,
                Title = lineItem.Name,
                Price = lineItem.UnitPrice,
                ImageUrl = lineItem.ImageUrl,
                Url = lineItem.ProductUrl,
                Options = lineItem.SelectedOptions?
                    .Select(o => new UcpItemOptionDto { Name = o.Name, Value = o.Value })
                    .ToList()
            },
            quantity = lineItem.Quantity,
            totals = BuildTotalsArray(
                currency,
                ("subtotal", lineItem.LineTotal),
                ("discount", -Math.Abs(lineItem.DiscountAmount)),
                ("tax", lineItem.TaxAmount),
                ("total", lineItem.FinalTotal))
        };
    }

    private static object MapSessionTotals(CheckoutTotalsState totals)
    {
        if (totals.Breakdown is { Count: > 0 })
        {
            return totals.Breakdown
                .Select(b => new
                {
                    type = b.Type,
                    amount = b.Amount,
                    currency = totals.Currency
                })
                .ToList();
        }

        return BuildTotalsArray(
            totals.Currency,
            ("subtotal", totals.Subtotal),
            ("items_discount", -Math.Abs(totals.ItemsDiscount)),
            ("discount", -Math.Abs(totals.Discount)),
            ("fulfillment", totals.Fulfillment),
            ("tax", totals.Tax),
            ("total", totals.Total));
    }

    private static List<object> BuildTotalsArray(
        string currency,
        params (string Type, long Amount)[] totals)
    {
        return totals
            .Where(t => t.Amount != 0 || string.Equals(t.Type, "total", StringComparison.OrdinalIgnoreCase))
            .Select(t => (object)new
            {
                type = t.Type,
                amount = t.Amount,
                currency
            })
            .ToList();
    }

    private static object? MapSessionDiscounts(IReadOnlyList<CheckoutDiscountState> discounts)
    {
        if (discounts.Count == 0)
        {
            return null;
        }

        var codes = discounts
            .Select(d => d.Code)
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Distinct()
            .ToList();

        return new
        {
            codes = codes,
            applied = discounts.Select(d => new
            {
                id = d.DiscountId,
                code = d.Code,
                title = d.Name,
                amount = d.Amount,
                automatic = d.IsAutomatic,
                method = d.Method,
                priority = d.Priority,
                allocation = d.Allocation?.Select(a => new
                {
                    target = a.Target,
                    amount = a.Amount
                }).ToList()
            }).ToList()
        };
    }

    private static object MapSessionMessage(CheckoutMessageState message)
    {
        return new
        {
            type = message.Type,
            code = message.Code,
            path = message.Path,
            content = message.Content,
            severity = message.Severity
        };
    }

    private static object? MapSessionFulfillment(CheckoutFulfillmentState? fulfillment)
    {
        if (fulfillment == null)
        {
            return null;
        }

        return new
        {
            methods = fulfillment.Methods.Select(m => new
            {
                type = m.Type,
                line_item_ids = m.LineItemIds,
                destinations = m.Destinations?.Select(d => new
                {
                    type = d.Type,
                    address = MapAddress(d.Address)
                }).ToList(),
                groups = m.Groups.Select(g => new
                {
                    id = g.GroupId,
                    name = g.GroupName,
                    line_item_ids = g.LineItemIds,
                    selected_option_id = g.SelectedOptionId,
                    options = g.Options.Select(o => new
                    {
                        id = o.OptionId,
                        title = o.Title,
                        description = o.Description,
                        totals = new[]
                        {
                            new
                            {
                                type = "fulfillment",
                                amount = o.Amount,
                                currency = o.Currency
                            }
                        },
                        earliest_fulfillment_time = o.EarliestFulfillmentTime,
                        latest_fulfillment_time = o.LatestFulfillmentTime,
                        estimated_delivery_days = o.EstimatedDeliveryDays
                    }).ToList()
                }).ToList()
            }).ToList()
        };
    }

    private IReadOnlyList<object> BuildLegalLinks()
    {
        var links = new List<object>();
        var store = GetEffectiveStoreSettings();

        var termsUrl = NormalizeAbsoluteUrl(store.TermsUrl);
        if (!string.IsNullOrWhiteSpace(termsUrl))
        {
            links.Add(new { rel = "terms", href = termsUrl });
        }

        var privacyUrl = NormalizeAbsoluteUrl(store.PrivacyUrl);
        if (!string.IsNullOrWhiteSpace(privacyUrl))
        {
            links.Add(new { rel = "privacy", href = privacyUrl });
        }

        return links;
    }

    private string BuildAbsoluteUrl(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return string.Empty;
        }

        // On Linux, rooted paths (e.g. "/api/v1") may be parsed as absolute file URIs.
        // Treat rooted values as app-relative so they always resolve against public base URL.
        if (path.StartsWith('/'))
        {
            var rootedBaseUri = ResolvePublicBaseUri();
            return new Uri(rootedBaseUri, path).ToString().TrimEnd('/');
        }

        if (Uri.TryCreate(path, UriKind.Absolute, out var absoluteUri))
        {
            var secureBuilder = new UriBuilder(absoluteUri)
            {
                Scheme = Uri.UriSchemeHttps,
                Port = absoluteUri.Port == 80 ? 443 : absoluteUri.Port
            };
            return secureBuilder.Uri.ToString().TrimEnd('/');
        }

        var baseUri = ResolvePublicBaseUri();
        return new Uri(baseUri, path).ToString().TrimEnd('/');
    }

    private string? NormalizeAbsoluteUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return BuildAbsoluteUrl(value);
    }

    private Uri ResolvePublicBaseUri()
    {
        var ucpStore = GetEffectiveUcpStoreSettings();
        if (TryResolveConfiguredPublicBaseUri(ucpStore.PublicBaseUrl, out var dbUri))
        {
            return dbUri;
        }

        if (TryResolveConfiguredPublicBaseUri(_protocolSettings.PublicBaseUrl, out var configured))
        {
            return configured;
        }

        var store = GetEffectiveStoreSettings();
        if (TryResolveConfiguredPublicBaseUri(store.WebsiteUrl, out var storeWebsite))
        {
            return storeWebsite;
        }

        return new Uri("https://localhost");
    }

    private StoreSettings GetEffectiveStoreSettings()
    {
        var fallback = _merchelloSettings.Store ?? new StoreSettings();
        if (_storeSettingsService == null)
        {
            return fallback;
        }

        try
        {
            var runtime = _storeSettingsService.GetRuntimeSettings();
            return runtime.Merchello.Store ?? fallback;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to resolve DB-backed store settings for UCP adapter, falling back to appsettings.");
            return fallback;
        }
    }

    private static bool TryResolveConfiguredPublicBaseUri(string? configuredValue, out Uri uri)
    {
        uri = default!;
        if (string.IsNullOrWhiteSpace(configuredValue) ||
            !Uri.TryCreate(configuredValue, UriKind.Absolute, out var parsed))
        {
            return false;
        }

        var builder = new UriBuilder(parsed)
        {
            Scheme = Uri.UriSchemeHttps,
            Port = parsed.Port == 80 ? 443 : parsed.Port
        };

        uri = new Uri(builder.Uri.GetLeftPart(UriPartial.Authority).TrimEnd('/') + "/");
        return true;
    }

    // Serialize with camelCase for JSON merging so anonymous objects and DTOs use consistent casing.
    private static readonly JsonSerializerOptions _ucpMergeOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>
    /// Merges <paramref name="data"/> and <paramref name="ucp"/> metadata into a single flat JSON object
    /// so that <c>ucp</c> appears at the root level alongside the data fields, as required by the UCP spec.
    /// </summary>
    private static object MergeWithUcpMetadata(object data, UcpMetadata ucp)
    {
        var dataNode = JsonSerializer.SerializeToNode(data, _ucpMergeOptions) as JsonObject;
        if (dataNode == null)
        {
            return data;
        }

        dataNode["ucp"] = JsonSerializer.SerializeToNode(ucp, _ucpMergeOptions);
        return dataNode;
    }

    private object WrapDataInEnvelope(object data)
    {
        var ucp = new UcpMetadata
        {
            Version = _protocolSettings.Ucp.Version,
            Capabilities = GetActiveCapabilities(),
            PaymentHandlers = null
        };

        return MergeWithUcpMetadata(data, ucp);
    }

    private IReadOnlyList<UcpResponseCapability> GetActiveCapabilities()
    {
        var capabilities = new List<UcpResponseCapability>();
        var settings = GetEffectiveUcp();

        if (settings.Capabilities.Checkout)
        {
            capabilities.Add(new UcpResponseCapability { Name = UcpCapabilityNames.Checkout, Version = settings.Version });

            if (settings.Extensions.Discount)
                capabilities.Add(new UcpResponseCapability { Name = UcpExtensionNames.Discount, Version = settings.Version });
            if (settings.Extensions.Fulfillment)
                capabilities.Add(new UcpResponseCapability { Name = UcpExtensionNames.Fulfillment, Version = settings.Version });
            if (settings.Extensions.BuyerConsent)
                capabilities.Add(new UcpResponseCapability { Name = UcpExtensionNames.BuyerConsent, Version = settings.Version });
            if (settings.Extensions.Ap2Mandates)
                capabilities.Add(new UcpResponseCapability { Name = UcpExtensionNames.Ap2Mandates, Version = settings.Version });
        }

        if (settings.Capabilities.Order)
            capabilities.Add(new UcpResponseCapability { Name = UcpCapabilityNames.Order, Version = settings.Version });
        if (settings.Capabilities.IdentityLinking)
            capabilities.Add(new UcpResponseCapability { Name = UcpCapabilityNames.IdentityLinking, Version = settings.Version });

        return capabilities;
    }

    private MerchelloStoreUcpSettings GetEffectiveUcpStoreSettings()
    {
        if (_storeSettingsService == null)
        {
            return new MerchelloStoreUcpSettings();
        }

        try
        {
            return _storeSettingsService.GetRuntimeSettings().Ucp;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to resolve UCP store settings, falling back to appsettings.");
            return new MerchelloStoreUcpSettings();
        }
    }

    private UcpSettings GetEffectiveUcp()
    {
        var db = GetEffectiveUcpStoreSettings();
        var cfg = _protocolSettings.Ucp;

        return new UcpSettings
        {
            Version = cfg.Version,
            AllowedAgents = db.AllowedAgents ?? cfg.AllowedAgents,
            SigningKeyRotationDays = cfg.SigningKeyRotationDays,
            WebhookTimeoutSeconds = db.WebhookTimeoutSeconds ?? cfg.WebhookTimeoutSeconds,
            Capabilities = new UcpCapabilitySettings
            {
                Checkout = db.CapabilityCheckout ?? cfg.Capabilities.Checkout,
                Order = db.CapabilityOrder ?? cfg.Capabilities.Order,
                IdentityLinking = db.CapabilityIdentityLinking ?? cfg.Capabilities.IdentityLinking
            },
            Extensions = new UcpExtensionSettings
            {
                Discount = db.ExtensionDiscount ?? cfg.Extensions.Discount,
                Fulfillment = db.ExtensionFulfillment ?? cfg.Extensions.Fulfillment,
                BuyerConsent = db.ExtensionBuyerConsent ?? cfg.Extensions.BuyerConsent,
                Ap2Mandates = db.ExtensionAp2Mandates ?? cfg.Extensions.Ap2Mandates
            }
        };
    }
}
