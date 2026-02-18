using Merchello.Core.Accounting.Models;
using Merchello.Core;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Warehouses.Models;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shipping.Services;

/// <summary>
/// Integration tests for ShipmentService using the shared ServiceTestFixture
/// with a real SQLite database and production service implementations.
/// </summary>
[Collection("Integration Tests")]
public class ShipmentServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly IShipmentService _shipmentService;
    private readonly IInventoryService _inventoryService;

    public ShipmentServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.ResetMocks();
        _shipmentService = fixture.GetService<IShipmentService>();
        _inventoryService = fixture.GetService<IInventoryService>();
    }

    #region CreateShipmentAsync - Valid Order

    [Fact]
    public async Task CreateShipmentAsync_WithValidOrder_CreatesShipment()
    {
        // Arrange
        var (order, lineItem, _, _) = await SeedOrderWithLineItemAsync(OrderStatus.Processing);

        var parameters = new CreateShipmentParameters
        {
            OrderId = order.Id,
            LineItems = new Dictionary<Guid, int> { { lineItem.Id, 2 } },
            Carrier = "UPS",
            TrackingNumber = "1Z999AA10123456784",
            TrackingUrl = "https://tracking.ups.com/1Z999AA10123456784"
        };

        // Act
        var result = await _shipmentService.CreateShipmentAsync(parameters);

        // Assert
        result.Success.ShouldBeTrue();
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
        var result = await _shipmentService.CreateShipmentAsync(parameters);

        // Assert
        result.Success.ShouldBeFalse();
        result.ResultObject.ShouldBeNull();
        result.Messages.ShouldContain(m => m.Message == "Order not found");
        result.Messages.ShouldContain(m => m.ResultMessageType == ResultMessageType.Error);
    }

    [Fact]
    public async Task CreateShipmentAsync_WithAddonLineItem_ReturnsError()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("Add-on Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard Delivery", warehouse, fixedCost: 5.00m);
        shippingOption.ShippingCosts.Add(new ShippingCost { CountryCode = "GB", Cost = 5.00m });
        dataBuilder.AddServiceRegion(warehouse, "GB");

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Parent Product Root", taxGroup);
        var product = dataBuilder.CreateProduct("Parent Product", productRoot, price: 80m);
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);
        product.ShippingOptions.Add(shippingOption);

        var invoice = dataBuilder.CreateInvoice(total: 0m);
        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.ReadyToFulfill);
        var parentLineItem = dataBuilder.CreateLineItem(order, product, quantity: 1, amount: 80m, taxRate: 20m);
        var addonLineItem = dataBuilder.CreateAddonLineItem(
            order,
            parentLineItem,
            name: "Premium Handle",
            quantity: 1,
            amount: 10m,
            isTaxable: false,
            taxRate: 0m);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var parameters = new CreateShipmentParameters
        {
            OrderId = order.Id,
            LineItems = new Dictionary<Guid, int> { { addonLineItem.Id, 1 } }
        };

        // Act
        var result = await _shipmentService.CreateShipmentAsync(parameters);

        // Assert
        result.Success.ShouldBeFalse();
        result.ResultObject.ShouldBeNull();
        result.Messages.ShouldContain(m =>
            (m.Message ?? string.Empty).Contains("cannot be shipped", StringComparison.OrdinalIgnoreCase));
    }

    #endregion

    #region CreateShipmentsFromOrderAsync - Allocation

    [Fact]
    public async Task CreateShipmentsFromOrderAsync_AllocatesStockAndCreatesShipment()
    {
        // Arrange
        var (order, lineItem, product, warehouse) = await SeedOrderWithLineItemAsync(OrderStatus.Processing);

        var reserveResult = await _inventoryService.ReserveStockAsync(product.Id, warehouse.Id, lineItem.Quantity);
        reserveResult.ResultObject.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();

        var parameters = new CreateShipmentsParameters
        {
            OrderId = order.Id,
            ShippingAddress = CreateAddress("GB"),
            TrackingNumber = "SHIP-123"
        };

        // Act
        var shipments = await _shipmentService.CreateShipmentsFromOrderAsync(parameters);

        // Assert
        shipments.Count.ShouldBe(1);
        shipments[0].LineItems.ShouldContain(li => li.Sku == lineItem.Sku && li.Quantity == lineItem.Quantity);

        using var verifyContext = _fixture.CreateDbContext();
        var productWarehouse = await verifyContext.ProductWarehouses
            .FirstAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);
        productWarehouse.Stock.ShouldBe(100 - lineItem.Quantity);
        productWarehouse.ReservedStock.ShouldBe(0);
    }

    #endregion

    #region UpdateShipmentStatusAsync - Preparing to Shipped

    [Fact]
    public async Task UpdateShipmentStatusAsync_FromPreparingToShipped_TransitionsSuccessfully()
    {
        // Arrange
        var (order, lineItem, _, _) = await SeedOrderWithLineItemAsync(OrderStatus.Processing);
        var shipment = await CreateShipmentAsync(order, lineItem);

        var parameters = new UpdateShipmentStatusParameters
        {
            ShipmentId = shipment.Id,
            NewStatus = ShipmentStatus.Shipped,
            Carrier = "FedEx",
            TrackingNumber = "794644790132"
        };

        // Act
        var result = await _shipmentService.UpdateShipmentStatusAsync(parameters);

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.Status.ShouldBe(ShipmentStatus.Shipped);
        result.ResultObject.Carrier.ShouldBe("FedEx");
        result.ResultObject.TrackingNumber.ShouldBe("794644790132");
        result.ResultObject.ShippedDate.ShouldNotBeNull();

        _fixture.DbContext.ChangeTracker.Clear();
        var updatedOrder = await _fixture.DbContext.Orders.FirstAsync(o => o.Id == order.Id);
        updatedOrder.Status.ShouldBe(OrderStatus.Shipped);
    }

    [Fact]
    public async Task UpdateShipmentStatusAsync_WithAddonOnOrder_ShippedStatusUsesShippableItemsOnly()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("Status Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard Delivery", warehouse, fixedCost: 5.00m);
        shippingOption.ShippingCosts.Add(new ShippingCost { CountryCode = "GB", Cost = 5.00m });
        dataBuilder.AddServiceRegion(warehouse, "GB");

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Status Product Root", taxGroup);
        var product = dataBuilder.CreateProduct("Status Product", productRoot, price: 40m);
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);
        product.ShippingOptions.Add(shippingOption);

        var invoice = dataBuilder.CreateInvoice(total: 0m);
        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Processing);

        var parentLineItem = dataBuilder.CreateLineItem(order, product, quantity: 1, amount: 40m, taxRate: 20m);
        dataBuilder.CreateAddonLineItem(
            order,
            parentLineItem,
            name: "Add-on Warranty",
            quantity: 1,
            amount: 5m,
            isTaxable: false,
            taxRate: 0m);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var createShipmentResult = await _shipmentService.CreateShipmentAsync(new CreateShipmentParameters
        {
            OrderId = order.Id,
            LineItems = new Dictionary<Guid, int> { { parentLineItem.Id, 1 } }
        });
        createShipmentResult.Success.ShouldBeTrue();

        // Act
        var updateResult = await _shipmentService.UpdateShipmentStatusAsync(new UpdateShipmentStatusParameters
        {
            ShipmentId = createShipmentResult.ResultObject!.Id,
            NewStatus = ShipmentStatus.Shipped
        });

        // Assert
        updateResult.Success.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();
        var updatedOrder = await _fixture.DbContext.Orders.FirstAsync(o => o.Id == order.Id);
        updatedOrder.Status.ShouldBe(OrderStatus.Shipped);
    }

    #endregion

    #region UpdateShipmentStatusAsync - Shipped to Delivered

    [Fact]
    public async Task UpdateShipmentStatusAsync_FromShippedToDelivered_TransitionsSuccessfully()
    {
        // Arrange
        var (order, lineItem, _, _) = await SeedOrderWithLineItemAsync(OrderStatus.Processing);
        var shipment = await CreateShipmentAsync(order, lineItem);

        await _shipmentService.UpdateShipmentStatusAsync(new UpdateShipmentStatusParameters
        {
            ShipmentId = shipment.Id,
            NewStatus = ShipmentStatus.Shipped
        });

        var parameters = new UpdateShipmentStatusParameters
        {
            ShipmentId = shipment.Id,
            NewStatus = ShipmentStatus.Delivered
        };

        // Act
        var result = await _shipmentService.UpdateShipmentStatusAsync(parameters);

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.Status.ShouldBe(ShipmentStatus.Delivered);
        result.ResultObject.ActualDeliveryDate.ShouldNotBeNull();
    }

    [Fact]
    public async Task UpdateShipmentStatusAsync_AllShipmentsDelivered_OrderBecomesCompleted()
    {
        // Arrange
        var (order, lineItem, _, _) = await SeedOrderWithLineItemAsync(OrderStatus.Processing);
        var shipment = await CreateShipmentAsync(order, lineItem);

        await _shipmentService.UpdateShipmentStatusAsync(new UpdateShipmentStatusParameters
        {
            ShipmentId = shipment.Id,
            NewStatus = ShipmentStatus.Shipped
        });

        // Act
        await _shipmentService.UpdateShipmentStatusAsync(new UpdateShipmentStatusParameters
        {
            ShipmentId = shipment.Id,
            NewStatus = ShipmentStatus.Delivered
        });

        // Assert
        _fixture.DbContext.ChangeTracker.Clear();
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
        var (order, lineItem, _, _) = await SeedOrderWithLineItemAsync(OrderStatus.Processing);
        var shipment = await CreateShipmentAsync(order, lineItem);

        await _shipmentService.UpdateShipmentStatusAsync(new UpdateShipmentStatusParameters
        {
            ShipmentId = shipment.Id,
            NewStatus = ShipmentStatus.Shipped
        });

        // Act
        var result = await _shipmentService.DeleteShipmentAsync(shipment.Id);

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
        var result = await _shipmentService.DeleteShipmentAsync(Guid.NewGuid());

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task DeleteShipmentAsync_LastShipment_OrderRevertsToReadyToFulfill()
    {
        // Arrange
        var (order, lineItem, _, _) = await SeedOrderWithLineItemAsync(OrderStatus.Processing);
        var shipment = await CreateShipmentAsync(order, lineItem);

        await _shipmentService.UpdateShipmentStatusAsync(new UpdateShipmentStatusParameters
        {
            ShipmentId = shipment.Id,
            NewStatus = ShipmentStatus.Shipped
        });

        // Act
        await _shipmentService.DeleteShipmentAsync(shipment.Id);

        // Assert
        _fixture.DbContext.ChangeTracker.Clear();
        var updatedOrder = await _fixture.DbContext.Orders.FirstAsync(o => o.Id == order.Id);
        updatedOrder.Status.ShouldBe(OrderStatus.ReadyToFulfill);
        updatedOrder.ShippedDate.ShouldBeNull();
    }

    #endregion

    #region GetFulfillmentSummaryAsync

    [Fact]
    public async Task GetFulfillmentSummaryAsync_CustomAndAddonLineItems_ReturnsOnlyShippableItems()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("Summary Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard Delivery", warehouse, fixedCost: 5.00m);
        var invoice = dataBuilder.CreateInvoice(total: 0m);
        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.ReadyToFulfill);

        var customLineItem = dataBuilder.CreateLineItem(
            order,
            product: null,
            name: "Custom Headboard",
            quantity: 2,
            amount: 120m,
            isTaxable: false,
            taxRate: 0m,
            lineItemType: LineItemType.Custom,
            extendedData: new Dictionary<string, object>
            {
                [Constants.ExtendedDataKeys.IsPhysicalProduct] = true,
                [Constants.ExtendedDataKeys.ProductRootName] = "Custom Headboard"
            });

        var addonLineItem = dataBuilder.CreateAddonLineItem(
            order,
            customLineItem,
            name: "Trim: Brass Studs",
            quantity: 2,
            amount: 15m,
            isTaxable: false,
            taxRate: 0m);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var summary = await _shipmentService.GetFulfillmentSummaryAsync(invoice.Id);

        // Assert
        summary.ShouldNotBeNull();

        var orderSummary = summary.Orders.Single(o => o.OrderId == order.Id);
        var mappedCustomLineItem = orderSummary.LineItems.Single(li => li.Id == customLineItem.Id);

        mappedCustomLineItem.OrderedQuantity.ShouldBe(customLineItem.Quantity);
        mappedCustomLineItem.ShippedQuantity.ShouldBe(0);
        mappedCustomLineItem.RemainingQuantity.ShouldBe(customLineItem.Quantity);
        orderSummary.LineItems.ShouldNotContain(li => li.Id == addonLineItem.Id);
    }

    [Fact]
    public async Task GetFulfillmentSummaryAsync_MixedProductAndCustom_RemainingCustomStillShown_WithoutAddonRows()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("Mixed Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Express Delivery", warehouse, fixedCost: 12.00m);
        shippingOption.ShippingCosts.Add(new ShippingCost { CountryCode = "GB", Cost = 12.00m });
        dataBuilder.AddServiceRegion(warehouse, "GB");

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Main Product Root", taxGroup);
        var product = dataBuilder.CreateProduct("Main Product", productRoot, price: 80m);
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);
        product.ShippingOptions.Add(shippingOption);

        var invoice = dataBuilder.CreateInvoice(total: 0m);
        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.ReadyToFulfill);

        var productLineItem = dataBuilder.CreateLineItem(
            order,
            product,
            quantity: 1,
            amount: 80m,
            isTaxable: true,
            taxRate: 20m);
        productLineItem.ExtendedData[Constants.ExtendedDataKeys.ProductRootName] = "Main Product Root";

        var customLineItem = dataBuilder.CreateLineItem(
            order,
            product: null,
            name: "Custom Fitting Service",
            quantity: 1,
            amount: 45m,
            isTaxable: false,
            taxRate: 0m,
            lineItemType: LineItemType.Custom,
            extendedData: new Dictionary<string, object>
            {
                [Constants.ExtendedDataKeys.IsPhysicalProduct] = true,
                [Constants.ExtendedDataKeys.ProductRootName] = "Custom Fitting Service"
            });

        var addonLineItem = dataBuilder.CreateAddonLineItem(
            order,
            customLineItem,
            name: "Service Add-on: Priority Slot",
            quantity: 1,
            amount: 10m,
            isTaxable: false,
            taxRate: 0m);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var shipmentResult = await _shipmentService.CreateShipmentAsync(new CreateShipmentParameters
        {
            OrderId = order.Id,
            LineItems = new Dictionary<Guid, int> { { productLineItem.Id, productLineItem.Quantity } }
        });
        shipmentResult.Success.ShouldBeTrue();

        // Act
        var summary = await _shipmentService.GetFulfillmentSummaryAsync(invoice.Id);

        // Assert
        summary.ShouldNotBeNull();

        var orderSummary = summary.Orders.Single(o => o.OrderId == order.Id);
        var mappedProductLineItem = orderSummary.LineItems.Single(li => li.Id == productLineItem.Id);
        var mappedCustomLineItem = orderSummary.LineItems.Single(li => li.Id == customLineItem.Id);

        mappedProductLineItem.RemainingQuantity.ShouldBe(0);
        mappedCustomLineItem.RemainingQuantity.ShouldBeGreaterThan(0);
        orderSummary.LineItems.ShouldNotContain(li => li.Id == addonLineItem.Id);
        orderSummary.LineItems.Any(li => li.RemainingQuantity > 0).ShouldBeTrue();
    }

    #endregion

    #region Helper Methods

    private async Task<(Order Order, LineItem LineItem, Product Product, Warehouse Warehouse)> SeedOrderWithLineItemAsync(OrderStatus status)
    {
        var builder = _fixture.CreateDataBuilder();

        var warehouse = builder.CreateWarehouse("Test Warehouse", "GB");
        var shippingOption = builder.CreateShippingOption("Standard Delivery", warehouse, fixedCost: 5.00m);
        shippingOption.ShippingCosts.Add(new ShippingCost { CountryCode = "GB", Cost = 5.00m });
        builder.AddServiceRegion(warehouse, "GB");

        var taxGroup = builder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = builder.CreateProductRoot("Test Product Root", taxGroup);
        var product = builder.CreateProduct("Test Product", productRoot, price: 25.00m);
        builder.AddWarehouseToProductRoot(productRoot, warehouse);
        builder.CreateProductWarehouse(product, warehouse, stock: 100);
        product.ShippingOptions.Add(shippingOption);

        var invoice = builder.CreateInvoice(total: 60m);
        var order = builder.CreateOrder(invoice, warehouse, shippingOption, status);
        var lineItem = builder.CreateLineItem(order, product, quantity: 2, amount: 25.00m, taxRate: 20m);

        await builder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return (order, lineItem, product, warehouse);
    }

    private async Task<Shipment> CreateShipmentAsync(Order order, LineItem lineItem)
    {
        var result = await _shipmentService.CreateShipmentAsync(new CreateShipmentParameters
        {
            OrderId = order.Id,
            LineItems = new Dictionary<Guid, int> { { lineItem.Id, lineItem.Quantity } },
            Carrier = "UPS",
            TrackingNumber = "TRACK-123"
        });

        result.Success.ShouldBeTrue();
        return result.ResultObject!;
    }

    private Address CreateAddress(string countryCode)
    {
        var builder = _fixture.CreateDataBuilder();
        return builder.CreateTestAddress(countryCode: countryCode);
    }

    #endregion
}
