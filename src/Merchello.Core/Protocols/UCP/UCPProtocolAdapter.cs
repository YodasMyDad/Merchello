using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Models;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.Payments;
using Merchello.Core.Protocols.UCP.Dtos;
using Merchello.Core.Protocols.UCP.Models;
using Merchello.Core.Protocols.Webhooks;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Protocols.UCP;

/// <summary>
/// UCP (Universal Commerce Protocol) adapter implementation.
/// Translates between UCP protocol format and Merchello's internal models.
/// </summary>
public class UCPProtocolAdapter : ICommerceProtocolAdapter
{
    private readonly ICheckoutService _checkoutService;
    private readonly ICheckoutSessionService _checkoutSessionService;
    private readonly IInvoiceService _invoiceService;
    private readonly IPaymentService _paymentService;
    private readonly IProductService _productService;
    private readonly IPaymentHandlerExporter _paymentHandlerExporter;
    private readonly ISigningKeyStore _signingKeyStore;
    private readonly ILogger<UCPProtocolAdapter> _logger;
    private readonly ProtocolSettings _protocolSettings;
    private readonly MerchelloSettings _merchelloSettings;

    public UCPProtocolAdapter(
        ICheckoutService checkoutService,
        ICheckoutSessionService checkoutSessionService,
        IInvoiceService invoiceService,
        IPaymentService paymentService,
        IProductService productService,
        IPaymentHandlerExporter paymentHandlerExporter,
        ISigningKeyStore signingKeyStore,
        ILogger<UCPProtocolAdapter> logger,
        IOptions<ProtocolSettings> protocolSettings,
        IOptions<MerchelloSettings> merchelloSettings)
    {
        _checkoutService = checkoutService;
        _checkoutSessionService = checkoutSessionService;
        _invoiceService = invoiceService;
        _paymentService = paymentService;
        _productService = productService;
        _paymentHandlerExporter = paymentHandlerExporter;
        _signingKeyStore = signingKeyStore;
        _logger = logger;
        _protocolSettings = protocolSettings.Value;
        _merchelloSettings = merchelloSettings.Value;
    }

    /// <inheritdoc />
    public CommerceProtocolAdapterMetadata Metadata => new(
        Alias: ProtocolConstants.Protocols.Ucp,
        DisplayName: "Universal Commerce Protocol",
        Version: _protocolSettings.Ucp.Version,
        Icon: "icon-globe",
        Description: "UCP enables AI agents to conduct commerce on behalf of users.",
        SupportsIdentityLinking: _protocolSettings.Ucp.Capabilities.IdentityLinking,
        SupportsOrderWebhooks: _protocolSettings.Ucp.Capabilities.Order
    );

    /// <inheritdoc />
    public bool IsEnabled => _protocolSettings.Enabled && _protocolSettings.Ucp.Enabled;

    /// <inheritdoc />
    public async Task<object> GenerateManifestAsync(CancellationToken ct = default)
    {
        var capabilities = BuildCapabilities();
        var paymentHandlers = await _paymentHandlerExporter.ExportHandlersAsync(
            ProtocolConstants.Protocols.Ucp, null, ct);
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
                            Endpoint = "/api/v1",
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
            await _checkoutService.SaveBasketAsync(basket, ct);

            // Apply buyer info if provided (updates the basket in DB)
            if (ucpRequest?.Buyer != null)
            {
                await ApplyBuyerInfoAsync(basket, ucpRequest.Buyer, ct);
            }

            // Apply discount codes if provided
            if (ucpRequest?.Discounts?.Codes != null)
            {
                var countryCode = basket.ShippingAddress?.CountryCode ?? _merchelloSettings.DefaultShippingCountry;
                foreach (var code in ucpRequest.Discounts.Codes)
                {
                    await _checkoutService.ApplyDiscountCodeAsync(basket, code, countryCode, ct);
                }
            }

            var sessionState = await _checkoutService.GetSessionStateAsync(basket.Id, ct);
            if (sessionState == null)
            {
                return ProtocolResponse.NotFound("Failed to create session");
            }

            return ProtocolResponse.Created(WrapInEnvelope(sessionState));
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

        var sessionState = await _checkoutService.GetSessionStateAsync(basketId, ct);
        if (sessionState == null)
        {
            return ProtocolResponse.NotFound($"Session '{sessionId}' not found");
        }

        return ProtocolResponse.Ok(WrapInEnvelope(sessionState));
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
            // Load the basket
            var basket = await _checkoutService.GetBasketByIdAsync(basketId, ct);
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

            // Apply buyer info if provided
            if (ucpRequest?.Buyer != null)
            {
                await ApplyBuyerInfoAsync(basket, ucpRequest.Buyer, ct);
            }

            // Apply discount codes if provided
            if (ucpRequest?.Discounts?.Codes is { Count: > 0 } codes)
            {
                var countryCode = basket.ShippingAddress?.CountryCode ?? _merchelloSettings.DefaultShippingCountry;
                foreach (var code in codes)
                {
                    await _checkoutService.ApplyDiscountCodeAsync(basket, code, countryCode, ct);
                }
            }

            // Apply fulfillment selections if provided
            if (ucpRequest?.Fulfillment?.Groups is { Count: > 0 } fulfillmentGroups)
            {
                var checkoutSession = await _checkoutSessionService.GetSessionAsync(basketId, ct);
                var selections = new Dictionary<Guid, Guid>();

                foreach (var group in fulfillmentGroups)
                {
                    if (Guid.TryParse(group.Id, out var groupId) &&
                        Guid.TryParse(group.SelectedOptionId, out var optionId))
                    {
                        selections[groupId] = optionId;
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
            await _checkoutService.SaveBasketAsync(basket, ct);

            var sessionState = await _checkoutService.GetSessionStateAsync(basketId, ct);
            if (sessionState == null)
            {
                return ProtocolResponse.NotFound($"Session '{sessionId}' not found after update");
            }

            return ProtocolResponse.Ok(WrapInEnvelope(sessionState));
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
            // Get basket
            var basket = await _checkoutService.GetBasketByIdAsync(basketId, ct);
            if (basket == null)
            {
                return ProtocolResponse.NotFound($"Session '{sessionId}' not found");
            }

            // Get session state to verify status
            var sessionState = await _checkoutService.GetSessionStateAsync(basketId, ct);
            if (sessionState == null)
            {
                return ProtocolResponse.NotFound($"Session '{sessionId}' not found");
            }

            if (sessionState.Status != ProtocolConstants.SessionStatus.ReadyForComplete)
            {
                return ProtocolResponse.BadRequest(
                    $"Session is not ready for completion. Current status: {sessionState.Status}");
            }

            // Parse payment data
            var completeRequest = paymentData as UcpCompleteSessionRequestDto;
            if (completeRequest == null || string.IsNullOrEmpty(completeRequest.PaymentHandlerId))
            {
                return ProtocolResponse.BadRequest("Payment handler ID is required");
            }

            // Parse handler ID format: "providerAlias:methodAlias"
            var handlerParts = completeRequest.PaymentHandlerId.Split(':', 2);
            var providerAlias = handlerParts[0];
            var methodAlias = handlerParts.Length > 1 ? handlerParts[1] : null;

            // Get checkout session
            var checkoutSession = await _checkoutSessionService.GetSessionAsync(basketId, ct);

            // Check for existing unpaid invoice to prevent ghost orders
            var invoice = await _invoiceService.GetUnpaidInvoiceForBasketAsync(basketId, ct);
            if (invoice == null)
            {
                // Build source tracking info from agent identity
                var source = new InvoiceSource
                {
                    Type = Constants.InvoiceSources.Ucp,
                    DisplayName = "UCP Agent",
                    SourceId = agentIdentity?.AgentId,
                    SourceName = agentIdentity?.AgentId,
                    ProfileUri = agentIdentity?.ProfileUri,
                    ProtocolVersion = _protocolSettings.Ucp.Version,
                    SessionId = sessionId
                };

                // Create invoice from basket with source tracking
                invoice = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession, source, ct);
                _logger.LogInformation(
                    "UCP: Invoice {InvoiceId} created from session {SessionId} via agent {AgentId}",
                    invoice.Id,
                    sessionId,
                    agentIdentity?.AgentId ?? "unknown");
            }

            // Build payment request
            var processRequest = new ProcessPaymentRequest
            {
                InvoiceId = invoice.Id,
                ProviderAlias = providerAlias,
                MethodAlias = methodAlias,
                PaymentMethodToken = completeRequest.PaymentInstrument?.Token,
                AuthorizationToken = completeRequest.PaymentInstrument?.Type == "wallet"
                    ? completeRequest.PaymentInstrument?.Token
                    : null,
                Amount = invoice.Total,
                CustomerEmail = basket.BillingAddress?.Email,
                IdempotencyKey = agentIdentity != null
                    ? $"ucp:{sessionId}:{agentIdentity.AgentId}"
                    : $"ucp:{sessionId}"
            };

            // Process payment
            var paymentResult = await _paymentService.ProcessPaymentAsync(processRequest, ct);

            if (!paymentResult.Successful)
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

            // Payment succeeded - delete basket
            await _checkoutService.DeleteBasket(basketId, ct);

            // Store invoice ID in session for order retrieval
            await _checkoutSessionService.SetInvoiceIdAsync(basketId, invoice.Id, ct);

            _logger.LogInformation(
                "UCP: Session {SessionId} completed. Invoice: {InvoiceId}, InvoiceNumber: {InvoiceNumber}",
                sessionId,
                invoice.Id,
                invoice.InvoiceNumber);

            // Return UCP-formatted completion response
            return ProtocolResponse.Ok(new
            {
                ucp = new
                {
                    version = _protocolSettings.Ucp.Version,
                    capabilities = GetActiveCapabilities()
                },
                id = sessionId,
                status = ProtocolConstants.SessionStatus.Completed,
                order_id = invoice.Id.ToString(),
                order_number = invoice.InvoiceNumber,
                permalink_url = $"/order/{invoice.Id}"
            });
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
            var basket = await _checkoutService.GetBasketByIdAsync(basketId, ct);
            if (basket == null)
            {
                return ProtocolResponse.NotFound($"Session '{sessionId}' not found");
            }

            await _checkoutService.DeleteBasket(basketId, ct);

            return ProtocolResponse.Ok(new
            {
                id = sessionId,
                status = ProtocolConstants.SessionStatus.Canceled
            });
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

        // Map invoice to UCP order format
        var ucpOrder = MapInvoiceToUcpOrder(invoice);

        return ProtocolResponse.Ok(new
        {
            ucp = new
            {
                version = _protocolSettings.Ucp.Version,
                capabilities = GetActiveCapabilities()
            },
            data = ucpOrder
        });
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
                quantity = li.Quantity,
                unit_price = ToMinorUnits(li.Amount),
                line_total = ToMinorUnits(li.Amount * li.Quantity)
            })
            .ToList() ?? [];

        // Map fulfillment events from shipments
        var fulfillmentEvents = invoice.Orders?
            .SelectMany(o => o.Shipments ?? [])
            .Select(s => new
            {
                id = s.Id.ToString(),
                type = "shipped",
                status = s.Status.ToString().ToLowerInvariant(),
                tracking_number = s.TrackingNumber,
                tracking_url = s.TrackingUrl,
                carrier = s.Carrier,
                shipped_at = s.ShippedDate,
                items = s.LineItems?.Select(li => new
                {
                    line_item_id = li.Id.ToString(),
                    quantity = li.Quantity
                }).ToList()
            })
            .ToList() ?? [];

        // Map adjustments (discounts, refunds)
        var adjustments = new List<object>();
        if (invoice.Discount > 0)
        {
            adjustments.Add(new
            {
                type = "discount",
                amount = -ToMinorUnits(invoice.Discount),
                description = "Order discount"
            });
        }

        return new
        {
            id = invoice.Id.ToString(),
            order_number = invoice.InvoiceNumber,
            status = paymentStatus == "paid" ? "confirmed" : "pending_payment",
            payment_status = paymentStatus,
            fulfillment_status = fulfillmentStatus,
            currency = invoice.CurrencyCode,
            created_at = invoice.DateCreated,
            updated_at = invoice.DateUpdated,
            permalink_url = $"/order/{invoice.Id}",

            buyer = new
            {
                email = invoice.BillingAddress?.Email,
                phone = invoice.BillingAddress?.Phone
            },

            billing_address = MapInvoiceAddress(invoice.BillingAddress),
            shipping_address = MapInvoiceAddress(invoice.ShippingAddress),

            line_items = lineItems,

            totals = new
            {
                subtotal = ToMinorUnits(invoice.SubTotal),
                discount = ToMinorUnits(invoice.Discount),
                tax = ToMinorUnits(invoice.Tax),
                total = ToMinorUnits(invoice.Total),
                currency = invoice.CurrencyCode
            },

            fulfillment = new
            {
                status = fulfillmentStatus,
                events = fulfillmentEvents
            },

            adjustments,

            payments = invoice.Payments?.Select(p => new
            {
                id = p.Id.ToString(),
                amount = ToMinorUnits(p.Amount),
                currency = p.CurrencyCode ?? invoice.CurrencyCode,
                method = p.PaymentProviderAlias ?? p.PaymentMethod,
                status = p.PaymentSuccess ? "succeeded" : "failed",
                created_at = p.DateCreated
            }).ToList() ?? []
        };
    }

    private static object? MapInvoiceAddress(Address? address)
    {
        if (address == null || string.IsNullOrEmpty(address.CountryCode))
        {
            return null;
        }

        var nameParts = (address.Name ?? string.Empty).Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);

        return new
        {
            given_name = nameParts.Length > 0 ? nameParts[0] : null,
            family_name = nameParts.Length > 1 ? nameParts[1] : null,
            organization = address.Company,
            address_line_1 = address.AddressOne,
            address_line_2 = address.AddressTwo,
            locality = address.TownCity,
            administrative_area = address.CountyState?.RegionCode,
            postal_code = address.PostalCode,
            country_code = address.CountryCode
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
            return "partially_fulfilled";
        }

        if (statuses.Any(s => s == OrderStatus.Processing))
        {
            return "in_progress";
        }

        return "unfulfilled";
    }

    private static string DeterminePaymentStatus(Invoice invoice)
    {
        if (invoice.Payments == null || invoice.Payments.Count == 0)
        {
            return "unpaid";
        }

        var totalPaid = invoice.Payments
            .Where(p => p.PaymentSuccess)
            .Sum(p => p.Amount);

        if (totalPaid >= invoice.Total)
        {
            return "paid";
        }

        if (totalPaid > 0)
        {
            return "partially_paid";
        }

        return "unpaid";
    }

    private static long ToMinorUnits(decimal amount) => (long)Math.Round(amount * 100);

    /// <inheritdoc />
    public async Task<object> GetPaymentHandlersAsync(
        string? sessionId,
        CancellationToken ct = default)
    {
        return await _paymentHandlerExporter.ExportHandlersAsync(
            ProtocolConstants.Protocols.Ucp, sessionId, ct);
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

    private async Task AddLineItemToBasketAsync(Basket basket, UcpLineItemRequestDto lineItem, CancellationToken ct)
    {
        if (lineItem.Item?.Id == null) return;

        // Try to parse item.id as a product GUID
        var itemId = lineItem.Item.Id;
        if (!Guid.TryParse(itemId, out var productId))
        {
            _logger.LogWarning("UCP line item id '{ItemId}' is not a valid product GUID", itemId);
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
            return;
        }

        // Create line item from product
        var newLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            Sku = product.Sku ?? string.Empty,
            Name = product.Name ?? product.ProductRoot?.RootName ?? lineItem.Item?.Title ?? "Unknown Product",
            Quantity = lineItem.Quantity,
            Amount = product.Price,
            IsTaxable = (product.ProductRoot?.TaxGroupId ?? Guid.Empty) != Guid.Empty
        };

        var countryCode = basket.ShippingAddress?.CountryCode ?? _merchelloSettings.DefaultShippingCountry ?? "US";
        await _checkoutService.AddToBasketAsync(basket, newLineItem, countryCode, ct);
    }

    private async Task ApplyBuyerInfoAsync(Basket basket, UcpBuyerInfoDto buyer, CancellationToken ct)
    {
        // Map UCP addresses to Merchello format
        var billingAddress = MapUcpAddressToCheckoutAddress(buyer.BillingAddress);
        var shippingAddress = buyer.ShippingSameAsBilling == true
            ? billingAddress
            : MapUcpAddressToCheckoutAddress(buyer.ShippingAddress);

        if (billingAddress != null || shippingAddress != null || !string.IsNullOrEmpty(buyer.Email))
        {
            var result = await _checkoutService.SaveAddressesAsync(new SaveAddressesParameters
            {
                Basket = basket,
                Email = buyer.Email ?? string.Empty,
                BillingAddress = billingAddress ?? new CheckoutAddressDto(),
                ShippingAddress = shippingAddress,
                ShippingSameAsBilling = buyer.ShippingSameAsBilling ?? false
            }, ct);

            if (!result.Successful)
            {
                var errors = result.Messages.Where(m => m.ResultMessageType == ResultMessageType.Error);
                var errorMessages = string.Join(", ", errors.Select(m => m.Message));
                _logger.LogWarning("Failed to save addresses for UCP session: {Error}", errorMessages);
            }
        }
    }

    private static CheckoutAddressDto? MapUcpAddressToCheckoutAddress(UcpAddressDto? ucpAddress)
    {
        if (ucpAddress == null) return null;

        var nameParts = new List<string>();
        if (!string.IsNullOrEmpty(ucpAddress.GivenName)) nameParts.Add(ucpAddress.GivenName);
        if (!string.IsNullOrEmpty(ucpAddress.FamilyName)) nameParts.Add(ucpAddress.FamilyName);
        var name = nameParts.Count > 0 ? string.Join(" ", nameParts) : null;

        return new CheckoutAddressDto
        {
            Name = name,
            Company = ucpAddress.Organization,
            Address1 = ucpAddress.AddressLine1,
            Address2 = ucpAddress.AddressLine2,
            City = ucpAddress.Locality,
            State = ucpAddress.AdministrativeArea,
            StateCode = ucpAddress.AdministrativeArea,
            PostalCode = ucpAddress.PostalCode,
            CountryCode = ucpAddress.CountryCode,
            Phone = ucpAddress.Phone
        };
    }

    #endregion

    private List<UcpCapability> BuildCapabilities()
    {
        var capabilities = new List<UcpCapability>();
        var settings = _protocolSettings.Ucp;

        if (settings.Capabilities.Checkout)
        {
            capabilities.Add(new UcpCapability
            {
                Name = ProtocolConstants.UcpCapabilities.Checkout,
                Version = settings.Version,
                Spec = "https://ucp.dev/specifications/checkout.md",
                Schema = "https://ucp.dev/schemas/shopping/checkout.json"
            });

            // Add extensions that extend Checkout
            if (settings.Extensions.Discount)
            {
                capabilities.Add(new UcpCapability
                {
                    Name = ProtocolConstants.UcpExtensions.Discount,
                    Version = settings.Version,
                    Spec = "https://ucp.dev/specifications/discount.md",
                    Schema = "https://ucp.dev/schemas/shopping/discount.json",
                    Extends = ProtocolConstants.UcpCapabilities.Checkout
                });
            }

            if (settings.Extensions.Fulfillment)
            {
                capabilities.Add(new UcpCapability
                {
                    Name = ProtocolConstants.UcpExtensions.Fulfillment,
                    Version = settings.Version,
                    Spec = "https://ucp.dev/specifications/fulfillment.md",
                    Schema = "https://ucp.dev/schemas/shopping/fulfillment.json",
                    Extends = ProtocolConstants.UcpCapabilities.Checkout
                });
            }

            if (settings.Extensions.BuyerConsent)
            {
                capabilities.Add(new UcpCapability
                {
                    Name = ProtocolConstants.UcpExtensions.BuyerConsent,
                    Version = settings.Version,
                    Spec = "https://ucp.dev/specifications/buyer-consent.md",
                    Schema = "https://ucp.dev/schemas/shopping/buyer-consent.json",
                    Extends = ProtocolConstants.UcpCapabilities.Checkout
                });
            }
        }

        if (settings.Capabilities.Order)
        {
            capabilities.Add(new UcpCapability
            {
                Name = ProtocolConstants.UcpCapabilities.Order,
                Version = settings.Version,
                Spec = "https://ucp.dev/specifications/order.md",
                Schema = "https://ucp.dev/schemas/shopping/order.json"
            });
        }

        if (settings.Capabilities.IdentityLinking)
        {
            capabilities.Add(new UcpCapability
            {
                Name = ProtocolConstants.UcpCapabilities.IdentityLinking,
                Version = settings.Version,
                Spec = "https://ucp.dev/specifications/identity-linking.md",
                Schema = "https://ucp.dev/schemas/common/identity-linking.json"
            });
        }

        return capabilities;
    }

    private object WrapInEnvelope(CheckoutSessionState session)
    {
        return new ProtocolResponseEnvelope
        {
            Ucp = new UcpMetadata
            {
                Version = _protocolSettings.Ucp.Version,
                Capabilities = GetActiveCapabilities()
            },
            Data = session
        };
    }

    private IReadOnlyList<string> GetActiveCapabilities()
    {
        var capabilities = new List<string>();
        var settings = _protocolSettings.Ucp;

        if (settings.Capabilities.Checkout)
        {
            capabilities.Add(ProtocolConstants.UcpCapabilities.Checkout);

            if (settings.Extensions.Discount)
                capabilities.Add(ProtocolConstants.UcpExtensions.Discount);
            if (settings.Extensions.Fulfillment)
                capabilities.Add(ProtocolConstants.UcpExtensions.Fulfillment);
        }

        if (settings.Capabilities.Order)
            capabilities.Add(ProtocolConstants.UcpCapabilities.Order);

        return capabilities;
    }
}
