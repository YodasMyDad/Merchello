using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
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

    public InvoiceEditServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _invoiceEditService = fixture.GetService<IInvoiceEditService>();
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
}
