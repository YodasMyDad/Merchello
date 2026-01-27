using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Models;
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
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout.Services;

/// <summary>
/// Integration tests for the full checkout flow:
/// basket → address → shipping → payment → order creation.
/// Verifies all services work together correctly through the complete lifecycle.
/// </summary>
[Collection("Integration")]
public class FullCheckoutFlowTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IInvoiceService _invoiceService;
    private readonly IPaymentService _paymentService;
    private readonly IShippingService _shippingService;

    public FullCheckoutFlowTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _invoiceService = fixture.GetService<IInvoiceService>();
        _paymentService = fixture.GetService<IPaymentService>();
        _shippingService = fixture.GetService<IShippingService>();
    }

    [Fact]
    public async Task FullCheckout_SingleProduct_CreatesInvoiceAndOrders()
    {
        // Arrange
        var (basket, checkoutSession) = await SetupSingleProductCheckout();

        // Act - Create order from basket
        var result = await _invoiceService.CreateOrderFromBasketAsync(basket, checkoutSession);

        // Assert
        result.Successful.ShouldBeTrue();
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
        invoiceResult.Successful.ShouldBeTrue();
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
        paymentResult.Successful.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();
        var status = await _paymentService.GetInvoicePaymentStatusAsync(invoice.Id);
        status.ShouldBe(InvoicePaymentStatus.Paid);
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

        var basket = CreateBasket("GBP", productA, productB);
        var billingAddress = CreateAddress("GB");
        var shippingAddress = CreateAddress("GB");

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
        result.Successful.ShouldBeTrue();
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
        result.Successful.ShouldBeTrue();
        var invoice = result.ResultObject!;

        // Invoice should include product + shipping costs
        // Product: 50.00, Tax (20%): 10.00, Shipping: 5.00 = 65.00
        invoice.Total.ShouldBeGreaterThan(basket.Total);
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

        var basket = new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "GBP",
            LineItems =
            [
                new LineItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    Name = product.Name,
                    Sku = product.Sku,
                    Quantity = 3,
                    Amount = 15.00m,
                    LineItemType = LineItemType.Product,
                    IsTaxable = true,
                    TaxRate = 20m
                }
            ],
            SubTotal = 45.00m,
            Tax = 9.00m,
            Total = 54.00m
        };

        var billingAddress = CreateAddress("GB");
        var shippingAddress = CreateAddress("GB");

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
        result.Successful.ShouldBeTrue();
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

        var basket = CreateBasket("GBP", product);
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

    private static Basket CreateBasket(string currency, params Product[] products)
    {
        var lineItems = products.Select(p => new LineItem
        {
            Id = Guid.NewGuid(),
            ProductId = p.Id,
            Name = p.Name,
            Sku = p.Sku,
            Quantity = 1,
            Amount = p.Price,
            LineItemType = LineItemType.Product,
            IsTaxable = true,
            TaxRate = 20m
        }).ToList();

        var subTotal = lineItems.Sum(li => li.Amount * li.Quantity);
        var tax = Math.Round(subTotal * 0.2m, 2);

        return new Basket
        {
            Id = Guid.NewGuid(),
            Currency = currency,
            LineItems = lineItems,
            SubTotal = subTotal,
            Tax = tax,
            Total = subTotal + tax
        };
    }

    private static Address CreateAddress(string countryCode)
    {
        return new Address
        {
            Name = "Test Customer",
            Email = "test@example.com",
            AddressOne = "123 Test St",
            TownCity = "London",
            CountryCode = countryCode,
            PostalCode = "SW1A 1AA"
        };
    }
}
