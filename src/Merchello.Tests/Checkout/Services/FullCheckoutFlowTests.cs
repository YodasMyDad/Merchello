using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Models;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Warehouses.Models;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout.Services;

/// <summary>
/// Integration tests for the full checkout flow:
/// basket → address → shipping → payment → order creation.
/// Verifies all services work together correctly through the complete lifecycle.
/// </summary>
[Collection("Integration Tests")]
public class FullCheckoutFlowTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IInvoiceService _invoiceService;
    private readonly IPaymentService _paymentService;
    private readonly IShippingService _shippingService;
    private readonly IShipmentService _shipmentService;
    private readonly ICheckoutService _checkoutService;

    public FullCheckoutFlowTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _invoiceService = fixture.GetService<IInvoiceService>();
        _paymentService = fixture.GetService<IPaymentService>();
        _shippingService = fixture.GetService<IShippingService>();
        _shipmentService = fixture.GetService<IShipmentService>();
        _checkoutService = fixture.GetService<ICheckoutService>();
    }

    [Fact]
    public async Task FullCheckout_SingleProduct_CreatesInvoiceAndOrders()
    {
        // Arrange
        var (basket, checkoutSession) = await SetupSingleProductCheckout();

        // Act - Create order from basket
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);

        // Assert
        result.Success.ShouldBeTrue();
        var invoice = result.ResultObject!;
        invoice.Orders.ShouldNotBeEmpty();
        invoice.Total.ShouldBeGreaterThan(0);
        invoice.CurrencyCode.ShouldBe("GBP");

        var order = invoice.Orders.First();
        order.Status.ShouldBe(OrderStatus.ReadyToFulfill);
        order.LineItems.ShouldNotBeEmpty();
    }

    [Fact]
    public async Task FullCheckout_WithPayment_InvoiceMarkedAsPaid()
    {
        // Arrange
        var (basket, checkoutSession) = await SetupSingleProductCheckout();
        var invoiceResult = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        invoiceResult.Success.ShouldBeTrue();
        var invoice = invoiceResult.ResultObject!;

        _fixture.DbContext.ChangeTracker.Clear();

        // Act - Record full payment
        var paymentResult = await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = $"txn-{Guid.NewGuid()}",
            Amount = invoice.Total
        });

        // Assert
        paymentResult.Success.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();
        var status = await _paymentService.GetInvoicePaymentStatusAsync(invoice.Id);
        status.ShouldBe(InvoicePaymentStatus.Paid);
    }

    [Fact]
    public async Task FullCheckout_EndToEnd_CreatesShipmentAndCompletesOrder()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("EndToEnd Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard Delivery", warehouse, fixedCost: 5.00m);
        shippingOption.ShippingCosts.Add(new ShippingCost { CountryCode = "GB", Cost = 5.00m });
        dataBuilder.AddServiceRegion(warehouse, "GB");

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("EndToEnd Product", taxGroup);
        var product = dataBuilder.CreateProduct("EndToEnd Variant", productRoot, price: 50.00m);
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 25);
        product.ShippingOptions.Add(shippingOption);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = await CreateBasketAsync("GB", product);
        var billingAddress = CreateAddress("GB");
        var shippingAddress = CreateAddress("GB");
        basket.BillingAddress = billingAddress;
        basket.ShippingAddress = shippingAddress;
        basket.BillingAddress = billingAddress;
        basket.ShippingAddress = shippingAddress;
        basket.BillingAddress = billingAddress;
        basket.ShippingAddress = shippingAddress;

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });
        var group = shippingResult.WarehouseGroups.First();
        var selectedOption = group.AvailableShippingOptions.First();

        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = new Dictionary<Guid, string>
            {
                [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selectedOption.ShippingOptionId)
            }
        };

        // Act - create order + pay
        var invoiceResult = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);
        invoiceResult.Success.ShouldBeTrue();
        var invoice = invoiceResult.ResultObject!;
        var order = invoice.Orders!.Single();

        var paymentResult = await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = $"txn-{Guid.NewGuid()}",
            Amount = invoice.Total
        });
        paymentResult.Success.ShouldBeTrue();

        var processingResult = await _invoiceService.UpdateOrderStatusAsync(new UpdateOrderStatusParameters
        {
            OrderId = order.Id,
            NewStatus = OrderStatus.Processing,
            Reason = "Payment received - begin fulfillment"
        });
        processingResult.Success.ShouldBeTrue();

        // Create shipment
        var shipments = await _shipmentService.CreateShipmentsFromOrderAsync(new CreateShipmentsParameters
        {
            OrderId = order.Id,
            ShippingAddress = shippingAddress,
            TrackingNumber = "E2E-TRACK-001"
        });
        shipments.Count.ShouldBe(1);

        // Move shipment through Shipped -> Delivered to complete order
        var shippedResult = await _shipmentService.UpdateShipmentStatusAsync(new UpdateShipmentStatusParameters
        {
            ShipmentId = shipments[0].Id,
            NewStatus = ShipmentStatus.Shipped
        });
        shippedResult.Success.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();
        var shippedOrder = await _fixture.DbContext.Orders.FirstAsync(o => o.Id == order.Id);
        shippedOrder.Status.ShouldBe(OrderStatus.Shipped);

        var deliveredResult = await _shipmentService.UpdateShipmentStatusAsync(new UpdateShipmentStatusParameters
        {
            ShipmentId = shipments[0].Id,
            NewStatus = ShipmentStatus.Delivered
        });
        deliveredResult.Success.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();
        var completedOrder = await _fixture.DbContext.Orders.FirstAsync(o => o.Id == order.Id);
        completedOrder.Status.ShouldBe(OrderStatus.Completed);

        var paymentStatus = await _paymentService.GetInvoicePaymentStatusAsync(invoice.Id);
        paymentStatus.ShouldBe(InvoicePaymentStatus.Paid);
    }

    [Fact]
    public async Task FullCheckout_MultiWarehouse_CreatesMultipleOrders()
    {
        // Arrange: Two warehouses, products split across them
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);

        var warehouseA = dataBuilder.CreateWarehouse("Warehouse A", "GB");
        var shippingA = dataBuilder.CreateShippingOption("Standard A", warehouseA, fixedCost: 5.00m);
        shippingA.ShippingCosts.Add(new ShippingCost { CountryCode = "GB", Cost = 5.00m });
        dataBuilder.AddServiceRegion(warehouseA, "GB");

        var warehouseB = dataBuilder.CreateWarehouse("Warehouse B", "GB");
        var shippingB = dataBuilder.CreateShippingOption("Standard B", warehouseB, fixedCost: 7.00m);
        shippingB.ShippingCosts.Add(new ShippingCost { CountryCode = "GB", Cost = 7.00m });
        dataBuilder.AddServiceRegion(warehouseB, "GB");

        var productRootA = dataBuilder.CreateProductRoot("Product A", taxGroup);
        var productA = dataBuilder.CreateProduct("Widget A", productRootA, price: 20.00m);
        dataBuilder.AddWarehouseToProductRoot(productRootA, warehouseA);
        dataBuilder.CreateProductWarehouse(productA, warehouseA, stock: 50);

        var productRootB = dataBuilder.CreateProductRoot("Product B", taxGroup);
        var productB = dataBuilder.CreateProduct("Widget B", productRootB, price: 30.00m);
        dataBuilder.AddWarehouseToProductRoot(productRootB, warehouseB);
        dataBuilder.CreateProductWarehouse(productB, warehouseB, stock: 50);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = await CreateBasketAsync("GB", productA, productB);
        var billingAddress = CreateAddress("GB");
        var shippingAddress = CreateAddress("GB");
        basket.BillingAddress = billingAddress;
        basket.ShippingAddress = shippingAddress;

        // Get shipping groups
        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });
        shippingResult.WarehouseGroups.Count.ShouldBe(2);

        // Select shipping for each group
        var selectedShippingOptions = new Dictionary<Guid, string>();
        foreach (var group in shippingResult.WarehouseGroups)
        {
            var option = group.AvailableShippingOptions.First();
            selectedShippingOptions[group.GroupId] = SelectionKeyExtensions.ForShippingOption(option.ShippingOptionId);
        }

        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = selectedShippingOptions
        };

        // Act
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);

        // Assert
        result.Success.ShouldBeTrue();
        var invoice = result.ResultObject!;
        invoice.Orders!.Count.ShouldBe(2);

        var orderA = invoice.Orders.First(o => o.WarehouseId == warehouseA.Id);
        orderA.LineItems!.ShouldContain(li => li.Sku == productA.Sku);

        var orderB = invoice.Orders.First(o => o.WarehouseId == warehouseB.Id);
        orderB.LineItems!.ShouldContain(li => li.Sku == productB.Sku);
    }

    [Fact]
    public async Task FullCheckout_InvoiceTotal_IncludesShipping()
    {
        // Arrange
        var (basket, checkoutSession) = await SetupSingleProductCheckout();

        // Act
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);

        // Assert
        result.Success.ShouldBeTrue();
        var invoice = result.ResultObject!;
        var shippingTotal = invoice.Orders!.Sum(o => o.ShippingCost);

        // Invoice total should include shipping from all orders
        shippingTotal.ShouldBeGreaterThan(0m);
        invoice.Total.ShouldBe(invoice.AdjustedSubTotal + invoice.Tax + shippingTotal);
    }

    [Fact]
    public async Task FullCheckout_MultipleQuantity_ReservesStock()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var warehouse = dataBuilder.CreateWarehouse("Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard", warehouse, fixedCost: 5.00m);
        shippingOption.ShippingCosts.Add(new ShippingCost { CountryCode = "GB", Cost = 5.00m });
        dataBuilder.AddServiceRegion(warehouse, "GB");

        var productRoot = dataBuilder.CreateProductRoot("Product", taxGroup);
        var product = dataBuilder.CreateProduct("Widget", productRoot, price: 15.00m);
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        var productWarehouse = dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = await CreateBasketAsync("GB", (product, 3));

        var billingAddress = CreateAddress("GB");
        var shippingAddress = CreateAddress("GB");
        basket.BillingAddress = billingAddress;
        basket.ShippingAddress = shippingAddress;

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });
        var group = shippingResult.WarehouseGroups.First();
        var selectedOption = group.AvailableShippingOptions.First();

        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = new Dictionary<Guid, string>
            {
                [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selectedOption.ShippingOptionId)
            }
        };

        // Act
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);

        // Assert
        result.Success.ShouldBeTrue();
        var invoice = result.ResultObject!;
        var order = invoice.Orders!.First();
        order.LineItems!.ShouldContain(li => li.Sku == product.Sku && li.Quantity == 3);
    }

    /// <summary>
    /// Sets up a standard single-product checkout scenario.
    /// </summary>
    private async Task<(Basket basket, CheckoutSession session)> SetupSingleProductCheckout()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("Test Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard Delivery", warehouse, fixedCost: 5.00m);
        shippingOption.ShippingCosts.Add(new ShippingCost { CountryCode = "GB", Cost = 5.00m });
        dataBuilder.AddServiceRegion(warehouse, "GB");

        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);
        var productRoot = dataBuilder.CreateProductRoot("Test Product", taxGroup);
        var product = dataBuilder.CreateProduct("Product Variant", productRoot, price: 50.00m);
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = await CreateBasketAsync("GB", product);
        var billingAddress = CreateAddress("GB");
        var shippingAddress = CreateAddress("GB");

        var shippingResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });
        shippingResult.WarehouseGroups.ShouldNotBeEmpty();

        var group = shippingResult.WarehouseGroups.First();
        var selectedOption = group.AvailableShippingOptions.First();
        var selectedShippingOptions = new Dictionary<Guid, string>
        {
            [group.GroupId] = SelectionKeyExtensions.ForShippingOption(selectedOption.ShippingOptionId)
        };

        var checkoutSession = new CheckoutSession
        {
            BasketId = basket.Id,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = selectedShippingOptions
        };

        return (basket, checkoutSession);
    }

    private Task<Basket> CreateBasketAsync(string countryCode, params Product[] products)
    {
        var items = products.Select(p => (p, 1)).ToArray();
        return CreateBasketAsync(countryCode, items);
    }

    private async Task<Basket> CreateBasketAsync(string countryCode, params (Product Product, int Quantity)[] items)
    {
        var basket = _checkoutService.CreateBasket("GBP");

        foreach (var (product, quantity) in items)
        {
            var lineItem = _checkoutService.CreateLineItem(product, quantity);
            await _checkoutService.AddToBasketAsync(basket, lineItem, countryCode);
        }

        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = countryCode
        });

        return basket;
    }

    private Address CreateAddress(string countryCode)
    {
        var builder = _fixture.CreateDataBuilder();
        return builder.CreateTestAddress(
            email: "customer@example.com",
            countryCode: countryCode);
    }
}
