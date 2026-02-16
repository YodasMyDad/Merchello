using Merchello.Controllers;
using Merchello.Core.Fulfilment.Dtos;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Controllers;

public class FulfilmentProvidersApiControllerTests
{
    [Fact]
    public async Task TestProvider_WhenConfigurationMissing_ReturnsNotFound()
    {
        // Arrange
        var providerManagerMock = new Mock<IFulfilmentProviderManager>();
        providerManagerMock
            .Setup(x => x.GetConfiguredProviderAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RegisteredFulfilmentProvider?)null);

        var controller = CreateController(providerManagerMock, new Mock<IFulfilmentService>(), new Mock<IFulfilmentSyncService>());

        // Act
        var result = await controller.TestProvider(Guid.NewGuid(), CancellationToken.None);

        // Assert
        result.ShouldBeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task TestOrderSubmission_UsesProviderAndReturnsMappedResult()
    {
        // Arrange
        var config = new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            DisplayName = "ShipBob",
            IsEnabled = true
        };

        var capturedRequest = default(FulfilmentOrderRequest);
        var providerMock = CreateProviderMock(new FulfilmentProviderMetadata
        {
            Key = "shipbob",
            DisplayName = "ShipBob",
            SupportsOrderSubmission = true
        });
        providerMock
            .Setup(x => x.SubmitOrderAsync(It.IsAny<FulfilmentOrderRequest>(), It.IsAny<CancellationToken>()))
            .Callback<FulfilmentOrderRequest, CancellationToken>((request, _) => capturedRequest = request)
            .ReturnsAsync(new FulfilmentOrderResult
            {
                Success = true,
                ProviderReference = "SB-REF-001",
                ExtendedData = new Dictionary<string, object> { ["ProviderStatus"] = "accepted" }
            });

        var providerManagerMock = new Mock<IFulfilmentProviderManager>();
        providerManagerMock
            .Setup(x => x.GetConfiguredProviderAsync(config.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RegisteredFulfilmentProvider(providerMock.Object, config));

        var controller = CreateController(providerManagerMock, new Mock<IFulfilmentService>(), new Mock<IFulfilmentSyncService>());

        // Act
        var result = await controller.TestOrderSubmission(config.Id, new TestFulfilmentOrderSubmissionDto
        {
            CustomerEmail = "customer@test.example",
            OrderNumber = "TEST-ORDER-1",
            LineItems = [],
            UseRealSandbox = true
        }, CancellationToken.None);

        // Assert
        var ok = result.ShouldBeOfType<OkObjectResult>();
        var dto = ok.Value.ShouldBeOfType<TestFulfilmentOrderSubmissionResultDto>();
        dto.Success.ShouldBeTrue();
        dto.ProviderReference.ShouldBe("SB-REF-001");
        dto.ProviderStatus.ShouldBe("accepted");

        capturedRequest.ShouldNotBeNull();
        capturedRequest!.CustomerEmail.ShouldBe("customer@test.example");
        capturedRequest.OrderNumber.ShouldBe("TEST-ORDER-1");
        capturedRequest.LineItems.Count.ShouldBe(1); // default test line-item fallback
    }

    [Fact]
    public async Task GetWebhookEventTemplates_ReturnsProviderTemplates()
    {
        // Arrange
        var config = new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            DisplayName = "ShipBob",
            IsEnabled = true
        };

        var providerMock = CreateProviderMock(new FulfilmentProviderMetadata
        {
            Key = "shipbob",
            DisplayName = "ShipBob",
            SupportsWebhooks = true
        });
        providerMock
            .Setup(x => x.GetWebhookEventTemplatesAsync(It.IsAny<CancellationToken>()))
            .Returns(new ValueTask<IReadOnlyList<FulfilmentWebhookEventTemplate>>(
            [
                new FulfilmentWebhookEventTemplate
                {
                    EventType = "order.shipped",
                    DisplayName = "Order Shipped",
                    Description = "Shipment dispatched"
                }
            ]));

        var providerManagerMock = new Mock<IFulfilmentProviderManager>();
        providerManagerMock
            .Setup(x => x.GetConfiguredProviderAsync(config.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RegisteredFulfilmentProvider(providerMock.Object, config));

        var controller = CreateController(providerManagerMock, new Mock<IFulfilmentService>(), new Mock<IFulfilmentSyncService>());

        // Act
        var result = await controller.GetWebhookEventTemplates(config.Id, CancellationToken.None);

        // Assert
        var ok = result.ShouldBeOfType<OkObjectResult>();
        var templates = ok.Value.ShouldBeOfType<List<FulfilmentWebhookEventTemplateDto>>();
        templates.Count.ShouldBe(1);
        templates[0].EventType.ShouldBe("order.shipped");
        templates[0].DisplayName.ShouldBe("Order Shipped");
    }

    [Fact]
    public async Task SimulateWebhook_ProcessesStatusAndShipmentUpdates()
    {
        // Arrange
        var config = new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            DisplayName = "ShipBob",
            IsEnabled = true
        };

        var providerMock = CreateProviderMock(new FulfilmentProviderMetadata
        {
            Key = "shipbob",
            DisplayName = "ShipBob",
            SupportsWebhooks = true
        });
        providerMock
            .Setup(x => x.GenerateTestWebhookPayloadAsync(It.IsAny<GenerateFulfilmentWebhookPayloadRequest>(), It.IsAny<CancellationToken>()))
            .Returns(new ValueTask<(string Payload, IDictionary<string, string> Headers)>(("""{"topic":"order.shipped"}""", new Dictionary<string, string>
            {
                ["x-webhook-topic"] = "order.shipped"
            })));

        providerMock
            .Setup(x => x.ProcessWebhookAsync(It.IsAny<Microsoft.AspNetCore.Http.HttpRequest>(), It.IsAny<CancellationToken>()))
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
                        MappedStatus = Merchello.Core.Accounting.Models.OrderStatus.Shipped,
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
            .Setup(x => x.GetConfiguredProviderAsync(config.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RegisteredFulfilmentProvider(providerMock.Object, config));

        var fulfilmentServiceMock = new Mock<IFulfilmentService>();
        fulfilmentServiceMock
            .Setup(x => x.ProcessStatusUpdateAsync(It.IsAny<FulfilmentStatusUpdate>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CrudResult<Merchello.Core.Accounting.Models.Order>
            {
                ResultObject = new Merchello.Core.Accounting.Models.Order()
            });
        fulfilmentServiceMock
            .Setup(x => x.ProcessShipmentUpdateAsync(It.IsAny<FulfilmentShipmentUpdate>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CrudResult<Merchello.Core.Shipping.Models.Shipment>
            {
                ResultObject = new Merchello.Core.Shipping.Models.Shipment()
            });

        var controller = CreateController(providerManagerMock, fulfilmentServiceMock, new Mock<IFulfilmentSyncService>());

        // Act
        var result = await controller.SimulateWebhook(config.Id, new SimulateFulfilmentWebhookDto
        {
            EventType = "order.shipped",
            ProviderReference = "REF-1"
        }, CancellationToken.None);

        // Assert
        var ok = result.ShouldBeOfType<OkObjectResult>();
        var dto = ok.Value.ShouldBeOfType<FulfilmentWebhookSimulationResultDto>();
        dto.Success.ShouldBeTrue();
        dto.EventTypeDetected.ShouldBe("order.shipped");
        dto.ActionsPerformed.ShouldContain(x => x.Contains("Parsed event", StringComparison.OrdinalIgnoreCase));
        dto.ActionsPerformed.ShouldContain(x => x.Contains("Updated order", StringComparison.OrdinalIgnoreCase));
        dto.ActionsPerformed.ShouldContain(x => x.Contains("Processed shipment", StringComparison.OrdinalIgnoreCase));

        fulfilmentServiceMock.Verify(x => x.ProcessStatusUpdateAsync(It.IsAny<FulfilmentStatusUpdate>(), It.IsAny<CancellationToken>()), Times.Once);
        fulfilmentServiceMock.Verify(x => x.ProcessShipmentUpdateAsync(It.IsAny<FulfilmentShipmentUpdate>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task TriggerSyncEndpoints_ReturnMappedSyncLogDto()
    {
        // Arrange
        var config = new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            DisplayName = "ShipBob",
            IsEnabled = true
        };

        var providerMock = CreateProviderMock(new FulfilmentProviderMetadata
        {
            Key = "shipbob",
            DisplayName = "ShipBob",
            SupportsProductSync = true,
            SupportsInventorySync = true
        });
        var registered = new RegisteredFulfilmentProvider(providerMock.Object, config);

        var providerManagerMock = new Mock<IFulfilmentProviderManager>();
        providerManagerMock
            .Setup(x => x.GetConfiguredProviderAsync(config.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(registered);

        var syncLog = new FulfilmentSyncLog
        {
            Id = Guid.NewGuid(),
            ProviderConfigurationId = config.Id,
            SyncType = FulfilmentSyncType.ProductsOut,
            Status = FulfilmentSyncStatus.Completed,
            ItemsProcessed = 4,
            ItemsSucceeded = 4,
            ItemsFailed = 0,
            StartedAt = DateTime.UtcNow.AddMinutes(-1),
            CompletedAt = DateTime.UtcNow
        };

        var syncServiceMock = new Mock<IFulfilmentSyncService>();
        syncServiceMock
            .Setup(x => x.SyncProductsAsync(config.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(syncLog);
        syncServiceMock
            .Setup(x => x.SyncInventoryAsync(config.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FulfilmentSyncLog
            {
                Id = Guid.NewGuid(),
                ProviderConfigurationId = config.Id,
                SyncType = FulfilmentSyncType.InventoryIn,
                Status = FulfilmentSyncStatus.Completed,
                ItemsProcessed = 3,
                ItemsSucceeded = 3,
                ItemsFailed = 0,
                StartedAt = DateTime.UtcNow.AddMinutes(-1),
                CompletedAt = DateTime.UtcNow
            });

        var controller = CreateController(providerManagerMock, new Mock<IFulfilmentService>(), syncServiceMock);

        // Act
        var productResult = await controller.TriggerProductSync(config.Id, CancellationToken.None);
        var inventoryResult = await controller.TriggerInventorySync(config.Id, CancellationToken.None);

        // Assert
        var productOk = productResult.ShouldBeOfType<OkObjectResult>();
        var productDto = productOk.Value.ShouldBeOfType<FulfilmentSyncLogDto>();
        productDto.ProviderDisplayName.ShouldBe("ShipBob");
        productDto.SyncType.ShouldBe(FulfilmentSyncType.ProductsOut);

        var inventoryOk = inventoryResult.ShouldBeOfType<OkObjectResult>();
        var inventoryDto = inventoryOk.Value.ShouldBeOfType<FulfilmentSyncLogDto>();
        inventoryDto.ProviderDisplayName.ShouldBe("ShipBob");
        inventoryDto.SyncType.ShouldBe(FulfilmentSyncType.InventoryIn);
    }

    [Fact]
    public void RouteAttributes_ContainCompatibilityAliases()
    {
        var testProviderTemplates = GetHttpPostTemplates(nameof(FulfilmentProvidersApiController.TestProvider));
        testProviderTemplates.ShouldContain("fulfilment-providers/{id:guid}/test");
        testProviderTemplates.ShouldContain("fulfilment-providers/{id:guid}/test/connection");

        var productSyncTemplates = GetHttpPostTemplates(nameof(FulfilmentProvidersApiController.TriggerProductSync));
        productSyncTemplates.ShouldContain("fulfilment-providers/{id:guid}/sync/products");
        productSyncTemplates.ShouldContain("fulfilment-providers/{id:guid}/test/product-sync");

        var inventorySyncTemplates = GetHttpPostTemplates(nameof(FulfilmentProvidersApiController.TriggerInventorySync));
        inventorySyncTemplates.ShouldContain("fulfilment-providers/{id:guid}/sync/inventory");
        inventorySyncTemplates.ShouldContain("fulfilment-providers/{id:guid}/test/inventory-sync");
    }

    private static FulfilmentProvidersApiController CreateController(
        Mock<IFulfilmentProviderManager> providerManagerMock,
        Mock<IFulfilmentService> fulfilmentServiceMock,
        Mock<IFulfilmentSyncService> syncServiceMock)
    {
        return new FulfilmentProvidersApiController(
            providerManagerMock.Object,
            fulfilmentServiceMock.Object,
            syncServiceMock.Object);
    }

    private static Mock<IFulfilmentProvider> CreateProviderMock(FulfilmentProviderMetadata metadata)
    {
        var providerMock = new Mock<IFulfilmentProvider>();
        providerMock.SetupGet(x => x.Metadata).Returns(metadata);
        providerMock
            .Setup(x => x.GetConfigurationFieldsAsync(It.IsAny<CancellationToken>()))
            .Returns(new ValueTask<IEnumerable<Merchello.Core.Shared.Providers.ProviderConfigurationField>>([]));
        providerMock
            .Setup(x => x.ConfigureAsync(It.IsAny<FulfilmentProviderConfiguration?>(), It.IsAny<CancellationToken>()))
            .Returns(ValueTask.CompletedTask);
        providerMock
            .Setup(x => x.TestConnectionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(FulfilmentConnectionTestResult.Succeeded("Test Account", "1.0.0"));
        providerMock
            .Setup(x => x.SubmitOrderAsync(It.IsAny<FulfilmentOrderRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FulfilmentOrderResult.Succeeded("TEST-REF"));
        providerMock
            .Setup(x => x.CancelOrderAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(FulfilmentCancelResult.Succeeded());
        providerMock
            .Setup(x => x.ValidateWebhookAsync(It.IsAny<Microsoft.AspNetCore.Http.HttpRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        providerMock
            .Setup(x => x.ProcessWebhookAsync(It.IsAny<Microsoft.AspNetCore.Http.HttpRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FulfilmentWebhookResult { Success = true, EventType = "test.event" });
        providerMock
            .Setup(x => x.GetWebhookEventTemplatesAsync(It.IsAny<CancellationToken>()))
            .Returns(new ValueTask<IReadOnlyList<FulfilmentWebhookEventTemplate>>([]));
        providerMock
            .Setup(x => x.GenerateTestWebhookPayloadAsync(It.IsAny<GenerateFulfilmentWebhookPayloadRequest>(), It.IsAny<CancellationToken>()))
            .Returns(new ValueTask<(string Payload, IDictionary<string, string> Headers)>(("{}", new Dictionary<string, string>())));
        providerMock
            .Setup(x => x.PollOrderStatusAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        providerMock
            .Setup(x => x.SyncProductsAsync(It.IsAny<IEnumerable<FulfilmentProduct>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FulfilmentSyncResult { Success = true });
        providerMock
            .Setup(x => x.GetInventoryLevelsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        return providerMock;
    }

    private static IReadOnlyList<string> GetHttpPostTemplates(string methodName)
    {
        var method = typeof(FulfilmentProvidersApiController).GetMethod(methodName);
        method.ShouldNotBeNull();

        return method!
            .GetCustomAttributes(typeof(HttpMethodAttribute), inherit: false)
            .OfType<HttpMethodAttribute>()
            .Select(x => x.Template ?? string.Empty)
            .ToList();
    }
}
