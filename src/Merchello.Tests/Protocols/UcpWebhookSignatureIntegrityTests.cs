using Merchello.Core;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.Notifications;
using Merchello.Core.Protocols.UCP.Handlers;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

public class UcpWebhookSignatureIntegrityTests
{
    [Fact]
    public async Task ModifiedPayload_IsResigned_AndSignatureMatchesSentBytes()
    {
        var invoiceService = new Mock<IInvoiceService>();
        var paymentService = new Mock<IPaymentService>();
        var webhookSigner = new Mock<IWebhookSigner>();
        var signingKeyStore = new Mock<ISigningKeyStore>();
        var notificationPublisher = new Mock<IMerchelloNotificationPublisher>();
        var httpClientFactory = new Mock<IHttpClientFactory>();
        var logger = new Mock<ILogger<UcpOrderWebhookHandler>>();
        var httpHandler = new MockHttpMessageHandler();
        httpClientFactory.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(new HttpClient(httpHandler));

        paymentService
            .Setup(x => x.CalculatePaymentStatus(It.IsAny<CalculatePaymentStatusParameters>()))
            .Returns(new PaymentStatusDetails { Status = InvoicePaymentStatus.AwaitingPayment });

        var invoiceId = Guid.NewGuid();
        var order = new Order
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoiceId,
            Status = OrderStatus.Processing,
            LineItems = []
        };

        var invoice = new Invoice
        {
            Id = invoiceId,
            InvoiceNumber = "INV-UCP-001",
            CurrencyCode = "USD",
            SubTotal = 10m,
            Tax = 1m,
            Total = 11m,
            Source = new InvoiceSource
            {
                Type = Constants.InvoiceSources.Ucp,
                SessionId = "sess-1",
                Metadata = new Dictionary<string, object>
                {
                    [Constants.UcpMetadataKeys.WebhookUrl] = "https://agent.example.com/webhook"
                }
            },
            Orders = [order],
            Payments = []
        };

        invoiceService.Setup(x => x.GetInvoiceAsync(invoiceId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(invoice);

        const string modifiedPayload = "{\"modified\":true}";
        notificationPublisher
            .Setup(x => x.PublishCancelableAsync(It.IsAny<ProtocolWebhookSendingNotification>(), It.IsAny<CancellationToken>()))
            .Callback<ProtocolWebhookSendingNotification, CancellationToken>((notification, _) =>
            {
                notification.ModifiedPayload = modifiedPayload;
            })
            .ReturnsAsync(false);
        notificationPublisher
            .Setup(x => x.PublishAsync(It.IsAny<ProtocolWebhookSentNotification>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        signingKeyStore
            .Setup(x => x.GetCurrentKeyIdAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync("kid-1");
        webhookSigner
            .Setup(x => x.SignAsync(It.IsAny<string>(), "kid-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((string payload, string _, CancellationToken _) => payload == modifiedPayload ? "sig-modified" : "sig-original");

        var handler = new UcpOrderWebhookHandler(
            invoiceService.Object,
            paymentService.Object,
            webhookSigner.Object,
            signingKeyStore.Object,
            httpClientFactory.Object,
            notificationPublisher.Object,
            Options.Create(new ProtocolSettings
            {
                Ucp = new UcpSettings
                {
                    Version = "2026-01-23",
                    WebhookTimeoutSeconds = 30,
                    Capabilities = new UcpCapabilitySettings
                    {
                        Order = true
                    }
                }
            }),
            logger.Object);

        await handler.HandleAsync(new OrderStatusChangedNotification(order, OrderStatus.Pending, OrderStatus.Shipped), CancellationToken.None);

        httpHandler.ReceivedRequests.Count.ShouldBe(1);
        httpHandler.CapturedRequestBodies.Count.ShouldBe(1);
        httpHandler.CapturedRequestBodies[0].ShouldBe(modifiedPayload);
        httpHandler.ReceivedRequests[0].Headers.GetValues("Request-Signature").First().ShouldBe("sig-modified");

        webhookSigner.Verify(
            x => x.SignAsync(modifiedPayload, "kid-1", It.IsAny<CancellationToken>()),
            Times.Once);
        webhookSigner.Verify(
            x => x.SignAsync(It.Is<string>(payload => payload != modifiedPayload), "kid-1", It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
