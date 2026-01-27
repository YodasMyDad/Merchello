using Merchello.Core.Accounting.Handlers.Interfaces;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Customers.Models;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Warehouses.Models;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Shouldly;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Shipping.Services;

/// <summary>
/// Integration tests for ShipmentService using the shared ServiceTestFixture
/// with a real SQLite database and Moq for non-database dependencies.
/// Tests cover CreateShipmentAsync, UpdateShipmentStatusAsync, and DeleteShipmentAsync.
/// </summary>
[Collection("Integration Tests")]
public class ShipmentServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly Mock<IInventoryService> _inventoryServiceMock;
    private readonly Mock<IOrderStatusHandler> _statusHandlerMock;
    private readonly Mock<IProductService> _productServiceMock;
    private readonly ShipmentService _service;

    public ShipmentServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();

        _inventoryServiceMock = new Mock<IInventoryService>();
        _statusHandlerMock = new Mock<IOrderStatusHandler>();
        _productServiceMock = new Mock<IProductService>();

        // Default: notifications never cancel (from fixture)
        // Default: status handler allows all transitions
        _statusHandlerMock
            .Setup(h => h.CanTransitionAsync(It.IsAny<Order>(), It.IsAny<OrderStatus>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _statusHandlerMock
            .Setup(h => h.OnStatusChangingAsync(It.IsAny<Order>(), It.IsAny<OrderStatus>(), It.IsAny<OrderStatus>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _statusHandlerMock
            .Setup(h => h.OnStatusChangedAsync(It.IsAny<Order>(), It.IsAny<OrderStatus>(), It.IsAny<OrderStatus>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Default: inventory allocation always succeeds
        _inventoryServiceMock
            .Setup(s => s.AllocateStockAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CrudResult<bool> { ResultObject = true });

        _service = new ShipmentService(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            _inventoryServiceMock.Object,
            _statusHandlerMock.Object,
            _productServiceMock.Object,
            _fixture.GetService<IMerchelloNotificationPublisher>(),
            new ShipmentFactory(),
            _fixture.GetService<LineItemFactory>(),
            NullLogger<ShipmentService>.Instance);
    }

    #region CreateShipmentAsync - Valid Order

    [Fact]
    public async Task CreateShipmentAsync_WithValidOrder_CreatesShipment()
    {
        // Arrange
        var (order, lineItem) = await SeedOrderWithLineItemAsync(OrderStatus.Processing);

        var parameters = new CreateShipmentParameters
        {
            OrderId = order.Id,
            LineItems = new Dictionary<Guid, int> { { lineItem.Id, 2 } },
            Carrier = "UPS",
            TrackingNumber = "1Z999AA10123456784",
            TrackingUrl = "https://tracking.ups.com/1Z999AA10123456784"
        };

        // Act
        var result = await _service.CreateShipmentAsync(parameters);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.OrderId.ShouldBe(order.Id);
        result.ResultObject.Carrier.ShouldBe("UPS");
        result.ResultObject.TrackingNumber.ShouldBe("1Z999AA10123456784");
        result.ResultObject.TrackingUrl.ShouldBe("https://tracking.ups.com/1Z999AA10123456784");
        result.ResultObject.Status.ShouldBe(ShipmentStatus.Preparing);
        result.ResultObject.LineItems.Count.ShouldBe(1);
        result.ResultObject.LineItems[0].Quantity.ShouldBe(2);
    }

    #endregion

    #region CreateShipmentAsync - Invalid Order ID

    [Fact]
    public async Task CreateShipmentAsync_WithInvalidOrderId_ReturnsError()
    {
        // Arrange
        var parameters = new CreateShipmentParameters
        {
            OrderId = Guid.NewGuid(),
            LineItems = new Dictionary<Guid, int> { { Guid.NewGuid(), 1 } }
        };

        // Act
        var result = await _service.CreateShipmentAsync(parameters);

        // Assert
        result.Successful.ShouldBeFalse();
        result.ResultObject.ShouldBeNull();
        result.Messages.ShouldContain(m => m.Message == "Order not found");
        result.Messages.ShouldContain(m => m.ResultMessageType == ResultMessageType.Error);
    }

    #endregion

    #region UpdateShipmentStatusAsync - Preparing to Shipped

    [Fact]
    public async Task UpdateShipmentStatusAsync_FromPreparingToShipped_TransitionsSuccessfully()
    {
        // Arrange
        var (order, lineItem) = await SeedOrderWithLineItemAsync(OrderStatus.Processing);
        var shipment = await SeedShipmentAsync(order, lineItem, ShipmentStatus.Preparing);

        var parameters = new UpdateShipmentStatusParameters
        {
            ShipmentId = shipment.Id,
            NewStatus = ShipmentStatus.Shipped,
            Carrier = "FedEx",
            TrackingNumber = "794644790132"
        };

        // Act
        var result = await _service.UpdateShipmentStatusAsync(parameters);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.Status.ShouldBe(ShipmentStatus.Shipped);
        result.ResultObject.Carrier.ShouldBe("FedEx");
        result.ResultObject.TrackingNumber.ShouldBe("794644790132");
        result.ResultObject.ShippedDate.ShouldNotBeNull();
    }

    #endregion

    #region UpdateShipmentStatusAsync - Shipped to Delivered

    [Fact]
    public async Task UpdateShipmentStatusAsync_FromShippedToDelivered_TransitionsSuccessfully()
    {
        // Arrange
        var (order, lineItem) = await SeedOrderWithLineItemAsync(OrderStatus.Shipped);
        var shipment = await SeedShipmentAsync(order, lineItem, ShipmentStatus.Shipped);

        var parameters = new UpdateShipmentStatusParameters
        {
            ShipmentId = shipment.Id,
            NewStatus = ShipmentStatus.Delivered
        };

        // Act
        var result = await _service.UpdateShipmentStatusAsync(parameters);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.Status.ShouldBe(ShipmentStatus.Delivered);
        result.ResultObject.ActualDeliveryDate.ShouldNotBeNull();
    }

    [Fact]
    public async Task UpdateShipmentStatusAsync_AllShipmentsDelivered_OrderBecomesCompleted()
    {
        // Arrange
        var (order, lineItem) = await SeedOrderWithLineItemAsync(OrderStatus.Shipped);
        var shipment = await SeedShipmentAsync(order, lineItem, ShipmentStatus.Shipped);

        var parameters = new UpdateShipmentStatusParameters
        {
            ShipmentId = shipment.Id,
            NewStatus = ShipmentStatus.Delivered
        };

        // Act
        var result = await _service.UpdateShipmentStatusAsync(parameters);

        // Assert
        result.Successful.ShouldBeTrue();

        // Clear tracker so we get fresh data from the database
        _fixture.DbContext.ChangeTracker.Clear();

        // Reload order to verify status change was persisted
        var updatedOrder = await _fixture.DbContext.Orders.FirstAsync(o => o.Id == order.Id);
        updatedOrder.Status.ShouldBe(OrderStatus.Completed);
        updatedOrder.CompletedDate.ShouldNotBeNull();
    }

    #endregion

    #region DeleteShipmentAsync

    [Fact]
    public async Task DeleteShipmentAsync_ExistingShipment_ReturnsTrue()
    {
        // Arrange
        var (order, lineItem) = await SeedOrderWithLineItemAsync(OrderStatus.Shipped);
        var shipment = await SeedShipmentAsync(order, lineItem, ShipmentStatus.Shipped);

        // Act
        var result = await _service.DeleteShipmentAsync(shipment.Id);

        // Assert
        result.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();
        var deletedShipment = await _fixture.DbContext.Shipments.FirstOrDefaultAsync(s => s.Id == shipment.Id);
        deletedShipment.ShouldBeNull();
    }

    [Fact]
    public async Task DeleteShipmentAsync_NonExistentShipment_ReturnsFalse()
    {
        // Arrange & Act
        var result = await _service.DeleteShipmentAsync(Guid.NewGuid());

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task DeleteShipmentAsync_LastShipment_OrderRevertsToReadyToFulfill()
    {
        // Arrange
        var (order, lineItem) = await SeedOrderWithLineItemAsync(OrderStatus.Shipped);
        var shipment = await SeedShipmentAsync(order, lineItem, ShipmentStatus.Shipped);

        // Act
        await _service.DeleteShipmentAsync(shipment.Id);

        // Assert
        _fixture.DbContext.ChangeTracker.Clear();
        var updatedOrder = await _fixture.DbContext.Orders.FirstAsync(o => o.Id == order.Id);
        updatedOrder.Status.ShouldBe(OrderStatus.ReadyToFulfill);
        updatedOrder.ShippedDate.ShouldBeNull();
    }

    #endregion

    #region Helper Methods

    /// <summary>
    /// Seeds the database with an order containing a single product line item.
    /// </summary>
    private async Task<(Order Order, LineItem LineItem)> SeedOrderWithLineItemAsync(OrderStatus status)
    {
        var shippingOptionId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();

        var warehouse = new Warehouse
        {
            Id = Guid.NewGuid(),
            Name = "Test Warehouse",
            Address = new Address
            {
                Name = "Warehouse",
                AddressOne = "1 Warehouse Road",
                TownCity = "London",
                PostalCode = "E1 1AA",
                CountryCode = "GB"
            }
        };
        _fixture.DbContext.Warehouses.Add(warehouse);

        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            Email = $"test-{Guid.NewGuid():N}@example.com"
        };
        _fixture.DbContext.Customers.Add(customer);

        var invoice = new Invoice
        {
            Id = invoiceId,
            CustomerId = customer.Id,
            InvoiceNumber = $"INV-{Guid.NewGuid():N}"[..12],
            SubTotal = 50m,
            Tax = 10m,
            Total = 60m,
            CurrencyCode = "GBP",
            ShippingAddress = new Address
            {
                Name = "Test User",
                AddressOne = "123 Test Street",
                TownCity = "London",
                PostalCode = "SW1A 1AA",
                CountryCode = "GB"
            },
            BillingAddress = new Address
            {
                Name = "Test User",
                AddressOne = "123 Test Street",
                TownCity = "London",
                PostalCode = "SW1A 1AA",
                CountryCode = "GB"
            }
        };
        _fixture.DbContext.Invoices.Add(invoice);

        var order = new Order
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoiceId,
            WarehouseId = warehouse.Id,
            ShippingOptionId = shippingOptionId,
            Status = status,
            DateCreated = DateTime.UtcNow.AddDays(-1)
        };
        _fixture.DbContext.Orders.Add(order);

        var lineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            Name = "Test Product",
            Sku = "SKU-TEST-001",
            Quantity = 2,
            Amount = 25.00m,
            LineItemType = LineItemType.Product,
            IsTaxable = true,
            TaxRate = 20m
        };
        _fixture.DbContext.LineItems.Add(lineItem);

        await _fixture.DbContext.SaveChangesAsync();
        return (order, lineItem);
    }

    /// <summary>
    /// Seeds a shipment for the given order with a copy of the line item.
    /// </summary>
    private async Task<Shipment> SeedShipmentAsync(Order order, LineItem sourceLineItem, ShipmentStatus status)
    {
        var shipment = new Shipment
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            WarehouseId = order.WarehouseId,
            Status = status,
            ShippedDate = status == ShipmentStatus.Shipped ? DateTime.UtcNow.AddDays(-1) : null,
            Address = new Address
            {
                Name = "Test User",
                AddressOne = "123 Test Street",
                TownCity = "London",
                PostalCode = "SW1A 1AA",
                CountryCode = "GB"
            },
            LineItems =
            [
                new LineItem
                {
                    Id = sourceLineItem.Id,
                    Sku = sourceLineItem.Sku,
                    Name = sourceLineItem.Name,
                    Quantity = sourceLineItem.Quantity,
                    Amount = sourceLineItem.Amount,
                    LineItemType = sourceLineItem.LineItemType
                }
            ]
        };

        _fixture.DbContext.Shipments.Add(shipment);
        await _fixture.DbContext.SaveChangesAsync();
        return shipment;
    }

    #endregion
}
