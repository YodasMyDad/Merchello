using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Discounts.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Accounting.Services;

[Collection("Integration Tests")]
public class InvoiceEditServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IInvoiceEditService _invoiceEditService;
    private readonly IDiscountService _discountService;

    public InvoiceEditServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _invoiceEditService = fixture.GetService<IInvoiceEditService>();
        _discountService = fixture.GetService<IDiscountService>();
    }

    [Fact]
    public async Task EditInvoiceAsync_PhysicalCustomItemWithoutShippingOption_CreatesNoShippingOrder()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 0m);
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "CA");
        var shippingOption = dataBuilder.CreateShippingOption("Ground", warehouse, fixedCost: 8m);
        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        dataBuilder.CreateLineItem(order, name: "Existing Item", quantity: 1, amount: 25m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var parameters = new EditInvoiceParameters
        {
            InvoiceId = invoice.Id,
            Request = new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems =
                [
                    new AddCustomItemDto
                    {
                        Name = "Custom Box",
                        Sku = "CUST-BOX",
                        Price = 15m,
                        Cost = 5m,
                        Quantity = 1,
                        TaxGroupId = null,
                        IsPhysicalProduct = true,
                        WarehouseId = warehouse.Id,
                        ShippingOptionId = null
                    }
                ],
                ProductsToAdd = [],
                OrderDiscounts = [],
                OrderShippingUpdates = [],
                EditReason = "Add custom physical item with no shipping",
                ShouldRemoveTax = false
            },
            AuthorId = Guid.NewGuid(),
            AuthorName = "Test User"
        };

        // Act
        var result = await _invoiceEditService.EditInvoiceAsync(parameters);

        // Assert
        result.Success.ShouldBeTrue();
        result.Data.ShouldNotBeNull();
        result.Data.IsSuccessful.ShouldBeTrue();

        await using var db = _fixture.CreateDbContext();
        var persistedInvoice = await db.Invoices
            .Include(i => i.Orders!)
                .ThenInclude(o => o.LineItems)
            .FirstAsync(i => i.Id == invoice.Id);

        persistedInvoice.Orders.ShouldNotBeNull();
        persistedInvoice.Orders.Count.ShouldBe(2);

        var noShippingOrder = persistedInvoice.Orders
            .FirstOrDefault(o => o.WarehouseId == warehouse.Id && o.ShippingOptionId == Guid.Empty);

        noShippingOrder.ShouldNotBeNull();
        noShippingOrder.LineItems.ShouldNotBeNull();
        noShippingOrder.LineItems.Any(li => li.Name == "Custom Box").ShouldBeTrue();

        var editDto = await _invoiceEditService.GetInvoiceForEditAsync(invoice.Id);
        editDto.ShouldNotBeNull();
        editDto.Orders.Any(o => o.ShippingMethodName == "No Shipping").ShouldBeTrue();
    }

    [Fact]
    public async Task PreviewInvoiceEditAsync_OrderDiscountCode_IncludesDiscountInPreview()
    {
        // Arrange
        const string discountCode = "PHONE10";
        await CreateActiveCodeDiscountAsync(discountCode, 10m);

        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 0m);
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "CA");
        var shippingOption = dataBuilder.CreateShippingOption("Ground", warehouse, fixedCost: 0m);
        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        dataBuilder.CreateLineItem(
            order,
            name: "Existing Item",
            quantity: 1,
            amount: 100m,
            isTaxable: false,
            taxRate: 0m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var request = new EditInvoiceDto
        {
            LineItems = [],
            RemovedLineItems = [],
            RemovedOrderDiscounts = [],
            CustomItems = [],
            ProductsToAdd = [],
            OrderDiscounts = [],
            OrderDiscountCodes = [discountCode],
            OrderShippingUpdates = [],
            EditReason = "Apply phone discount code",
            ShouldRemoveTax = false
        };

        // Act
        var result = await _invoiceEditService.PreviewInvoiceEditAsync(invoice.Id, request);

        // Assert
        result.ShouldNotBeNull();
        result.DiscountTotal.ShouldBe(10m);
        result.AdjustedSubTotal.ShouldBe(90m);
    }

    [Fact]
    public async Task EditInvoiceAsync_OrderDiscountCode_AddsDiscountLineItemWithCodeMetadata()
    {
        // Arrange
        const string discountCode = "PHONE10";
        var discount = await CreateActiveCodeDiscountAsync(discountCode, 10m);

        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 0m);
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "CA");
        var shippingOption = dataBuilder.CreateShippingOption("Ground", warehouse, fixedCost: 0m);
        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        dataBuilder.CreateLineItem(
            order,
            name: "Existing Item",
            quantity: 1,
            amount: 100m,
            isTaxable: false,
            taxRate: 0m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var parameters = new EditInvoiceParameters
        {
            InvoiceId = invoice.Id,
            Request = new EditInvoiceDto
            {
                LineItems = [],
                RemovedLineItems = [],
                RemovedOrderDiscounts = [],
                CustomItems = [],
                ProductsToAdd = [],
                OrderDiscounts = [],
                OrderDiscountCodes = [discountCode],
                OrderShippingUpdates = [],
                EditReason = "Apply phone discount code",
                ShouldRemoveTax = false
            },
            AuthorId = Guid.NewGuid(),
            AuthorName = "Test User"
        };

        // Act
        var result = await _invoiceEditService.EditInvoiceAsync(parameters);

        // Assert
        result.Success.ShouldBeTrue();
        result.Data.ShouldNotBeNull();
        result.Data.IsSuccessful.ShouldBeTrue();

        await using var db = _fixture.CreateDbContext();
        var persistedInvoice = await db.Invoices
            .Include(i => i.Orders!)
                .ThenInclude(o => o.LineItems)
            .FirstAsync(i => i.Id == invoice.Id);

        var discountLineItem = (persistedInvoice.Orders ?? [])
            .SelectMany(o => o.LineItems ?? [])
            .FirstOrDefault(li =>
                li.LineItemType == LineItemType.Discount &&
                li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountCode, out var codeObj) &&
                string.Equals(codeObj?.ToString(), discountCode, StringComparison.OrdinalIgnoreCase));

        discountLineItem.ShouldNotBeNull();
        discountLineItem.Amount.ShouldBe(-10m);

        var discountId = discountLineItem.ExtendedData[Constants.ExtendedDataKeys.DiscountId]?.ToString();
        discountId.ShouldBe(discount.Id.ToString());

        var usage = await db.DiscountUsages
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.InvoiceId == invoice.Id && u.DiscountId == discount.Id);
        usage.ShouldNotBeNull();
        usage.Amount.ShouldBe(10m);
    }

    private async Task<Discount> CreateActiveCodeDiscountAsync(string code, decimal percentageValue)
    {
        var createResult = await _discountService.CreateAsync(new CreateDiscountParameters
        {
            Name = $"Test {code}",
            Category = DiscountCategory.AmountOffOrder,
            Method = DiscountMethod.Code,
            Code = code,
            ValueType = DiscountValueType.Percentage,
            Value = percentageValue,
            StartsAt = DateTime.UtcNow.AddMinutes(-5),
            RequirementType = DiscountRequirementType.None,
            CanCombineWithProductDiscounts = true,
            CanCombineWithOrderDiscounts = true,
            CanCombineWithShippingDiscounts = true,
            Priority = 1000
        });

        createResult.Success.ShouldBeTrue();
        createResult.ResultObject.ShouldNotBeNull();
        return createResult.ResultObject!;
    }
}
