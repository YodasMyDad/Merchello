using System.Net;
using System.Text.Json;
using Merchello.Core;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Notifications.Shipment;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.UCP.Handlers;
using Merchello.Core.Protocols.Webhooks;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Models;
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
    private readonly Mock<ILogger<UcpOrderWebhookHandler>> _loggerMock;
    private readonly UcpOrderWebhookHandler _handler;
    private readonly MockHttpMessageHandler _mockHandler;
    private readonly ProtocolSettings _settings;

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
        _loggerMock = new Mock<ILogger<UcpOrderWebhookHandler>>();

        _mockHandler = new MockHttpMessageHandler();
        var httpClient = new HttpClient(_mockHandler);
        _httpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);

        _signingKeyStoreMock.Setup(x => x.GetCurrentKeyId()).Returns("test-key-id");
        _webhookSignerMock.Setup(x => x.Sign(It.IsAny<string>(), It.IsAny<string>())).Returns("test-signature");

        _settings = new ProtocolSettings
        {
            Enabled = true,
            Ucp = new UcpSettings
            {
                Enabled = true,
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
    public async Task HandleAsync_OrderStatusChanged_DoesNotSendWhenProtocolDisabled()
    {
        // Arrange
        _settings.Enabled = false;

        var order = CreateOrder(Guid.NewGuid());
        var notification = new OrderStatusChangedNotification(order, OrderStatus.Pending, OrderStatus.Shipped);

        // Act
        await _handler.HandleAsync(notification, CancellationToken.None);

        // Assert
        _mockHandler.ReceivedRequests.Count.ShouldBe(0);
        _invoiceServiceMock.Verify(x => x.GetInvoiceAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
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

        var shipment = new Shipment { OrderId = orderId, Status = ShipmentStatus.Shipped };
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

        var shipment = new Shipment { OrderId = orderId, Status = ShipmentStatus.Shipped };
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

        var shipment = new Shipment { OrderId = orderId, Status = ShipmentStatus.Delivered };
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
        var shipment = new Shipment { OrderId = orderId, Status = ShipmentStatus.Shipped }; // Not delivered
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
            new LineItem
            {
                Id = Guid.NewGuid(),
                ProductId = Guid.NewGuid(),
                Sku = "TEST-SKU",
                Name = "Test Product",
                Quantity = 2,
                Amount = 19.99m,
                LineItemType = LineItemType.Product
            }
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
    }

    #endregion

    #region Helper Methods

    private static Order CreateOrder(Guid orderId)
    {
        var invoiceId = Guid.NewGuid();
        return new Order
        {
            Id = orderId,
            InvoiceId = invoiceId,
            Status = OrderStatus.Pending,
            LineItems = []
        };
    }

    private static Invoice CreateUcpInvoiceWithWebhookUrl(Order order, string webhookUrl)
    {
        return new Invoice
        {
            Id = order.InvoiceId,
            Source = new InvoiceSource
            {
                Type = Constants.InvoiceSources.Ucp,
                SessionId = "test-session-id",
                Metadata = new Dictionary<string, object>
                {
                    [Constants.UcpMetadataKeys.WebhookUrl] = webhookUrl
                }
            },
            Orders = [order],
            SubTotal = 100m,
            Tax = 10m,
            Total = 110m
        };
    }

    private static Invoice CreateUcpInvoiceWithoutWebhookUrl(Order order)
    {
        return new Invoice
        {
            Id = order.InvoiceId,
            Source = new InvoiceSource
            {
                Type = Constants.InvoiceSources.Ucp,
                SessionId = "test-session-id",
                Metadata = new Dictionary<string, object>() // No webhook URL
            },
            Orders = [order],
            SubTotal = 100m,
            Tax = 10m,
            Total = 110m
        };
    }

    private static Invoice CreateWebInvoice(Order order)
    {
        return new Invoice
        {
            Id = order.InvoiceId,
            Source = new InvoiceSource
            {
                Type = Constants.InvoiceSources.Web // Not UCP
            },
            Orders = [order],
            SubTotal = 100m,
            Tax = 10m,
            Total = 110m
        };
    }

    /// <summary>
    /// Mock HTTP message handler for testing webhook delivery.
    /// Captures request content before disposal for later inspection.
    /// </summary>
    private class MockHttpMessageHandler : HttpMessageHandler
    {
        public HttpStatusCode ResponseStatusCode { get; set; } = HttpStatusCode.OK;
        public string ResponseContent { get; set; } = "{}";
        public Exception? ExceptionToThrow { get; set; }
        public List<HttpRequestMessage> ReceivedRequests { get; } = [];
        public List<string> CapturedRequestBodies { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            ReceivedRequests.Add(request);

            // Capture request body before it gets disposed
            if (request.Content != null)
            {
                var body = await request.Content.ReadAsStringAsync(cancellationToken);
                CapturedRequestBodies.Add(body);
            }

            if (ExceptionToThrow != null)
            {
                throw ExceptionToThrow;
            }

            var response = new HttpResponseMessage(ResponseStatusCode)
            {
                Content = new StringContent(ResponseContent)
            };
            return response;
        }
    }

    #endregion
}
