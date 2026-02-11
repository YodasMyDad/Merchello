using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Factories;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Accounting.Handlers.Interfaces;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Services;
using Merchello.Core.Tax.Services.Interfaces;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Accounting;

/// <summary>
/// Integration tests for discount calculations in InvoiceService.
/// Tests various discount scenarios including line item discounts, order-level discounts,
/// combined discounts, tax calculations, edge cases, and removal scenarios.
/// </summary>
[Collection("Integration Tests")]
public class InvoiceDiscountCalculationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly InvoiceEditService _invoiceEditService;

    public InvoiceDiscountCalculationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _invoiceEditService = CreateInvoiceEditService();
    }

    private InvoiceEditService CreateInvoiceEditService()
    {
        var scopeProvider = CreateScopeProvider();
        var shippingService = new Mock<IShippingService>().Object;
        var shippingProviderManager = new Mock<IShippingProviderManager>().Object;
        var inventoryService = new Mock<IInventoryService>().Object;
        var settings = Options.Create(new MerchelloSettings { DefaultRounding = MidpointRounding.AwayFromZero, StoreCurrencyCode = "USD" });
        var currencyService = new CurrencyService(settings);
        var taxCalculationService = new TaxCalculationService(currencyService);
        var taxServiceMock = new Mock<ITaxService>();
        taxServiceMock.Setup(x => x.GetApplicableRateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0m);
        var taxProviderManager = new Mock<ITaxProviderManager>().Object;
        var strategyResolver = new Mock<IOrderGroupingStrategyResolver>().Object;
        var logger = new Mock<ILogger<InvoiceEditService>>().Object;

        // Factories
        var orderFactory = new OrderFactory();
        var lineItemFactory = new LineItemFactory(currencyService);
        var basketFactory = new BasketFactory();
        var lineItemService = new LineItemService(currencyService, taxCalculationService, lineItemFactory);

        return new InvoiceEditService(
            scopeProvider,
            shippingService,
            shippingProviderManager,
            inventoryService,
            currencyService,
            lineItemService,
            taxServiceMock.Object,
            taxProviderManager,
            strategyResolver,
            lineItemFactory,
            basketFactory,
            orderFactory,
            settings,
            logger);
    }

    private IEFCoreScopeProvider<MerchelloDbContext> CreateScopeProvider()
    {
        var scopeProviderMock = new Mock<IEFCoreScopeProvider<MerchelloDbContext>>();
        scopeProviderMock
            .Setup(p => p.CreateScope(It.IsAny<RepositoryCacheMode>(), It.IsAny<bool?>()))
            .Returns(() =>
            {
                var dbContext = _fixture.CreateDbContext();
                var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<InvoiceForEditDto?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<InvoiceForEditDto?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<EditInvoiceResultDto>>>()))
                    .Returns((Func<MerchelloDbContext, Task<EditInvoiceResultDto>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Core.Shared.OperationResult<EditInvoiceResultDto>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Core.Shared.OperationResult<EditInvoiceResultDto>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<PreviewEditResultDto?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<PreviewEditResultDto?>> func) => func(dbContext));

                scopeMock.Setup(s => s.Complete()).Returns(true);
                scopeMock.Setup(s => s.Dispose()).Callback(dbContext.Dispose);

                return scopeMock.Object;
            });

        return scopeProviderMock.Object;
    }

    #region A. Basic Line Item Discount Calculations

    [Theory]
    [InlineData(100, 10, 90)]      // £10 off £100 = £90
    [InlineData(100, 50, 50)]      // £50 off £100 = £50
    [InlineData(100, 100, 0)]      // £100 off £100 = £0
    [InlineData(69.00, 10, 59)]    // £10 off £69 = £59
    public async Task AmountDiscount_CalculatesCorrectSubtotal(
        decimal itemPrice, decimal discountAmount, decimal expectedAdjustedSubtotal)
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        var lineItem = builder.CreateLineItem(order, name: "Test Product", quantity: 1, amount: itemPrice);
        builder.CreateDiscountLineItem(order, lineItem, discountAmount, DiscountValueType.FixedAmount, discountAmount, "Test discount");
        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(itemPrice);
        result.DiscountTotal.ShouldBe(discountAmount);
        result.AdjustedSubTotal.ShouldBe(expectedAdjustedSubtotal);
    }

    [Theory]
    [InlineData(100, 10, 90)]      // 10% off £100 = £90
    [InlineData(100, 50, 50)]      // 50% off £100 = £50
    [InlineData(100, 100, 0)]      // 100% off £100 = £0
    [InlineData(69.00, 10, 62.10)] // 10% off £69 = £62.10
    public async Task PercentageDiscount_CalculatesCorrectSubtotal(
        decimal itemPrice, decimal discountPercent, decimal expectedAdjustedSubtotal)
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        var lineItem = builder.CreateLineItem(order, name: "Test Product", quantity: 1, amount: itemPrice);

        // Calculate the discount amount for the percentage
        var discountAmount = itemPrice * (discountPercent / 100m);
        builder.CreateDiscountLineItem(order, lineItem, discountAmount, DiscountValueType.Percentage, discountPercent, "Percentage discount");
        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(itemPrice);
        result.DiscountTotal.ShouldBe(discountAmount);
        result.AdjustedSubTotal.ShouldBe(expectedAdjustedSubtotal);
    }

    [Fact]
    public async Task MultipleLineItems_EachWithDiscount_CalculatesCorrectly()
    {
        // Arrange: 2 items, each with a 10% discount
        // Item 1: £60, 10% off = £6 discount
        // Item 2: £40, 10% off = £4 discount
        // Expected: SubTotal = £100, Discount = £10, AdjustedSubTotal = £90
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        var lineItem1 = builder.CreateLineItem(order, name: "Product 1", quantity: 1, amount: 60m);
        builder.CreateDiscountLineItem(order, lineItem1, 6m, DiscountValueType.Percentage, 10m, "10% off");

        var lineItem2 = builder.CreateLineItem(order, name: "Product 2", quantity: 1, amount: 40m);
        builder.CreateDiscountLineItem(order, lineItem2, 4m, DiscountValueType.Percentage, 10m, "10% off");

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(10m);
        result.AdjustedSubTotal.ShouldBe(90m);
    }

    #endregion

    #region B. Order-Level Discounts

    [Fact]
    public async Task OrderLevelDiscount_SingleItem_AppliesFullDiscount()
    {
        // Arrange: 1 item at £100, order discount of £10
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m);
        builder.CreateOrderLevelDiscount(order, 10m, DiscountValueType.FixedAmount, 10m, "SAVE10 Coupon");

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(10m);
        result.AdjustedSubTotal.ShouldBe(90m);
        result.OrderDiscounts.Count.ShouldBe(1);
        result.OrderDiscounts[0].Name.ShouldBe("SAVE10 Coupon");
    }

    [Fact]
    public async Task OrderLevelDiscount_MultipleItems_ProRatedCorrectly()
    {
        // Arrange: 2 items - £60 and £40 (both 20% tax)
        // Order discount: £10
        // Expected pro-rating: £6 off first (60%), £4 off second (40%)
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        builder.CreateLineItem(order, name: "Product 1", quantity: 1, amount: 60m, taxRate: 20m);
        builder.CreateLineItem(order, name: "Product 2", quantity: 1, amount: 40m, taxRate: 20m);
        builder.CreateOrderLevelDiscount(order, 10m, DiscountValueType.FixedAmount, 10m, "Order Coupon");

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(10m);
        result.AdjustedSubTotal.ShouldBe(90m);
        // Tax should be on £54 (60-6) + £36 (40-4) = £90, 20% = £18
        result.Tax.ShouldBe(18m);
        result.Total.ShouldBe(108m); // 90 + 18
    }

    [Fact]
    public async Task MultipleOrderLevelDiscounts_AllApplied()
    {
        // Arrange: £100 item with two order discounts (£5 and £10)
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m);
        builder.CreateOrderLevelDiscount(order, 5m, DiscountValueType.FixedAmount, 5m, "SAVE5");
        builder.CreateOrderLevelDiscount(order, 10m, DiscountValueType.FixedAmount, 10m, "EXTRA10");

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.DiscountTotal.ShouldBe(15m);
        result.AdjustedSubTotal.ShouldBe(85m);
        result.OrderDiscounts.Count.ShouldBe(2);
    }

    #endregion

    #region C. Combined Discounts (Line + Order Level)

    [Fact]
    public async Task CombinedDiscounts_LineItemAndOrderLevel_BothApplied()
    {
        // Arrange: £100 product, £10 line discount, then £5 order discount
        // Expected: SubTotal = £100, Discount = £15, AdjustedSubTotal = £85
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        builder.CreateDiscountLineItem(order, lineItem, 10m, DiscountValueType.FixedAmount, 10m, "Manual discount");
        builder.CreateOrderLevelDiscount(order, 5m, DiscountValueType.FixedAmount, 5m, "Coupon");

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(15m);
        result.AdjustedSubTotal.ShouldBe(85m);
        result.Tax.ShouldBe(17m); // 20% of 85
        result.Total.ShouldBe(102m); // 85 + 17
    }

    #endregion

    #region D. Tax Calculations with Discounts

    [Fact]
    public async Task TaxCalculatedOnDiscountedAmount_SingleItem()
    {
        // Arrange: £100 at 20% tax with £20 discount
        // Tax should be on £80, so £16
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        builder.CreateDiscountLineItem(order, lineItem, 20m, DiscountValueType.FixedAmount, 20m, "20 off");

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.AdjustedSubTotal.ShouldBe(80m);
        result.Tax.ShouldBe(16m); // 20% of 80
    }

    [Fact]
    public async Task TaxCalculatedOnDiscountedAmount_DifferentTaxRates()
    {
        // Arrange: Item 1 at £50 (20% tax), Item 2 at £50 (10% tax)
        // Discounts: £5 off each
        // Tax: (45 * 0.20) + (45 * 0.10) = 9 + 4.5 = 13.5
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        var lineItem1 = builder.CreateLineItem(order, name: "Product 1", quantity: 1, amount: 50m, taxRate: 20m);
        builder.CreateDiscountLineItem(order, lineItem1, 5m, DiscountValueType.FixedAmount, 5m, "Discount 1");

        var lineItem2 = builder.CreateLineItem(order, name: "Product 2", quantity: 1, amount: 50m, taxRate: 10m);
        builder.CreateDiscountLineItem(order, lineItem2, 5m, DiscountValueType.FixedAmount, 5m, "Discount 2");

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.AdjustedSubTotal.ShouldBe(90m);
        result.Tax.ShouldBe(13.5m); // (45*0.20) + (45*0.10)
    }

    [Fact]
    public async Task NonTaxableItemWithDiscount_NoTaxApplied()
    {
        // Arrange: Non-taxable item at £100 with £10 discount
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        var lineItem = builder.CreateLineItem(order, name: "Gift Card", quantity: 1, amount: 100m, isTaxable: false, taxRate: 0);
        builder.CreateDiscountLineItem(order, lineItem, 10m, DiscountValueType.FixedAmount, 10m, "Discount");

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.AdjustedSubTotal.ShouldBe(90m);
        result.Tax.ShouldBe(0m);
    }

    [Fact]
    public async Task TaxWithProRatedOrderDiscount_CalculatesCorrectly()
    {
        // Arrange: £60 (20% tax) + £40 (10% tax), with £10 order discount
        // Pro-rated: £6 off first (60%), £4 off second (40%)
        // Tax: (54 * 0.20) + (36 * 0.10) = 10.8 + 3.6 = 14.4
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        builder.CreateLineItem(order, name: "Product 1", quantity: 1, amount: 60m, taxRate: 20m);
        builder.CreateLineItem(order, name: "Product 2", quantity: 1, amount: 40m, taxRate: 10m);
        builder.CreateOrderLevelDiscount(order, 10m, DiscountValueType.FixedAmount, 10m, "Coupon");

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.AdjustedSubTotal.ShouldBe(90m);
        result.Tax.ShouldBe(14.4m);
    }

    #endregion

    #region E. Edge Cases

    [Fact]
    public async Task DiscountExceedsItemValue_CappedAtItemValue()
    {
        // Arrange: £50 item with £100 discount - should cap at £50
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 50m);
        // Note: In practice, the service should cap this, but we test what happens
        builder.CreateDiscountLineItem(order, lineItem, 100m, DiscountValueType.FixedAmount, 100m, "Huge discount");

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(50m);
        result.DiscountTotal.ShouldBe(50m); // Capped at subtotal, not 100
        result.AdjustedSubTotal.ShouldBe(0m); // 50 - 50 = 0, never negative
        result.Tax.ShouldBe(0m); // No tax on £0
    }

    [Fact]
    public async Task HundredPercentDiscount_ZeroTax()
    {
        // Arrange: £100 item with 100% discount
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        builder.CreateDiscountLineItem(order, lineItem, 100m, DiscountValueType.Percentage, 100m, "Free item");

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.AdjustedSubTotal.ShouldBe(0m);
        result.Tax.ShouldBe(0m);
    }

    [Fact]
    public async Task DiscountOnZeroValueItem_RemainZero()
    {
        // Arrange: £0 item with discount
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        var lineItem = builder.CreateLineItem(order, name: "Free Gift", quantity: 1, amount: 0m);
        builder.CreateDiscountLineItem(order, lineItem, 10m, DiscountValueType.FixedAmount, 10m, "Discount on free item");

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        // Should not go negative
        result.AdjustedSubTotal.ShouldBeGreaterThanOrEqualTo(0);
    }

    [Theory]
    [InlineData(33.33, 10, 3.33)]  // 10% of £33.33 = £3.333 -> rounds to £3.33
    [InlineData(66.67, 15, 10.00)] // 15% of £66.67 = £10.0005 -> rounds to £10.00
    public async Task PercentageWithRounding_HandledCorrectly(
        decimal itemPrice, decimal discountPercent, decimal expectedDiscount)
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 1, amount: itemPrice);
        var calculatedDiscount = Math.Round(itemPrice * (discountPercent / 100m), 2, MidpointRounding.AwayFromZero);
        builder.CreateDiscountLineItem(order, lineItem, calculatedDiscount, DiscountValueType.Percentage, discountPercent);

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        Math.Round(result.DiscountTotal, 2).ShouldBe(expectedDiscount);
    }

    #endregion

    #region F. Quantity Interactions

    [Fact]
    public async Task QuantityMultiple_DiscountAppliedCorrectly()
    {
        // Arrange: 3x £20 items with £5 per-unit discount
        // Total: £60, Discount: £15, Adjusted: £45
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 3, amount: 20m);
        builder.CreateDiscountLineItem(order, lineItem, 15m, DiscountValueType.FixedAmount, 5m, "£5 per unit");

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(60m); // 3 * 20
        result.DiscountTotal.ShouldBe(15m);
        result.AdjustedSubTotal.ShouldBe(45m);
    }

    #endregion

    #region G. Order Discount Visibility and Removal

    [Fact]
    public async Task GetInvoiceForEdit_ReturnsOrderDiscountsForDisplay()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m);
        builder.CreateOrderLevelDiscount(order, 10m, DiscountValueType.FixedAmount, 10m, "HOLIDAY10");
        builder.CreateOrderLevelDiscount(order, 5m, DiscountValueType.Percentage, 5m, "VIP5%");

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.OrderDiscounts.Count.ShouldBe(2);
        result.OrderDiscounts.ShouldContain(d => d.Name == "HOLIDAY10" && d.Type == DiscountValueType.FixedAmount);
        result.OrderDiscounts.ShouldContain(d => d.Name == "VIP5%" && d.Type == DiscountValueType.Percentage);
    }

    [Fact]
    public async Task EditInvoice_RemoveOrderDiscount_TotalsRecalculated()
    {
        // Arrange: Invoice with order discount
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        var discount = builder.CreateOrderLevelDiscount(order, 10m, DiscountValueType.FixedAmount, 10m, "Coupon");

        await builder.SaveChangesAsync();

        // Verify initial state
        var initialResult = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);
        initialResult.ShouldNotBeNull();
        initialResult.DiscountTotal.ShouldBe(10m);
        initialResult.OrderDiscounts.Count.ShouldBe(1);

        // Act: Remove the order discount
        var editResult = await _invoiceEditService.EditInvoiceAsync(new EditInvoiceParameters
        {
            InvoiceId = invoice.Id,
            Request = new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [discount.Id],
                CustomItems = [],
                OrderShippingUpdates = [],
                EditReason = "Test removal",
                ShouldRemoveTax = false
            },
            AuthorId = Guid.NewGuid(),
            AuthorName = "Test User"
        });

        // Assert
        editResult.Success.ShouldBeTrue();
        editResult.Data.ShouldNotBeNull();
        editResult.Data.IsSuccessful.ShouldBeTrue();

        // Verify updated state
        var updatedResult = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);
        updatedResult.ShouldNotBeNull();
        updatedResult.DiscountTotal.ShouldBe(0m);
        updatedResult.AdjustedSubTotal.ShouldBe(100m);
        updatedResult.Tax.ShouldBe(20m); // 20% of 100
        updatedResult.OrderDiscounts.Count.ShouldBe(0);
    }

    #endregion

    #region H. Shipping Costs

    [Fact]
    public async Task ShippingCostsNotAffectedByDiscounts()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        order.ShippingCost = 10m;

        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        builder.CreateDiscountLineItem(order, lineItem, 20m, DiscountValueType.FixedAmount, 20m, "Discount");

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.ShippingTotal.ShouldBe(10m);
        result.AdjustedSubTotal.ShouldBe(80m); // 100 - 20
        result.Tax.ShouldBe(16m); // 20% of 80
        result.Total.ShouldBe(106m); // 80 + 16 + 10 (shipping)
    }

    #endregion

    #region I. Preview Endpoint Tests

    [Fact]
    public async Task PreviewEdit_NoChanges_ReturnsCurrentTotals()
    {
        // Arrange: Invoice with item and discount
        // £10 per-unit discount * 2 qty = £20 total discount
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 2, amount: 50m, taxRate: 20m);
        builder.CreateDiscountLineItem(order, lineItem, 20m, DiscountValueType.FixedAmount, 10m, "Per-unit discount");
        await builder.SaveChangesAsync();

        // Act: Preview with no changes
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m); // 50 * 2
        result.DiscountTotal.ShouldBe(20m); // 10 * 2
        result.AdjustedSubTotal.ShouldBe(80m); // 100 - 20
        result.Tax.ShouldBe(16m); // 20% of 80
        result.Total.ShouldBe(96m); // 80 + 16
    }

    [Fact]
    public async Task PreviewEdit_QuantityChange_CalculatesNewTotals()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        await builder.SaveChangesAsync();

        // Act: Preview quantity change from 1 to 3
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [new EditLineItemDto { Id = lineItem.Id, Quantity = 3 }],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(300m); // 100 * 3
        result.Tax.ShouldBe(60m); // 20% of 300
        result.Total.ShouldBe(360m);
    }

    [Fact]
    public async Task PreviewEdit_AddDiscount_CalculatesNewTotals()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        await builder.SaveChangesAsync();

        // Act: Preview adding 20% discount
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [new EditLineItemDto
                {
                    Id = lineItem.Id,
                    Discount = new LineItemDiscountDto
                    {
                        Type = DiscountValueType.Percentage,
                        Value = 20
                    }
                }],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(20m); // 20% of 100
        result.AdjustedSubTotal.ShouldBe(80m);
        result.Tax.ShouldBe(16m); // 20% of 80
        result.Total.ShouldBe(96m);
    }

    [Fact]
    public async Task PreviewEdit_RemoveItem_ExcludesFromTotals()
    {
        // Arrange: 2 items
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        var lineItem1 = builder.CreateLineItem(order, name: "Product 1", quantity: 1, amount: 60m, taxRate: 20m);
        var lineItem2 = builder.CreateLineItem(order, name: "Product 2", quantity: 1, amount: 40m, taxRate: 20m);
        await builder.SaveChangesAsync();

        // Act: Preview removing first item
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [new RemoveLineItemDto { Id = lineItem1.Id }],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(40m); // Only second item
        result.Tax.ShouldBe(8m); // 20% of 40
        result.Total.ShouldBe(48m);
    }

    [Fact]
    public async Task PreviewEdit_AddCustomItem_IncludedInTotals()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var taxGroup = builder.CreateTaxGroup("Standard VAT", 20m);
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        await builder.SaveChangesAsync();

        // Act: Preview adding custom item
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [new AddCustomItemDto
                {
                    Name = "Custom Service",
                    Price = 50m,
                    Quantity = 1,
                    TaxGroupId = taxGroup.Id
                }],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(150m); // 100 + 50
        result.Tax.ShouldBe(30m); // 20% of 150
        result.Total.ShouldBe(180m);
    }

    [Fact]
    public async Task PreviewEdit_RemoveOrderDiscount_RecalculatesTotals()
    {
        // Arrange: Invoice with order discount
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        var discount = builder.CreateOrderLevelDiscount(order, 20m, DiscountValueType.FixedAmount, 20m, "Coupon");
        await builder.SaveChangesAsync();

        // Act: Preview removing order discount
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [discount.Id],
                CustomItems = [],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(0m); // Discount removed
        result.AdjustedSubTotal.ShouldBe(100m);
        result.Tax.ShouldBe(20m); // 20% of 100
        result.Total.ShouldBe(120m);
    }

    [Fact]
    public async Task PreviewEdit_UpdateShipping_IncludedInTotal()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        order.ShippingCost = 10m;
        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        await builder.SaveChangesAsync();

        // Act: Preview updating shipping cost
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderShippingUpdates = [new OrderShippingUpdateDto { OrderId = order.Id, ShippingCost = 25m }],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.ShippingTotal.ShouldBe(25m);
        result.Tax.ShouldBe(20m); // 20% of 100
        result.Total.ShouldBe(145m); // 100 + 20 + 25
    }

    [Fact]
    public async Task PreviewEdit_RemoveTax_ZeroTax()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        await builder.SaveChangesAsync();

        // Act: Preview with tax removed
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = true
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.Tax.ShouldBe(0m);
        result.Total.ShouldBe(100m);
    }

    [Fact]
    public async Task PreviewEdit_ReturnsLineItemPreviews()
    {
        // Arrange: Item with discount
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 2, amount: 50m, taxRate: 20m);
        builder.CreateDiscountLineItem(order, lineItem, 20m, DiscountValueType.FixedAmount, 10m, "Per unit discount");
        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.LineItems.ShouldNotBeEmpty();
        var preview = result.LineItems.FirstOrDefault(p => p.Id == lineItem.Id);
        preview.ShouldNotBeNull();
        preview.CalculatedTotal.ShouldBe(80m); // 100 - 20
        preview.DiscountAmount.ShouldBe(20m);
    }

    [Fact]
    public async Task PreviewEdit_DiscountExceedsValue_CapsAndWarns()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 50m, taxRate: 20m);
        await builder.SaveChangesAsync();

        // Act: Preview adding discount larger than item value
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [new EditLineItemDto
                {
                    Id = lineItem.Id,
                    Discount = new LineItemDiscountDto
                    {
                        Type = DiscountValueType.FixedAmount,
                        Value = 100 // More than £50 item
                    }
                }],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.DiscountTotal.ShouldBe(50m); // Capped at item value
        result.AdjustedSubTotal.ShouldBe(0m);
        result.Warnings.ShouldContain(w => w.Contains("capped"));
    }

    [Fact]
    public async Task PreviewEdit_NonExistentInvoice_ReturnsNull()
    {
        // Act
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            Guid.NewGuid(),
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task PreviewEdit_ComplexScenario_AllCalculationsCorrect()
    {
        // Arrange: Complex invoice with multiple items, discounts, shipping
        var builder = _fixture.CreateDataBuilder();
        var taxGroup = builder.CreateTaxGroup("Reduced VAT", 10m);
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        order.ShippingCost = 10m;

        var lineItem1 = builder.CreateLineItem(order, name: "Product 1", quantity: 2, amount: 60m, taxRate: 20m);
        builder.CreateDiscountLineItem(order, lineItem1, 12m, DiscountValueType.Percentage, 10m, "10% off");

        var lineItem2 = builder.CreateLineItem(order, name: "Product 2", quantity: 1, amount: 40m, taxRate: 10m);
        builder.CreateOrderLevelDiscount(order, 10m, DiscountValueType.FixedAmount, 10m, "Coupon");

        await builder.SaveChangesAsync();

        // Act: Preview with quantity change and custom item
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [new EditLineItemDto { Id = lineItem1.Id, Quantity = 3 }],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [new AddCustomItemDto
                {
                    Name = "Service Fee",
                    Price = 20m,
                    Quantity = 1,
                    TaxGroupId = taxGroup.Id
                }],
                OrderShippingUpdates = [new OrderShippingUpdateDto { OrderId = order.Id, ShippingCost = 15m }],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        // SubTotal: (60*3) + 40 + 20 = 180 + 40 + 20 = 240
        result.SubTotal.ShouldBe(240m);
        // Shipping: 15
        result.ShippingTotal.ShouldBe(15m);
        // Should have line item previews
        result.LineItems.ShouldNotBeEmpty();
    }

    #endregion

    #region J. Adding New Order Discounts

    [Fact]
    public async Task PreviewEdit_AddNewOrderDiscount_FixedAmount_CalculatesTotals()
    {
        // Arrange: Invoice with single item, no existing discounts
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        await builder.SaveChangesAsync();

        // Act: Preview adding £15 order discount
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderDiscounts = [new LineItemDiscountDto
                {
                    Type = DiscountValueType.FixedAmount,
                    Value = 15m,
                    Reason = "Goodwill gesture",
                    IsVisibleToCustomer = false
                }],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(15m);
        result.AdjustedSubTotal.ShouldBe(85m);
        result.Tax.ShouldBe(17m); // 20% of 85
        result.Total.ShouldBe(102m); // 85 + 17
    }

    [Fact]
    public async Task PreviewEdit_AddNewOrderDiscount_Percentage_CalculatesTotals()
    {
        // Arrange: Invoice with single item, no existing discounts
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        await builder.SaveChangesAsync();

        // Act: Preview adding 10% order discount
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderDiscounts = [new LineItemDiscountDto
                {
                    Type = DiscountValueType.Percentage,
                    Value = 10m,
                    Reason = "Customer loyalty",
                    IsVisibleToCustomer = true
                }],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(10m); // 10% of 100
        result.AdjustedSubTotal.ShouldBe(90m);
        result.Tax.ShouldBe(18m); // 20% of 90
        result.Total.ShouldBe(108m);
    }

    [Fact]
    public async Task PreviewEdit_AddMultipleNewOrderDiscounts_AllApplied()
    {
        // Arrange: Invoice with item
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        await builder.SaveChangesAsync();

        // Act: Preview adding £5 fixed + 10% percentage discounts
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderDiscounts = [
                    new LineItemDiscountDto
                    {
                        Type = DiscountValueType.FixedAmount,
                        Value = 5m,
                        Reason = "Apology credit"
                    },
                    new LineItemDiscountDto
                    {
                        Type = DiscountValueType.Percentage,
                        Value = 10m,
                        Reason = "VIP discount"
                    }
                ],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        // Fixed £5 + 10% of £100 = £5 + £10 = £15
        result.DiscountTotal.ShouldBe(15m);
        result.AdjustedSubTotal.ShouldBe(85m);
        result.Tax.ShouldBe(17m); // 20% of 85
        result.Total.ShouldBe(102m);
    }

    [Fact]
    public async Task PreviewEdit_AddNewOrderDiscount_WithExistingLineItemDiscount_BothApplied()
    {
        // Arrange: Invoice with item that has line item discount
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        builder.CreateDiscountLineItem(order, lineItem, 10m, DiscountValueType.FixedAmount, 10m, "Line discount");
        await builder.SaveChangesAsync();

        // Act: Add £5 order discount on top of existing line discount
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderDiscounts = [new LineItemDiscountDto
                {
                    Type = DiscountValueType.FixedAmount,
                    Value = 5m,
                    Reason = "Additional discount"
                }],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(15m); // £10 line + £5 order
        result.AdjustedSubTotal.ShouldBe(85m);
        result.Tax.ShouldBe(17m); // 20% of 85
        result.Total.ShouldBe(102m);
    }

    [Fact]
    public async Task PreviewEdit_AddNewOrderDiscount_MultipleItems_ProRatedForTax()
    {
        // Arrange: 2 items with different tax rates
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        builder.CreateLineItem(order, name: "Product 1", quantity: 1, amount: 60m, taxRate: 20m);
        builder.CreateLineItem(order, name: "Product 2", quantity: 1, amount: 40m, taxRate: 10m);
        await builder.SaveChangesAsync();

        // Act: Preview adding £10 order discount
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderDiscounts = [new LineItemDiscountDto
                {
                    Type = DiscountValueType.FixedAmount,
                    Value = 10m,
                    Reason = "Order discount"
                }],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(10m);
        result.AdjustedSubTotal.ShouldBe(90m);
        // Pro-rated discount: £6 off first (60%), £4 off second (40%)
        // Tax: (54 * 0.20) + (36 * 0.10) = 10.8 + 3.6 = 14.4
        result.Tax.ShouldBe(14.4m);
        result.Total.ShouldBe(104.4m); // 90 + 14.4
    }

    [Fact]
    public async Task PreviewEdit_AddNewOrderDiscount_ExceedsSubtotal_Capped()
    {
        // Arrange: Small order
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 50m, taxRate: 20m);
        await builder.SaveChangesAsync();

        // Act: Preview adding £100 order discount (exceeds £50 subtotal)
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderDiscounts = [new LineItemDiscountDto
                {
                    Type = DiscountValueType.FixedAmount,
                    Value = 100m,
                    Reason = "Massive discount"
                }],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(50m);
        result.DiscountTotal.ShouldBe(50m); // Capped at subtotal
        result.AdjustedSubTotal.ShouldBe(0m);
        result.Tax.ShouldBe(0m); // No tax on £0
        result.Warnings.ShouldContain(w => w.Contains("capped"));
    }

    [Fact]
    public async Task PreviewEdit_AddNewOrderDiscount_PercentageOver100_CappedAtSubtotal()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        await builder.SaveChangesAsync();

        // Act: Preview adding 150% discount
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderDiscounts = [new LineItemDiscountDto
                {
                    Type = DiscountValueType.Percentage,
                    Value = 150m // 150% would be £150, capped at £100
                }],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(100m); // Capped at subtotal
        result.AdjustedSubTotal.ShouldBe(0m);
        result.Warnings.ShouldContain(w => w.Contains("capped"));
    }

    [Fact]
    public async Task EditInvoice_AddNewOrderDiscount_PersistsAndRecalculates()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        await builder.SaveChangesAsync();

        // Verify initial state - no discounts
        var initialResult = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);
        initialResult.ShouldNotBeNull();
        initialResult.DiscountTotal.ShouldBe(0m);
        initialResult.OrderDiscounts.Count.ShouldBe(0);

        // Act: Add order discount
        var editResult = await _invoiceEditService.EditInvoiceAsync(new EditInvoiceParameters
        {
            InvoiceId = invoice.Id,
            Request = new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderDiscounts = [new LineItemDiscountDto
                {
                    DisplayName = "Manual goodwill",
                    Type = DiscountValueType.FixedAmount,
                    Value = 20m,
                    Reason = "Customer compensation",
                    IsVisibleToCustomer = true
                }],
                OrderShippingUpdates = [],
                EditReason = "Adding goodwill discount",
                ShouldRemoveTax = false
            },
            AuthorId = Guid.NewGuid(),
            AuthorName = "Test User"
        });

        // Assert
        editResult.Success.ShouldBeTrue();
        editResult.Data.ShouldNotBeNull();
        editResult.Data.IsSuccessful.ShouldBeTrue();

        // Verify persisted state
        var updatedResult = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);
        updatedResult.ShouldNotBeNull();
        updatedResult.SubTotal.ShouldBe(100m);
        updatedResult.DiscountTotal.ShouldBe(20m);
        updatedResult.AdjustedSubTotal.ShouldBe(80m);
        updatedResult.Tax.ShouldBe(16m); // 20% of 80
        updatedResult.OrderDiscounts.Count.ShouldBe(1);
        updatedResult.OrderDiscounts[0].Name.ShouldBe("Manual goodwill");
        updatedResult.OrderDiscounts[0].Reason.ShouldBe("Customer compensation");
        updatedResult.OrderDiscounts[0].Value.ShouldBe(20m);
        updatedResult.OrderDiscounts[0].Type.ShouldBe(DiscountValueType.FixedAmount);
    }

    [Fact]
    public async Task EditInvoice_AddLineItemDiscount_PersistsDisplayNameAndReason()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        await builder.SaveChangesAsync();

        // Act
        var editResult = await _invoiceEditService.EditInvoiceAsync(new EditInvoiceParameters
        {
            InvoiceId = invoice.Id,
            Request = new EditInvoiceDto
            {
                LineItems = [new EditLineItemDto
                {
                    Id = lineItem.Id,
                    Discount = new LineItemDiscountDto
                    {
                        DisplayName = "Manager adjustment",
                        Type = DiscountValueType.FixedAmount,
                        Value = 10m,
                        Reason = "Damaged packaging",
                        IsVisibleToCustomer = true
                    }
                }],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderDiscounts = [],
                OrderShippingUpdates = [],
                EditReason = "Add manual line discount",
                ShouldRemoveTax = false
            },
            AuthorId = Guid.NewGuid(),
            AuthorName = "Test User"
        });

        // Assert
        editResult.Success.ShouldBeTrue();

        var updatedResult = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);
        updatedResult.ShouldNotBeNull();
        var updatedLineItem = updatedResult.Orders
            .SelectMany(o => o.LineItems)
            .First(li => li.Id == lineItem.Id);

        updatedLineItem.Discounts.Count.ShouldBe(1);
        updatedLineItem.Discounts[0].Name.ShouldBe("Manager adjustment");
        updatedLineItem.Discounts[0].Reason.ShouldBe("Damaged packaging");
        updatedLineItem.Discounts[0].IsVisibleToCustomer.ShouldBeTrue();
    }

    [Fact]
    public async Task EditInvoice_AddNewOrderDiscount_Percentage_PersistsCorrectly()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 80m, taxRate: 20m);
        await builder.SaveChangesAsync();

        // Act: Add 25% order discount
        var editResult = await _invoiceEditService.EditInvoiceAsync(new EditInvoiceParameters
        {
            InvoiceId = invoice.Id,
            Request = new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderDiscounts = [new LineItemDiscountDto
                {
                    Type = DiscountValueType.Percentage,
                    Value = 25m,
                    Reason = "VIP 25% off"
                }],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            },
            AuthorId = Guid.NewGuid(),
            AuthorName = "Test User"
        });

        // Assert
        editResult.Success.ShouldBeTrue();

        // Verify: 25% of £80 = £20 discount
        var updatedResult = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);
        updatedResult.ShouldNotBeNull();
        updatedResult.SubTotal.ShouldBe(80m);
        updatedResult.DiscountTotal.ShouldBe(20m);
        updatedResult.AdjustedSubTotal.ShouldBe(60m);
        updatedResult.Tax.ShouldBe(12m); // 20% of 60
        updatedResult.Total.ShouldBe(72m);
    }

    [Fact]
    public async Task PreviewEdit_AddNewOrderDiscount_WithShipping_ShippingUnaffected()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        order.ShippingCost = 10m;
        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        await builder.SaveChangesAsync();

        // Act: Add order discount
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderDiscounts = [new LineItemDiscountDto
                {
                    Type = DiscountValueType.FixedAmount,
                    Value = 20m
                }],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(20m);
        result.AdjustedSubTotal.ShouldBe(80m);
        result.ShippingTotal.ShouldBe(10m); // Shipping not affected by discount
        result.Tax.ShouldBe(16m); // 20% of 80
        result.Total.ShouldBe(106m); // 80 + 16 + 10
    }

    [Fact]
    public async Task PreviewEdit_AddNewOrderDiscount_CombinedWithExistingOrderDiscount()
    {
        // Arrange: Invoice with existing order discount
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);
        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);
        builder.CreateOrderLevelDiscount(order, 10m, DiscountValueType.FixedAmount, 10m, "Existing coupon");
        await builder.SaveChangesAsync();

        // Act: Add another order discount
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(
            invoice.Id,
            new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                OrderDiscounts = [new LineItemDiscountDto
                {
                    Type = DiscountValueType.FixedAmount,
                    Value = 5m,
                    Reason = "Additional discount"
                }],
                OrderShippingUpdates = [],
                EditReason = null,
                ShouldRemoveTax = false
            });

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(15m); // £10 existing + £5 new
        result.AdjustedSubTotal.ShouldBe(85m);
        result.Tax.ShouldBe(17m); // 20% of 85
        result.Total.ShouldBe(102m);
    }

    #endregion

    #region K. After-Tax Discount Calculations

    /// <summary>
    /// Tests that an after-tax percentage discount is correctly reverse-calculated.
    /// Customer sees: £100 + 20% tax = £120 total, 10% off = £12 saving, pays £108
    /// Internal: £12 ÷ 1.20 = £10 pre-tax discount applied
    /// </summary>
    [Fact]
    public async Task AfterTaxDiscount_SingleTaxRate_PercentageDiscount_CalculatesCorrectly()
    {
        // Arrange: £100 item at 20% tax = £120 total
        // 10% after-tax discount = £12 saving (what customer expects)
        // Pre-tax discount = £12 ÷ 1.20 = £10
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);

        // The discount amount stored should be the after-tax amount (£12),
        // but the system will reverse-calculate to apply £10 pre-tax
        builder.CreateOrderLevelDiscount(
            order,
            discountAmount: 12m, // After-tax discount amount
            discountValueType: DiscountValueType.Percentage,
            discountValue: 10m, // 10% off
            name: "10% off total",
            applyAfterTax: true);

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(10m); // Pre-tax discount applied
        result.AdjustedSubTotal.ShouldBe(90m);
        result.Tax.ShouldBe(18m); // 20% of £90
        result.Total.ShouldBe(108m); // Customer pays £108 (saved £12 from original £120)
    }

    /// <summary>
    /// Tests after-tax discount with mixed tax rates, ensuring correct pro-rating.
    /// Item A: £60 @ 20% = £72 after tax
    /// Item B: £40 @ 10% = £44 after tax
    /// Total: £116 after tax
    /// 10% off = £11.60 saving
    /// Pro-rated pre-tax: £6 off A, £4 off B = £10 total
    /// </summary>
    [Fact]
    public async Task AfterTaxDiscount_MixedTaxRates_ProRatesCorrectly()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        builder.CreateLineItem(order, name: "Product A", quantity: 1, amount: 60m, taxRate: 20m);
        builder.CreateLineItem(order, name: "Product B", quantity: 1, amount: 40m, taxRate: 10m);

        // 10% off after-tax total (£116) = £11.60 displayed saving
        builder.CreateOrderLevelDiscount(
            order,
            discountAmount: 11.60m,
            discountValueType: DiscountValueType.Percentage,
            discountValue: 10m,
            name: "10% off total",
            applyAfterTax: true);

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(10m); // Pre-tax discount: £6 + £4
        result.AdjustedSubTotal.ShouldBe(90m);
        // Tax: (54 × 0.20) + (36 × 0.10) = 10.8 + 3.6 = 14.4
        result.Tax.ShouldBe(14.4m);
        result.Total.ShouldBe(104.4m); // Customer saved £11.60 from £116
    }

    /// <summary>
    /// Tests fixed amount after-tax discount.
    /// £100 @ 20% = £120 total
    /// £24 off after tax → £24 ÷ 1.20 = £20 pre-tax
    /// </summary>
    [Fact]
    public async Task AfterTaxDiscount_FixedAmount_CalculatesCorrectly()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);

        // £24 fixed after-tax discount
        builder.CreateOrderLevelDiscount(
            order,
            discountAmount: 24m,
            discountValueType: DiscountValueType.FixedAmount,
            discountValue: 24m,
            name: "£24 off total",
            applyAfterTax: true);

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(20m); // £24 ÷ 1.20 = £20 pre-tax
        result.AdjustedSubTotal.ShouldBe(80m);
        result.Tax.ShouldBe(16m); // 20% of £80
        result.Total.ShouldBe(96m); // Customer pays £96 (saved £24 from £120)
    }

    /// <summary>
    /// Tests that when tax rate is 0%, after-tax discount equals before-tax.
    /// </summary>
    [Fact]
    public async Task AfterTaxDiscount_ZeroTaxRate_SameAsBeforeTax()
    {
        // Arrange: £100 at 0% tax, 10% discount = £10 either way
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 0m);

        builder.CreateOrderLevelDiscount(
            order,
            discountAmount: 10m,
            discountValueType: DiscountValueType.Percentage,
            discountValue: 10m,
            name: "10% off",
            applyAfterTax: true);

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(10m); // Same as before-tax
        result.AdjustedSubTotal.ShouldBe(90m);
        result.Tax.ShouldBe(0m);
        result.Total.ShouldBe(90m);
    }

    /// <summary>
    /// Tests that discount cannot exceed the total - should cap at 100%.
    /// </summary>
    [Fact]
    public async Task AfterTaxDiscount_ExceedingTotal_CapsAtTotal()
    {
        // Arrange: £100 at 20% = £120 total
        // £150 after-tax discount (exceeds total)
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);

        builder.CreateOrderLevelDiscount(
            order,
            discountAmount: 150m,
            discountValueType: DiscountValueType.FixedAmount,
            discountValue: 150m,
            name: "£150 off",
            applyAfterTax: true);

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(100m); // Capped at subtotal
        result.AdjustedSubTotal.ShouldBe(0m);
        result.Tax.ShouldBe(0m);
        result.Total.ShouldBe(0m);
    }

    /// <summary>
    /// Tests a linked (SKU-specific) after-tax discount.
    /// </summary>
    [Fact]
    public async Task AfterTaxDiscount_LinkedToSpecificItem_CalculatesCorrectly()
    {
        // Arrange: £50 item at 20% tax = £60 after tax
        // 10% off this item after tax = £6 saving, £5 pre-tax
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        var lineItem = builder.CreateLineItem(order, name: "Discounted Product", quantity: 1, amount: 50m, taxRate: 20m);
        builder.CreateLineItem(order, name: "Other Product", quantity: 1, amount: 30m, taxRate: 20m);

        builder.CreateDiscountLineItem(
            order,
            lineItem,
            discountAmount: 6m, // After-tax amount
            discountValueType: DiscountValueType.Percentage,
            discountValue: 10m,
            reason: "10% off this item",
            applyAfterTax: true);

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(80m); // £50 + £30
        result.DiscountTotal.ShouldBe(5m); // £6 ÷ 1.20 = £5 pre-tax
        result.AdjustedSubTotal.ShouldBe(75m);
        // Tax: (45 × 0.20) + (30 × 0.20) = 9 + 6 = 15
        result.Tax.ShouldBe(15m);
        result.Total.ShouldBe(90m);
    }

    /// <summary>
    /// Tests combining a before-tax discount with an after-tax discount.
    /// </summary>
    [Fact]
    public async Task AfterTaxDiscount_CombinedWithBeforeTaxDiscount_CalculatesCorrectly()
    {
        // Arrange: £100 at 20% tax
        // First: £10 before-tax discount → subtotal = £90, tax = £18, total = £108
        // Second: 10% after-tax discount on £108 = £10.80 saving
        // Pre-tax: £10.80 ÷ 1.20 = £9 additional discount
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        var lineItem = builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);

        // Before-tax discount
        builder.CreateOrderLevelDiscount(
            order,
            discountAmount: 10m,
            discountValueType: DiscountValueType.FixedAmount,
            discountValue: 10m,
            name: "£10 off",
            applyAfterTax: false);

        // After-tax discount (applied to remaining total after first discount)
        builder.CreateOrderLevelDiscount(
            order,
            discountAmount: 10.80m,
            discountValueType: DiscountValueType.Percentage,
            discountValue: 10m,
            name: "10% off total",
            applyAfterTax: true);

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(19m); // £10 + £9 pre-tax
        result.AdjustedSubTotal.ShouldBe(81m);
        result.Tax.ShouldBe(16.2m); // 20% of £81
        result.Total.ShouldBe(97.2m);
    }

    /// <summary>
    /// Tests that non-taxable items are handled correctly with after-tax discounts.
    /// Only taxable items should participate in the after-tax calculation.
    /// </summary>
    [Fact]
    public async Task AfterTaxDiscount_WithNonTaxableItems_OnlyConsidersTaxableItems()
    {
        // Arrange: £50 taxable at 20% + £50 non-taxable
        // After-tax total of taxable portion = £60
        // 10% off after tax = £6 saving on taxable portion
        // Pre-tax: £6 ÷ 1.20 = £5
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        builder.CreateLineItem(order, name: "Taxable Product", quantity: 1, amount: 50m, taxRate: 20m);
        builder.CreateLineItem(order, name: "Gift Card", quantity: 1, amount: 50m, isTaxable: false, taxRate: 0m);

        // 10% after-tax discount - only applies to taxable amount
        builder.CreateOrderLevelDiscount(
            order,
            discountAmount: 6m, // 10% of £60 (taxable after-tax total)
            discountValueType: DiscountValueType.Percentage,
            discountValue: 10m,
            name: "10% off",
            applyAfterTax: true);

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(100m);
        result.DiscountTotal.ShouldBe(5m); // Only £5 pre-tax from taxable item
        result.AdjustedSubTotal.ShouldBe(95m);
        result.Tax.ShouldBe(9m); // 20% of £45
        result.Total.ShouldBe(104m);
    }

    /// <summary>
    /// Parameterized test for various after-tax discount scenarios.
    /// </summary>
    [Theory]
    [InlineData(100, 20, 10, 10)]   // £100 @ 20%, 10% off → £10 pre-tax discount
    [InlineData(100, 10, 10, 10)]   // £100 @ 10%, 10% off → £10 pre-tax discount
    [InlineData(200, 20, 25, 50)]   // £200 @ 20%, 25% off → £50 pre-tax discount
    [InlineData(50, 5, 20, 10)]     // £50 @ 5%, 20% off → £10 pre-tax discount
    public async Task AfterTaxDiscount_VariousTaxRates_CalculatesCorrectPreTaxDiscount(
        decimal subtotal,
        decimal taxRate,
        decimal discountPercent,
        decimal expectedPreTaxDiscount)
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: subtotal, taxRate: taxRate);

        // Calculate after-tax total and discount
        var afterTaxTotal = subtotal * (1 + taxRate / 100m);
        var afterTaxDiscountAmount = afterTaxTotal * (discountPercent / 100m);

        builder.CreateOrderLevelDiscount(
            order,
            discountAmount: afterTaxDiscountAmount,
            discountValueType: DiscountValueType.Percentage,
            discountValue: discountPercent,
            name: $"{discountPercent}% off",
            applyAfterTax: true);

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.SubTotal.ShouldBe(subtotal);
        result.DiscountTotal.ShouldBe(expectedPreTaxDiscount);
        result.AdjustedSubTotal.ShouldBe(subtotal - expectedPreTaxDiscount);
    }

    /// <summary>
    /// Tests that the final total matches customer expectation.
    /// Customer sees £120 total, expects 10% off = £108 final.
    /// </summary>
    [Fact]
    public async Task AfterTaxDiscount_FinalTotalMatchesCustomerExpectation()
    {
        // Arrange: Customer sees £120 total, expects to pay £108 (10% off)
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 0);
        var warehouse = builder.CreateWarehouse();
        var order = builder.CreateOrder(invoice, warehouse, status: OrderStatus.Pending);

        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, taxRate: 20m);

        builder.CreateOrderLevelDiscount(
            order,
            discountAmount: 12m, // 10% of £120
            discountValueType: DiscountValueType.Percentage,
            discountValue: 10m,
            name: "10% off",
            applyAfterTax: true);

        await builder.SaveChangesAsync();

        // Act
        var result = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);

        // Assert - Customer expectation: £120 - £12 = £108
        result.ShouldNotBeNull();
        result.Total.ShouldBe(108m);
    }

    #endregion
}
