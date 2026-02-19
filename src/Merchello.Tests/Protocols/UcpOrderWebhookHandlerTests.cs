using System.Net;
using System.Text.Json;
using Merchello.Core;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Notifications.Shipment;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.UCP.Handlers;
using Merchello.Core.Protocols.Webhooks;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Locality.Factories;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

/// <summary>
/// Tests for UcpOrderWebhookHandler - sending signed webhooks to UCP agents.
/// </summary>
public class UcpOrderWebhookHandlerTests
{
    private readonly Mock<IInvoiceService> _invoiceServiceMock;
    private readonly Mock<IPaymentService> _paymentServiceMock;
    private readonly Mock<IWebhookSigner> _webhookSignerMock;
    private readonly Mock<ISigningKeyStore> _signingKeyStoreMock;
    private readonly Mock<IHttpClientFactory> _httpClientFactoryMock;
    private readonly Mock<IMerchelloNotificationPublisher> _notificationPublisherMock;
    private readonly Mock<ILogger<UcpOrderWebhookHandler>> _loggerMock;
    private readonly UcpOrderWebhookHandler _handler;
    private readonly MockHttpMessageHandler _mockHandler;
    private readonly ProtocolSettings _settings;
    private readonly ICurrencyService _currencyService;
    private readonly InvoiceFactory _invoiceFactory;
    private readonly OrderFactory _orderFactory = new();
    private readonly LineItemFactory _lineItemFactory;
    private readonly ShipmentFactory _shipmentFactory = new();
    private readonly AddressFactory _addressFactory = new();

    public UcpOrderWebhookHandlerTests()
    {
        _invoiceServiceMock = new Mock<IInvoiceService>();
        _paymentServiceMock = new Mock<IPaymentService>();
        _paymentServiceMock
            .Setup(x => x.CalculatePaymentStatus(It.IsAny<CalculatePaymentStatusParameters>()))
            .Returns(new PaymentStatusDetails { Status = InvoicePaymentStatus.AwaitingPayment });
        _webhookSignerMock = new Mock<IWebhookSigner>();
        _signingKeyStoreMock = new Mock<ISigningKeyStore>();
        _httpClientFactoryMock = new Mock<IHttpClientFactory>();
        _notificationPublisherMock = new Mock<IMerchelloNotificationPublisher>();
        _loggerMock = new Mock<ILogger<UcpOrderWebhookHandler>>();

        var currencyService = new CurrencyService(Options.Create(new MerchelloSettings
        {
            DefaultRounding = MidpointRounding.AwayFromZero,
            StoreCurrencyCode = "USD"
        }));
        _currencyService = currencyService;
        _invoiceFactory = new InvoiceFactory(currencyService);
        _lineItemFactory = new LineItemFactory(currencyService);

        _mockHandler = new MockHttpMessageHandler();
        var httpClient = new HttpClient(_mockHandler);
        _httpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);

        _signingKeyStoreMock.Setup(x => x.GetCurrentKeyIdAsync(It.IsAny<CancellationToken>())).ReturnsAsync("test-key-id");
        _webhookSignerMock.Setup(x => x.SignAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync("test-signature");

        _settings = new ProtocolSettings
        {
            Ucp = new UcpSettings
            {
                Version = "2026-01-11",
                WebhookTimeoutSeconds = 30,
                Capabilities = new UcpCapabilitySettings { Order = true }
            }
        };

        _handler = new UcpOrderWebhookHandler(
            _invoiceServiceMock.Object,
            _paymentServiceMock.Object,
            _webhookSignerMock.Object,
            _signingKeyStoreMock.Object,
            _httpClientFactoryMock.Object,
            _notificationPublisherMock.Object,
            Options.Create(_settings),
            _loggerMock.Object);
    }

    #region OrderStatusChangedNotification Tests

    [Fact]
    public async Task HandleAsync_OrderStatusChanged_SendsWebhookForUcpOrder()
    {
        // Arrange
        var order = CreateOrder(Guid.NewGuid());
        var invoice = CreateUcpInvoiceWithWebhookUrl(order, "https://agent.example.com/webhooks/orders");
        _invoiceServiceMock.Setup(x => x.GetInvoiceAsync(order.InvoiceId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(invoice);

        var notification = new OrderStatusChangedNotification(order, OrderStatus.Pending, OrderStatus.Shipped);

        // Act
        await _handler.HandleAsync(notification, CancellationToken.None);

        // Assert
        _mockHandler.ReceivedRequests.Count.ShouldBe(1);
        var request = _mockHandler.ReceivedRequests[0];
        request.RequestUri!.ToString().ShouldBe("https://agent.example.com/webhooks/orders");
        request.Headers.GetValues("Request-Signature").First().ShouldBe("test-signature");
        request.Headers.GetValues("X-UCP-Event").First().ShouldBe("order.shipped");
    }

    [Fact]
    public async Task HandleAsync_OrderStatusChanged_DoesNotSendForNonUcpOrder()
    {
        // Arrange
        var order = CreateOrder(Guid.NewGuid());
        var invoice = CreateWebInvoice(order); // Not a UCP order
        _invoiceServiceMock.Setup(x => x.GetInvoiceAsync(order.InvoiceId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(invoice);

        var notification = new OrderStatusChangedNotification(order, OrderStatus.Pending, OrderStatus.Shipped);

        // Act
        await _handler.HandleAsync(notification, CancellationToken.None);

        // Assert
        _mockHandler.ReceivedRequests.Count.ShouldBe(0);
    }

    [Fact]
    public async Task HandleAsync_OrderStatusChanged_DoesNotSendWhenNoWebhookUrl()
    {
        // Arrange
        var order = CreateOrder(Guid.NewGuid());
        var invoice = CreateUcpInvoiceWithoutWebhookUrl(order);
        _invoiceServiceMock.Setup(x => x.GetInvoiceAsync(order.InvoiceId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(invoice);

        var notification = new OrderStatusChangedNotification(order, OrderStatus.Pending, OrderStatus.Shipped);

        // Act
        await _handler.HandleAsync(notification, CancellationToken.None);

        // Assert
        _mockHandler.ReceivedRequests.Count.ShouldBe(0);
    }

    [Fact]
    public async Task HandleAsync_OrderStatusChanged_DoesNotBreakOnWebhookFailure()
    {
        // Arrange
        var order = CreateOrder(Guid.NewGuid());
        var invoice = CreateUcpInvoiceWithWebhookUrl(order, "https://agent.example.com/webhooks/orders");
        _invoiceServiceMock.Setup(x => x.GetInvoiceAsync(order.InvoiceId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(invoice);

        _mockHandler.ResponseStatusCode = HttpStatusCode.InternalServerError;

        var notification = new OrderStatusChangedNotification(order, OrderStatus.Pending, OrderStatus.Shipped);

        // Act - should not throw
        await _handler.HandleAsync(notification, CancellationToken.None);

        // Assert - request was still attempted
        _mockHandler.ReceivedRequests.Count.ShouldBe(1);
    }

    [Fact]
    public async Task HandleAsync_OrderStatusChanged_DoesNotBreakOnHttpException()
    {
        // Arrange
        var order = CreateOrder(Guid.NewGuid());
        var invoice = CreateUcpInvoiceWithWebhookUrl(order, "https://agent.example.com/webhooks/orders");
        _invoiceServiceMock.Setup(x => x.GetInvoiceAsync(order.InvoiceId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(invoice);

        _mockHandler.ExceptionToThrow = new HttpRequestException("Connection refused");

        var notification = new OrderStatusChangedNotification(order, OrderStatus.Pending, OrderStatus.Shipped);

        // Act - should not throw
        await _handler.HandleAsync(notification, CancellationToken.None);

        // Assert - exception was handled gracefully
        _mockHandler.ReceivedRequests.Count.ShouldBe(1);
    }

    #endregion

    #region ShipmentCreatedNotification Tests

    [Fact]
    public async Task HandleAsync_ShipmentCreated_SendsWebhook()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var order = CreateOrder(orderId);
        var invoice = CreateUcpInvoiceWithWebhookUrl(order, "https://agent.example.com/webhooks/orders");

        _invoiceServiceMock.Setup(x => x.GetOrderWithDetailsAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(order);
        _invoiceServiceMock.Setup(x => x.GetInvoiceAsync(order.InvoiceId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(invoice);

        var shipment = CreateShipment(order, ShipmentStatus.Shipped);
        var notification = new ShipmentCreatedNotification(shipment);

        // Act
        await _handler.HandleAsync(notification, CancellationToken.None);

        // Assert
        _mockHandler.ReceivedRequests.Count.ShouldBe(1);
        _mockHandler.ReceivedRequests[0].Headers.GetValues("X-UCP-Event").First().ShouldBe("order.shipped");
    }

    [Fact]
    public async Task HandleAsync_ShipmentCreated_DoesNotSendWhenOrderNotFound()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        _invoiceServiceMock.Setup(x => x.GetOrderWithDetailsAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Order?)null);

        var shipment = CreateShipment(orderId, ShipmentStatus.Shipped);
        var notification = new ShipmentCreatedNotification(shipment);

        // Act
        await _handler.HandleAsync(notification, CancellationToken.None);

        // Assert
        _mockHandler.ReceivedRequests.Count.ShouldBe(0);
    }

    #endregion

    #region ShipmentSavedNotification Tests

    [Fact]
    public async Task HandleAsync_ShipmentDelivered_SendsWebhook()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var order = CreateOrder(orderId);
        var invoice = CreateUcpInvoiceWithWebhookUrl(order, "https://agent.example.com/webhooks/orders");

        _invoiceServiceMock.Setup(x => x.GetOrderWithDetailsAsync(orderId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(order);
        _invoiceServiceMock.Setup(x => x.GetInvoiceAsync(order.InvoiceId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(invoice);

        var shipment = CreateShipment(order, ShipmentStatus.Delivered);
        var notification = new ShipmentSavedNotification(shipment);

        // Act
        await _handler.HandleAsync(notification, CancellationToken.None);

        // Assert
        _mockHandler.ReceivedRequests.Count.ShouldBe(1);
        _mockHandler.ReceivedRequests[0].Headers.GetValues("X-UCP-Event").First().ShouldBe("order.delivered");
    }

    [Fact]
    public async Task HandleAsync_ShipmentNotDelivered_DoesNotSendWebhook()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var shipment = CreateShipment(orderId, ShipmentStatus.Shipped); // Not delivered
        var notification = new ShipmentSavedNotification(shipment);

        // Act
        await _handler.HandleAsync(notification, CancellationToken.None);

        // Assert
        _mockHandler.ReceivedRequests.Count.ShouldBe(0);
        _invoiceServiceMock.Verify(x => x.GetOrderWithDetailsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    #endregion

    #region Event Type Mapping Tests

    [Theory]
    [InlineData(OrderStatus.Pending, OrderStatus.Processing, "order.processing")]
    [InlineData(OrderStatus.Processing, OrderStatus.Shipped, "order.shipped")]
    [InlineData(OrderStatus.Shipped, OrderStatus.Completed, "order.delivered")]
    [InlineData(OrderStatus.Processing, OrderStatus.Cancelled, "order.cancelled")]
    [InlineData(OrderStatus.Pending, OrderStatus.OnHold, "order.updated")]
    public async Task HandleAsync_MapsEventTypeCorrectly(OrderStatus oldStatus, OrderStatus newStatus, string expectedEvent)
    {
        // Arrange
        var order = CreateOrder(Guid.NewGuid());
        var invoice = CreateUcpInvoiceWithWebhookUrl(order, "https://agent.example.com/webhooks/orders");
        _invoiceServiceMock.Setup(x => x.GetInvoiceAsync(order.InvoiceId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(invoice);

        var notification = new OrderStatusChangedNotification(order, oldStatus, newStatus);

        // Act
        await _handler.HandleAsync(notification, CancellationToken.None);

        // Assert
        _mockHandler.ReceivedRequests.Count.ShouldBe(1);
        _mockHandler.ReceivedRequests[0].Headers.GetValues("X-UCP-Event").First().ShouldBe(expectedEvent);
    }

    #endregion

    #region Payload Tests

    [Fact]
    public async Task HandleAsync_PayloadContainsRequiredFields()
    {
        // Arrange
        var order = CreateOrder(Guid.NewGuid());
        order.LineItems =
        [
            CreateProductLineItem(order.Id, "TEST-SKU", "Test Product", 2, 19.99m)
        ];

        var invoice = CreateUcpInvoiceWithWebhookUrl(order, "https://agent.example.com/webhooks/orders");
        invoice.SubTotal = 39.98m;
        invoice.Tax = 4.00m;
        invoice.Total = 43.98m;

        _invoiceServiceMock.Setup(x => x.GetInvoiceAsync(order.InvoiceId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(invoice);

        var notification = new OrderStatusChangedNotification(order, OrderStatus.Pending, OrderStatus.Shipped);

        // Act
        await _handler.HandleAsync(notification, CancellationToken.None);

        // Assert
        _mockHandler.ReceivedRequests.Count.ShouldBe(1);
        _mockHandler.CapturedRequestBodies.Count.ShouldBe(1);
        var content = _mockHandler.CapturedRequestBodies[0];
        var payload = JsonDocument.Parse(content);

        payload.RootElement.GetProperty("ucp").GetProperty("version").GetString().ShouldBe("2026-01-11");
        payload.RootElement.GetProperty("event").GetString().ShouldBe("order.shipped");
        payload.RootElement.GetProperty("id").GetString().ShouldBe(invoice.Id.ToString());
        payload.RootElement.GetProperty("totals").GetProperty("subtotal").GetInt64().ShouldBe(3998);
        payload.RootElement.GetProperty("totals").GetProperty("tax").GetInt64().ShouldBe(400);
        payload.RootElement.GetProperty("totals").GetProperty("total").GetInt64().ShouldBe(4398);

        // UCP Order spec: event_id (unique per event) and created_time (RFC 3339) are required at root
        payload.RootElement.TryGetProperty("event_id", out var eventId).ShouldBeTrue();
        Guid.TryParse(eventId.GetString(), out _).ShouldBeTrue();
        payload.RootElement.TryGetProperty("created_time", out var createdTime).ShouldBeTrue();
        DateTimeOffset.TryParse(createdTime.GetString(), out _).ShouldBeTrue();
    }

    #endregion

    #region Helper Methods

    private Order CreateOrder(Guid orderId)
    {
        var order = _orderFactory.Create(
            invoiceId: Guid.NewGuid(),
            warehouseId: Guid.NewGuid(),
            shippingOptionId: Guid.NewGuid(),
            status: OrderStatus.Pending);
        order.Id = orderId;
        order.LineItems ??= [];
        return order;
    }

    private Invoice CreateUcpInvoiceWithWebhookUrl(Order order, string webhookUrl)
    {
        return CreateInvoiceForOrder(order, new InvoiceSource
        {
            Type = Constants.InvoiceSources.Ucp,
            SessionId = "test-session-id",
            Metadata = new Dictionary<string, object>
            {
                [Constants.UcpMetadataKeys.WebhookUrl] = webhookUrl
            }
        });
    }

    private Invoice CreateUcpInvoiceWithoutWebhookUrl(Order order)
    {
        return CreateInvoiceForOrder(order, new InvoiceSource
        {
            Type = Constants.InvoiceSources.Ucp,
            SessionId = "test-session-id",
            Metadata = new Dictionary<string, object>() // No webhook URL
        });
    }

    private Invoice CreateWebInvoice(Order order)
    {
        return CreateInvoiceForOrder(order, new InvoiceSource
        {
            Type = Constants.InvoiceSources.Web // Not UCP
        });
    }

    private Invoice CreateInvoiceForOrder(Order order, InvoiceSource source)
    {
        var billingAddress = _addressFactory.CreateFromFormData(
            firstName: "Test",
            lastName: "Customer",
            address1: "123 Test St",
            address2: null,
            city: "Test City",
            postalCode: "10001",
            countryCode: "US",
            regionCode: null,
            phone: null,
            email: "test@example.com");

        var shippingAddress = _addressFactory.CreateFromFormData(
            firstName: "Test",
            lastName: "Customer",
            address1: "123 Test St",
            address2: null,
            city: "Test City",
            postalCode: "10001",
            countryCode: "US",
            regionCode: null,
            phone: null,
            email: "test@example.com");

        var invoice = _invoiceFactory.CreateManual(
            invoiceNumber: $"INV-{Guid.NewGuid():N}"[..6],
            customerId: Guid.NewGuid(),
            billingAddress: billingAddress,
            shippingAddress: shippingAddress,
            currencyCode: "USD",
            subTotal: 100m,
            tax: 10m,
            total: 110m);

        invoice.Id = order.InvoiceId;
        invoice.Source = source;
        invoice.Orders = [order];
        order.InvoiceId = invoice.Id;
        order.Invoice = invoice;
        return invoice;
    }

    private Shipment CreateShipment(Order order, ShipmentStatus status)
    {
        var address = _addressFactory.CreateFromFormData(
            firstName: "Test",
            lastName: "Customer",
            address1: "123 Test St",
            address2: null,
            city: "Test City",
            postalCode: "10001",
            countryCode: "US",
            regionCode: null,
            phone: null,
            email: "test@example.com");

        var shipment = _shipmentFactory.Create(order, Guid.NewGuid(), address);
        shipment.Status = status;
        return shipment;
    }

    private Shipment CreateShipment(Guid orderId, ShipmentStatus status)
    {
        var order = CreateOrder(orderId);
        return CreateShipment(order, status);
    }

    private LineItem CreateProductLineItem(Guid orderId, string sku, string name, int quantity, decimal amount)
    {
        var lineItem = LineItemFactory.CreateCustomLineItem(
            orderId: orderId,
            name: name,
            sku: sku,
            amount: amount,
            cost: 0m,
            quantity: quantity,
            isTaxable: false,
            taxRate: 0m);
        lineItem.LineItemType = LineItemType.Product;
        lineItem.ProductId = Guid.NewGuid();
        return lineItem;
    }

    #endregion
}
