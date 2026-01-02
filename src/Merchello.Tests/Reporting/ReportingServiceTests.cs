using Merchello.Core.Accounting.Models;
using Merchello.Core.Reporting.Services;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Reporting;

/// <summary>
/// Tests for ReportingService, specifically testing profit calculations
/// that use LineItem.Cost for accurate profit margins.
/// </summary>
[Collection("IntegrationTests")]
public class ReportingServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ReportingService _reportingService;

    public ReportingServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();

        var scopeProvider = _fixture.GetService<Umbraco.Cms.Persistence.EFCore.Scoping.IEFCoreScopeProvider<Merchello.Core.Data.MerchelloDbContext>>();
        _reportingService = new ReportingService(scopeProvider);
    }

    #region GetSalesBreakdownAsync - Profit Calculation Tests

    [Fact]
    public async Task GetSalesBreakdownAsync_CalculatesProfitFromProductCosts()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();

        var invoice = builder.CreateInvoice(total: 120m);
        invoice.SubTotal = 100m;
        invoice.Tax = 20m;
        invoice.DateCreated = DateTime.UtcNow;

        var order = builder.CreateOrder(invoice: invoice, status: OrderStatus.Processing);

        // Product with 40% margin (cost = £60, price = £100)
        builder.CreateLineItem(order, name: "Product A", quantity: 1, amount: 100m, cost: 60m);

        await builder.SaveChangesAsync();

        // Act
        var breakdown = await _reportingService.GetSalesBreakdownAsync(
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow.AddDays(1));

        // Assert
        breakdown.GrossSales.ShouldBe(100m);
        breakdown.TotalCost.ShouldBe(60m);
        breakdown.GrossProfit.ShouldBe(40m); // 100 - 60
        breakdown.GrossProfitMargin.ShouldBe(40m); // 40/100 * 100 = 40%
    }

    [Fact]
    public async Task GetSalesBreakdownAsync_IncludesAddonCostsInProfitCalculation()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();

        var invoice = builder.CreateInvoice(total: 150m);
        invoice.SubTotal = 125m;
        invoice.Tax = 25m;
        invoice.DateCreated = DateTime.UtcNow;

        var order = builder.CreateOrder(invoice: invoice, status: OrderStatus.Processing);

        // Product: price £100, cost £60
        var productLineItem = builder.CreateLineItem(order, name: "Product A", quantity: 1, amount: 100m, cost: 60m);

        // Add-on: price £25, cost £10
        builder.CreateAddonLineItem(order, productLineItem, name: "Gift Wrapping", quantity: 1, amount: 25m, cost: 10m);

        await builder.SaveChangesAsync();

        // Act
        var breakdown = await _reportingService.GetSalesBreakdownAsync(
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow.AddDays(1));

        // Assert
        breakdown.GrossSales.ShouldBe(125m); // 100 + 25
        breakdown.TotalCost.ShouldBe(70m); // 60 + 10
        breakdown.GrossProfit.ShouldBe(55m); // 125 - 70
        breakdown.GrossProfitMargin.ShouldBe(44m); // 55/125 * 100 = 44%
    }

    [Fact]
    public async Task GetSalesBreakdownAsync_MultipleOrdersWithVariousCosts()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();

        // Invoice 1: Product with high margin
        var invoice1 = builder.CreateInvoice(customerEmail: "customer1@test.com", total: 60m);
        invoice1.SubTotal = 50m;
        invoice1.Tax = 10m;
        invoice1.DateCreated = DateTime.UtcNow;

        var order1 = builder.CreateOrder(invoice: invoice1, status: OrderStatus.Processing);
        builder.CreateLineItem(order1, name: "High Margin Product", quantity: 1, amount: 50m, cost: 10m);

        // Invoice 2: Product with low margin
        var invoice2 = builder.CreateInvoice(customerEmail: "customer2@test.com", total: 120m);
        invoice2.SubTotal = 100m;
        invoice2.Tax = 20m;
        invoice2.DateCreated = DateTime.UtcNow;

        var order2 = builder.CreateOrder(invoice: invoice2, status: OrderStatus.Processing);
        builder.CreateLineItem(order2, name: "Low Margin Product", quantity: 2, amount: 50m, cost: 40m);

        await builder.SaveChangesAsync();

        // Act
        var breakdown = await _reportingService.GetSalesBreakdownAsync(
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow.AddDays(1));

        // Assert
        breakdown.GrossSales.ShouldBe(150m); // 50 + 100
        breakdown.TotalCost.ShouldBe(90m); // 10 + (40 * 2)
        breakdown.GrossProfit.ShouldBe(60m); // 150 - 90
        breakdown.GrossProfitMargin.ShouldBe(40m); // 60/150 * 100 = 40%
    }

    [Fact]
    public async Task GetSalesBreakdownAsync_WithZeroCost_Shows100PercentMargin()
    {
        // Arrange - Digital products with zero cost
        var builder = _fixture.CreateDataBuilder();

        var invoice = builder.CreateInvoice(total: 24m);
        invoice.SubTotal = 20m;
        invoice.Tax = 4m;
        invoice.DateCreated = DateTime.UtcNow;

        var order = builder.CreateOrder(invoice: invoice, status: OrderStatus.Processing);
        builder.CreateLineItem(order, name: "Digital Download", quantity: 1, amount: 20m, cost: 0m);

        await builder.SaveChangesAsync();

        // Act
        var breakdown = await _reportingService.GetSalesBreakdownAsync(
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow.AddDays(1));

        // Assert
        breakdown.GrossSales.ShouldBe(20m);
        breakdown.TotalCost.ShouldBe(0m);
        breakdown.GrossProfit.ShouldBe(20m);
        breakdown.GrossProfitMargin.ShouldBe(100m); // 100% profit on digital
    }

    [Fact]
    public async Task GetSalesBreakdownAsync_WithDiscounts_CalculatesProfitOnNetSales()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();

        var invoice = builder.CreateInvoice(total: 108m);
        invoice.SubTotal = 100m;
        invoice.Discount = 10m; // £10 discount applied
        invoice.Tax = 18m; // Tax on discounted amount
        invoice.DateCreated = DateTime.UtcNow;

        var order = builder.CreateOrder(invoice: invoice, status: OrderStatus.Processing);
        builder.CreateLineItem(order, name: "Discounted Product", quantity: 1, amount: 100m, cost: 50m);

        await builder.SaveChangesAsync();

        // Act
        var breakdown = await _reportingService.GetSalesBreakdownAsync(
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow.AddDays(1));

        // Assert
        breakdown.GrossSales.ShouldBe(100m);
        breakdown.Discounts.ShouldBe(10m);
        breakdown.NetSales.ShouldBe(90m); // 100 - 10
        breakdown.TotalCost.ShouldBe(50m);
        breakdown.GrossProfit.ShouldBe(40m); // 90 - 50
        // Margin based on net sales: 40/90 * 100 = 44.44%
        breakdown.GrossProfitMargin.ShouldBe(44.44m);
    }

    [Fact]
    public async Task GetSalesBreakdownAsync_ExcludesDeletedInvoices()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();

        // Active invoice
        var activeInvoice = builder.CreateInvoice(customerEmail: "active@test.com", total: 60m);
        activeInvoice.SubTotal = 50m;
        activeInvoice.Tax = 10m;
        activeInvoice.DateCreated = DateTime.UtcNow;

        var activeOrder = builder.CreateOrder(invoice: activeInvoice, status: OrderStatus.Processing);
        builder.CreateLineItem(activeOrder, name: "Active Product", quantity: 1, amount: 50m, cost: 20m);

        // Deleted invoice (should be excluded)
        var deletedInvoice = builder.CreateInvoice(customerEmail: "deleted@test.com", total: 200m);
        deletedInvoice.SubTotal = 200m;
        deletedInvoice.IsDeleted = true;
        deletedInvoice.DateCreated = DateTime.UtcNow;

        var deletedOrder = builder.CreateOrder(invoice: deletedInvoice, status: OrderStatus.Processing);
        builder.CreateLineItem(deletedOrder, name: "Deleted Product", quantity: 1, amount: 200m, cost: 100m);

        await builder.SaveChangesAsync();

        // Act
        var breakdown = await _reportingService.GetSalesBreakdownAsync(
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow.AddDays(1));

        // Assert - Only active invoice should be included
        breakdown.GrossSales.ShouldBe(50m);
        breakdown.TotalCost.ShouldBe(20m);
        breakdown.GrossProfit.ShouldBe(30m);
    }

    [Fact]
    public async Task GetSalesBreakdownAsync_WithNoInvoices_ReturnsZeros()
    {
        // Arrange - Empty database (already reset in constructor)

        // Act
        var breakdown = await _reportingService.GetSalesBreakdownAsync(
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow.AddDays(1));

        // Assert
        breakdown.GrossSales.ShouldBe(0m);
        breakdown.TotalCost.ShouldBe(0m);
        breakdown.GrossProfit.ShouldBe(0m);
        breakdown.GrossProfitMargin.ShouldBe(0m);
    }

    [Fact]
    public async Task GetSalesBreakdownAsync_ComparesWithPreviousPeriod()
    {
        // Arrange
        var builder = _fixture.CreateDataBuilder();

        // Current period: £100 sales, £40 cost = £60 profit
        var currentInvoice = builder.CreateInvoice(customerEmail: "current@test.com", total: 120m);
        currentInvoice.SubTotal = 100m;
        currentInvoice.Tax = 20m;
        currentInvoice.DateCreated = DateTime.UtcNow;

        var currentOrder = builder.CreateOrder(invoice: currentInvoice, status: OrderStatus.Processing);
        builder.CreateLineItem(currentOrder, name: "Current Product", quantity: 1, amount: 100m, cost: 40m);

        // Previous period: £50 sales, £30 cost = £20 profit
        var previousInvoice = builder.CreateInvoice(customerEmail: "previous@test.com", total: 60m);
        previousInvoice.SubTotal = 50m;
        previousInvoice.Tax = 10m;
        previousInvoice.DateCreated = DateTime.UtcNow.AddDays(-10);

        var previousOrder = builder.CreateOrder(invoice: previousInvoice, status: OrderStatus.Processing);
        builder.CreateLineItem(previousOrder, name: "Previous Product", quantity: 1, amount: 50m, cost: 30m);

        await builder.SaveChangesAsync();

        // Act - Query last 5 days (current period)
        var breakdown = await _reportingService.GetSalesBreakdownAsync(
            DateTime.UtcNow.AddDays(-5),
            DateTime.UtcNow);

        // Assert - Current period values
        breakdown.GrossSales.ShouldBe(100m);
        breakdown.TotalCost.ShouldBe(40m);
        breakdown.GrossProfit.ShouldBe(60m);
        breakdown.GrossProfitMargin.ShouldBe(60m);

        // Comparison shows improvement (60% margin vs previous 40%)
        breakdown.GrossProfitMarginChange.ShouldBe(20m); // 60 - 40 = +20 percentage points
    }

    [Fact]
    public async Task GetSalesBreakdownAsync_IncludesCustomLineItemCosts()
    {
        // Arrange - Custom line items (e.g., service items) should also be included
        var builder = _fixture.CreateDataBuilder();

        var invoice = builder.CreateInvoice(total: 150m);
        invoice.SubTotal = 125m;
        invoice.Tax = 25m;
        invoice.DateCreated = DateTime.UtcNow;

        var order = builder.CreateOrder(invoice: invoice, status: OrderStatus.Processing);

        // Product line item
        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, cost: 50m);

        // Custom line item (e.g., installation service)
        builder.CreateLineItem(order, name: "Installation Service", quantity: 1, amount: 25m, cost: 15m,
            lineItemType: LineItemType.Custom);

        await builder.SaveChangesAsync();

        // Act
        var breakdown = await _reportingService.GetSalesBreakdownAsync(
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow.AddDays(1));

        // Assert - Both Product and Custom costs included
        breakdown.GrossSales.ShouldBe(125m);
        breakdown.TotalCost.ShouldBe(65m); // 50 + 15
        breakdown.GrossProfit.ShouldBe(60m); // 125 - 65
    }

    [Fact]
    public async Task GetSalesBreakdownAsync_ExcludesShippingAndDiscountCosts()
    {
        // Arrange - Shipping and Discount line items should NOT be in cost calculation
        var builder = _fixture.CreateDataBuilder();

        var invoice = builder.CreateInvoice(total: 120m);
        invoice.SubTotal = 100m;
        invoice.Tax = 20m;
        invoice.DateCreated = DateTime.UtcNow;

        var order = builder.CreateOrder(invoice: invoice, status: OrderStatus.Processing);
        order.ShippingCost = 10m;

        // Product with cost
        builder.CreateLineItem(order, name: "Product", quantity: 1, amount: 100m, cost: 40m);

        // Shipping line item (cost should be ignored in profit calc)
        builder.CreateLineItem(order, name: "Shipping", quantity: 1, amount: 10m, cost: 5m,
            lineItemType: LineItemType.Shipping);

        // Discount line item (cost should be ignored)
        builder.CreateLineItem(order, name: "Discount", quantity: 1, amount: -10m, cost: 0m,
            lineItemType: LineItemType.Discount);

        await builder.SaveChangesAsync();

        // Act
        var breakdown = await _reportingService.GetSalesBreakdownAsync(
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow.AddDays(1));

        // Assert - Only Product cost included
        breakdown.TotalCost.ShouldBe(40m);
    }

    #endregion
}
