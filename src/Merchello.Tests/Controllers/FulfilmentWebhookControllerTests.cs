using System.Text;
using Merchello.Controllers;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Controllers;

public class FulfilmentWebhookControllerTests
{
    [Fact]
    public async Task HandleWebhook_DuplicateEvent_ReturnsAlreadyProcessedWithoutProviderProcessing()
    {
        // Arrange
        var config = new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            IsEnabled = true
        };

        var providerMock = new Mock<IFulfilmentProvider>();
        providerMock.SetupGet(x => x.Metadata).Returns(new FulfilmentProviderMetadata
        {
            Key = "shipbob",
            DisplayName = "ShipBob",
            SupportsWebhooks = true
        });
        providerMock
            .Setup(x => x.ValidateWebhookAsync(It.IsAny<HttpRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var providerManagerMock = new Mock<IFulfilmentProviderManager>();
        providerManagerMock
            .Setup(x => x.GetProviderAsync("shipbob", false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RegisteredFulfilmentProvider(providerMock.Object, config));

        var fulfilmentServiceMock = new Mock<IFulfilmentService>();
        fulfilmentServiceMock
            .Setup(x => x.TryLogWebhookAsync(config.Id, It.IsAny<string>(), null, It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var controller = new FulfilmentWebhookController(
            providerManagerMock.Object,
            fulfilmentServiceMock.Object,
            NullLogger<FulfilmentWebhookController>.Instance);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = BuildHttpContext("""{"topic":"order.shipped"}""", new Dictionary<string, string>
            {
                ["webhook-id"] = "msg-123"
            })
        };

        // Act
        var result = await controller.HandleWebhook("shipbob", CancellationToken.None);

        // Assert
        result.ShouldBeOfType<OkObjectResult>();
        providerMock.Verify(x => x.ProcessWebhookAsync(It.IsAny<HttpRequest>(), It.IsAny<CancellationToken>()), Times.Never);
        fulfilmentServiceMock.Verify(x => x.TryLogWebhookAsync(config.Id, "msg-123", null, It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleWebhook_NewEvent_ProcessesStatusAndShipmentUpdates()
    {
        // Arrange
        var config = new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            IsEnabled = true
        };

        var providerMock = new Mock<IFulfilmentProvider>();
        providerMock.SetupGet(x => x.Metadata).Returns(new FulfilmentProviderMetadata
        {
            Key = "shipbob",
            DisplayName = "ShipBob",
            SupportsWebhooks = true
        });
        providerMock
            .Setup(x => x.ValidateWebhookAsync(It.IsAny<HttpRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        providerMock
            .Setup(x => x.ProcessWebhookAsync(It.IsAny<HttpRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FulfilmentWebhookResult
            {
                Success = true,
                EventType = "order.shipped",
                StatusUpdates =
                [
                    new FulfilmentStatusUpdate
                    {
                        ProviderReference = "REF-1",
                        ProviderStatus = "shipped",
                        MappedStatus = OrderStatus.Shipped,
                        StatusDate = DateTime.UtcNow
                    }
                ],
                ShipmentUpdates =
                [
                    new FulfilmentShipmentUpdate
                    {
                        ProviderReference = "REF-1",
                        ProviderShipmentId = "SHIP-1",
                        TrackingNumber = "TRACK-1",
                        Carrier = "UPS",
                        ShippedDate = DateTime.UtcNow
                    }
                ]
            });

        var providerManagerMock = new Mock<IFulfilmentProviderManager>();
        providerManagerMock
            .Setup(x => x.GetProviderAsync("shipbob", false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RegisteredFulfilmentProvider(providerMock.Object, config));

        var fulfilmentServiceMock = new Mock<IFulfilmentService>();
        fulfilmentServiceMock
            .Setup(x => x.TryLogWebhookAsync(config.Id, It.IsAny<string>(), null, It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        fulfilmentServiceMock
            .Setup(x => x.CompleteWebhookLogAsync(config.Id, "msg-456", "order.shipped", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        fulfilmentServiceMock
            .Setup(x => x.ProcessStatusUpdateAsync(It.IsAny<FulfilmentStatusUpdate>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CrudResult<Order> { ResultObject = new Order() });
        fulfilmentServiceMock
            .Setup(x => x.ProcessShipmentUpdateAsync(It.IsAny<FulfilmentShipmentUpdate>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CrudResult<Merchello.Core.Shipping.Models.Shipment>
            {
                ResultObject = new Merchello.Core.Shipping.Models.Shipment()
            });

        var controller = new FulfilmentWebhookController(
            providerManagerMock.Object,
            fulfilmentServiceMock.Object,
            NullLogger<FulfilmentWebhookController>.Instance);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = BuildHttpContext("""{"topic":"order.shipped"}""", new Dictionary<string, string>
            {
                ["webhook-id"] = "msg-456"
            })
        };

        // Act
        var result = await controller.HandleWebhook("shipbob", CancellationToken.None);

        // Assert
        result.ShouldBeOfType<OkObjectResult>();
        fulfilmentServiceMock.Verify(
            x => x.CompleteWebhookLogAsync(config.Id, "msg-456", "order.shipped", It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Once);
        fulfilmentServiceMock.Verify(x => x.ProcessStatusUpdateAsync(It.IsAny<FulfilmentStatusUpdate>(), It.IsAny<CancellationToken>()), Times.Once);
        fulfilmentServiceMock.Verify(x => x.ProcessShipmentUpdateAsync(It.IsAny<FulfilmentShipmentUpdate>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleWebhook_ProcessingFailure_ReleasesWebhookLogForRetry()
    {
        // Arrange
        var config = new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            IsEnabled = true
        };

        var providerMock = new Mock<IFulfilmentProvider>();
        providerMock.SetupGet(x => x.Metadata).Returns(new FulfilmentProviderMetadata
        {
            Key = "shipbob",
            DisplayName = "ShipBob",
            SupportsWebhooks = true
        });
        providerMock
            .Setup(x => x.ValidateWebhookAsync(It.IsAny<HttpRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        providerMock
            .Setup(x => x.ProcessWebhookAsync(It.IsAny<HttpRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FulfilmentWebhookResult
            {
                Success = false,
                ErrorMessage = "Temporary parser failure"
            });

        var providerManagerMock = new Mock<IFulfilmentProviderManager>();
        providerManagerMock
            .Setup(x => x.GetProviderAsync("shipbob", false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RegisteredFulfilmentProvider(providerMock.Object, config));

        var fulfilmentServiceMock = new Mock<IFulfilmentService>();
        fulfilmentServiceMock
            .Setup(x => x.TryLogWebhookAsync(config.Id, It.IsAny<string>(), null, It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        fulfilmentServiceMock
            .Setup(x => x.RemoveWebhookLogAsync(config.Id, "msg-789", It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var controller = new FulfilmentWebhookController(
            providerManagerMock.Object,
            fulfilmentServiceMock.Object,
            NullLogger<FulfilmentWebhookController>.Instance);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = BuildHttpContext("""{"topic":"order.shipped"}""", new Dictionary<string, string>
            {
                ["webhook-id"] = "msg-789"
            })
        };

        // Act
        var result = await controller.HandleWebhook("shipbob", CancellationToken.None);

        // Assert
        result.ShouldBeOfType<BadRequestObjectResult>();
        fulfilmentServiceMock.Verify(
            x => x.RemoveWebhookLogAsync(config.Id, "msg-789", It.IsAny<CancellationToken>()),
            Times.Once);
        fulfilmentServiceMock.Verify(
            x => x.CompleteWebhookLogAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    private static HttpContext BuildHttpContext(string payload, IDictionary<string, string> headers)
    {
        var context = new DefaultHttpContext();
        var bytes = Encoding.UTF8.GetBytes(payload);
        context.Request.Body = new MemoryStream(bytes);
        context.Request.ContentLength = bytes.Length;
        context.Request.ContentType = "application/json";
        context.Request.Method = HttpMethods.Post;

        foreach (var header in headers)
        {
            context.Request.Headers[header.Key] = header.Value;
        }

        return context;
    }
}
