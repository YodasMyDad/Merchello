using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Factories;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Locality.Models;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Accounting.Services;

/// <summary>
/// Integration tests for InvoiceService - manages invoices, orders, and their lifecycle.
/// </summary>
[Collection("Integration Tests")]
public class InvoiceServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IInvoiceService _invoiceService;
    private readonly BasketFactory _basketFactory = new();
    private readonly AddressFactory _addressFactory = new();

    public InvoiceServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _invoiceService = fixture.GetService<IInvoiceService>();
    }

    #region Query Tests

    [Fact]
    public async Task QueryInvoices_WithNoFilters_ReturnsAllInvoices()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _invoiceService.QueryInvoices(new InvoiceQueryParameters());

        // Assert
        result.ShouldNotBeNull();
        result.Items.Count().ShouldBe(3);
    }

    [Fact]
    public async Task QueryInvoices_WithPagination_ReturnsCorrectPage()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        for (var i = 0; i < 10; i++)
        {
            dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        }
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _invoiceService.QueryInvoices(new InvoiceQueryParameters
        {
            CurrentPage = 2,
            AmountPerPage = 3
        });

        // Assert
        result.ShouldNotBeNull();
        result.Items.Count().ShouldBe(3);
        result.PageIndex.ShouldBe(2);
        result.TotalItems.ShouldBe(10);
    }

    [Fact]
    public async Task QueryInvoices_FiltersByEmail()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer1 = dataBuilder.CreateCustomer(email: "customer1@example.com");
        var customer2 = dataBuilder.CreateCustomer(email: "customer2@example.com");
        dataBuilder.CreateInvoiceWithOrders(orderCount: 1, customer: customer1);
        dataBuilder.CreateInvoiceWithOrders(orderCount: 1, customer: customer1);
        dataBuilder.CreateInvoiceWithOrders(orderCount: 1, customer: customer2);
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _invoiceService.QueryInvoices(new InvoiceQueryParameters
        {
            Search = "customer1@example.com"
        });

        // Assert
        result.ShouldNotBeNull();
        result.Items.Count().ShouldBe(2);
        result.Items.All(i => i.BillingAddress?.Email == "customer1@example.com").ShouldBeTrue();
    }

    [Fact]
    public async Task QueryInvoices_SortsByDateDescending()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice1 = dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        var invoice2 = dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        var invoice3 = dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        invoice1.DateCreated = DateTime.UtcNow.AddDays(-3);
        invoice2.DateCreated = DateTime.UtcNow.AddDays(-1);
        invoice3.DateCreated = DateTime.UtcNow;
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _invoiceService.QueryInvoices(new InvoiceQueryParameters
        {
            OrderBy = InvoiceOrderBy.DateDesc
        });

        // Assert
        result.ShouldNotBeNull();
        result.Items.ElementAt(0).DateCreated.ShouldBeGreaterThan(result.Items.ElementAt(1).DateCreated);
        result.Items.ElementAt(1).DateCreated.ShouldBeGreaterThan(result.Items.ElementAt(2).DateCreated);
    }

    [Fact]
    public async Task QueryInvoices_SortsByTotalAscending_WithoutSqliteCompareErrors()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice1 = dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        var invoice2 = dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        var invoice3 = dataBuilder.CreateInvoiceWithOrders(orderCount: 1);

        invoice1.Total = 99.95m;
        invoice1.TotalInStoreCurrency = 99.95m;

        invoice2.Total = 19.99m;
        invoice2.TotalInStoreCurrency = 19.99m;

        invoice3.Total = 49.50m;
        invoice3.TotalInStoreCurrency = 49.50m;

        await dataBuilder.SaveChangesAsync();

        var result = await _invoiceService.QueryInvoices(new InvoiceQueryParameters
        {
            OrderBy = InvoiceOrderBy.TotalAsc,
            CurrentPage = 1,
            AmountPerPage = 20
        });

        result.Items.Count().ShouldBe(3);

        var ordered = result.Items.ToList();
        ordered[0].Id.ShouldBe(invoice2.Id);
        ordered[1].Id.ShouldBe(invoice3.Id);
        ordered[2].Id.ShouldBe(invoice1.Id);
    }

    #endregion

    #region Get Invoice Tests

    [Fact]
    public async Task GetInvoiceAsync_WithValidId_ReturnsCompleteInvoice()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoiceWithOrders(orderCount: 2, lineItemsPerOrder: 3);
        await dataBuilder.SaveChangesAsync();

        // Clear change tracker to force fresh load
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _invoiceService.GetInvoiceAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.Id.ShouldBe(invoice.Id);
        result.Orders.ShouldNotBeNull();
        result.Orders!.Count.ShouldBe(2);
        result.Orders.All(o => o.LineItems?.Count == 3).ShouldBeTrue();
    }

    [Fact]
    public async Task GetInvoiceAsync_WithInvalidId_ReturnsNull()
    {
        // Act
        var result = await _invoiceService.GetInvoiceAsync(Guid.NewGuid());

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetInvoiceAsync_IncludesOrdersAndLineItems()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoiceWithOrders(orderCount: 1, lineItemsPerOrder: 5);
        await dataBuilder.SaveChangesAsync();

        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _invoiceService.GetInvoiceAsync(invoice.Id);

        // Assert
        result.ShouldNotBeNull();
        result.Orders.ShouldNotBeNull();
        result.Orders!.Count.ShouldBe(1);

        var order = result.Orders.First();
        order.LineItems.ShouldNotBeNull();
        order.LineItems!.Count.ShouldBe(5);
    }

    #endregion

    #region Order Status Tests

    [Fact]
    public async Task UpdateOrderStatusAsync_PendingToProcessing_Succeeds()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        var order = invoice.Orders!.First();
        order.Status = OrderStatus.Pending;
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _invoiceService.UpdateOrderStatusAsync(new UpdateOrderStatusParameters
        {
            OrderId = order.Id,
            NewStatus = OrderStatus.Processing
        });

        // Assert
        result.Messages.ShouldBeEmpty();
        result.ResultObject.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();
        var updatedOrder = await _invoiceService.GetOrderWithDetailsAsync(order.Id);
        updatedOrder.ShouldNotBeNull();
        updatedOrder.Status.ShouldBe(OrderStatus.Processing);
    }

    [Fact]
    public async Task UpdateOrderStatusAsync_WithNonExistentOrder_ReturnsError()
    {
        // Act
        var result = await _invoiceService.UpdateOrderStatusAsync(new UpdateOrderStatusParameters
        {
            OrderId = Guid.NewGuid(),
            NewStatus = OrderStatus.Processing
        });

        // Assert
        result.Messages.ShouldNotBeEmpty();
        result.ResultObject.ShouldBeFalse();
    }

    [Fact]
    public async Task CancelOrderAsync_PendingOrder_CancelsSuccessfully()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        var order = invoice.Orders!.First();
        order.Status = OrderStatus.Pending;
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _invoiceService.CancelOrderAsync(order.Id, "Test cancellation");

        // Assert
        result.Messages.ShouldBeEmpty();
        result.ResultObject.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();
        var cancelledOrder = await _invoiceService.GetOrderWithDetailsAsync(order.Id);
        cancelledOrder.ShouldNotBeNull();
        cancelledOrder.Status.ShouldBe(OrderStatus.Cancelled);
        cancelledOrder.CancellationReason.ShouldBe("Test cancellation");
    }

    [Fact]
    public async Task CancelOrderAsync_AlreadyShippedOrder_ReturnsError()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        var order = invoice.Orders!.First();
        order.Status = OrderStatus.Shipped;
        order.ShippedDate = DateTime.UtcNow;
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _invoiceService.CancelOrderAsync(order.Id, "Trying to cancel shipped order");

        // Assert
        result.Messages.ShouldNotBeEmpty();
        result.ResultObject.ShouldBeFalse();
    }

    #endregion

    #region Invoice Cancellation Tests

    [Fact]
    public async Task CancelInvoiceAsync_CancelsAllPendingOrders()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoiceWithOrders(orderCount: 3);
        foreach (var order in invoice.Orders!)
        {
            order.Status = OrderStatus.Pending;
        }
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _invoiceService.CancelInvoiceAsync(new CancelInvoiceParameters
        {
            InvoiceId = invoice.Id,
            Reason = "Bulk cancellation test"
        });

        // Assert
        result.Messages.ShouldBeEmpty();
        result.ResultObject.ShouldBe(3); // All 3 orders cancelled

        _fixture.DbContext.ChangeTracker.Clear();
        var cancelledInvoice = await _invoiceService.GetInvoiceAsync(invoice.Id);
        cancelledInvoice!.Orders!.All(o => o.Status == OrderStatus.Cancelled).ShouldBeTrue();
    }

    [Fact]
    public async Task CancelInvoiceAsync_SkipsShippedOrders()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoiceWithOrders(orderCount: 3);
        var orders = invoice.Orders!.ToList();
        orders[0].Status = OrderStatus.Pending;
        orders[1].Status = OrderStatus.Shipped;
        orders[1].ShippedDate = DateTime.UtcNow;
        orders[2].Status = OrderStatus.Pending;
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _invoiceService.CancelInvoiceAsync(new CancelInvoiceParameters
        {
            InvoiceId = invoice.Id,
            Reason = "Partial cancellation"
        });

        // Assert
        result.Messages.ShouldBeEmpty();
        result.ResultObject.ShouldBe(2); // Only 2 orders cancelled (shipped one skipped)
    }

    [Fact]
    public async Task CancelInvoiceAsync_WithNonExistentInvoice_ReturnsError()
    {
        // Act
        var result = await _invoiceService.CancelInvoiceAsync(new CancelInvoiceParameters
        {
            InvoiceId = Guid.NewGuid(),
            Reason = "Should fail"
        });

        // Assert
        result.Messages.ShouldNotBeEmpty();
    }

    #endregion

    #region Address/Notes Tests

    [Fact]
    public async Task UpdateBillingAddressAsync_UpdatesAddress()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        await dataBuilder.SaveChangesAsync();

        var newAddress = _addressFactory.CreateFromFormData(
            firstName: "New",
            lastName: "Name",
            address1: "123 New Street",
            address2: null,
            city: "New City",
            postalCode: "12345",
            countryCode: "US",
            regionCode: null,
            phone: null,
            email: "newemail@example.com");

        // Act
        var result = await _invoiceService.UpdateBillingAddressAsync(invoice.Id, newAddress);

        // Assert
        result.Messages.ShouldBeEmpty();
        result.ResultObject.ShouldNotBeNull();

        _fixture.DbContext.ChangeTracker.Clear();
        var updatedInvoice = await _invoiceService.GetInvoiceAsync(invoice.Id);
        updatedInvoice!.BillingAddress.ShouldNotBeNull();
        updatedInvoice.BillingAddress.Name.ShouldBe("New Name");
        updatedInvoice.BillingAddress.Email.ShouldBe("newemail@example.com");
    }

    [Fact]
    public async Task UpdateShippingAddressAsync_UpdatesAddress()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        await dataBuilder.SaveChangesAsync();

        var newAddress = _addressFactory.CreateFromFormData(
            firstName: "Shipping",
            lastName: "Name",
            address1: "456 Ship Street",
            address2: null,
            city: "Ship City",
            postalCode: "SW1A 1AA",
            countryCode: "GB",
            regionCode: null,
            phone: null,
            email: null);

        // Act
        var result = await _invoiceService.UpdateShippingAddressAsync(invoice.Id, newAddress);

        // Assert
        result.Messages.ShouldBeEmpty();
        result.ResultObject.ShouldNotBeNull();

        _fixture.DbContext.ChangeTracker.Clear();
        var updatedInvoice = await _invoiceService.GetInvoiceAsync(invoice.Id);
        updatedInvoice!.ShippingAddress.ShouldNotBeNull();
        updatedInvoice.ShippingAddress.Name.ShouldBe("Shipping Name");
        updatedInvoice.ShippingAddress.AddressOne.ShouldBe("456 Ship Street");
    }

    [Fact]
    public async Task AddNoteAsync_AddsTimelineNote()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _invoiceService.AddNoteAsync(new AddInvoiceNoteParameters
        {
            InvoiceId = invoice.Id,
            Text = "Test note content",
            AuthorName = "Test Author",
            VisibleToCustomer = false
        });

        // Assert
        result.Messages.ShouldBeEmpty();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject!.Description.ShouldBe("Test note content");
        result.ResultObject.Author.ShouldBe("Test Author");
        result.ResultObject.VisibleToCustomer.ShouldBeFalse();
    }

    #endregion


    #region Invoice Count Tests

    [Fact]
    public async Task GetInvoiceCountAsync_ReturnsCorrectCount()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        await dataBuilder.SaveChangesAsync();

        // Act
        var count = await _invoiceService.GetInvoiceCountAsync();

        // Assert
        count.ShouldBe(3);
    }

    [Fact]
    public async Task GetInvoiceCountByBillingEmailAsync_ReturnsCorrectCount()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer1 = dataBuilder.CreateCustomer(email: "repeat@example.com");
        dataBuilder.CreateInvoiceWithOrders(orderCount: 1, customer: customer1);
        dataBuilder.CreateInvoiceWithOrders(orderCount: 1, customer: customer1);
        dataBuilder.CreateInvoiceWithOrders(orderCount: 1); // Different customer
        await dataBuilder.SaveChangesAsync();

        // Act
        var count = await _invoiceService.GetInvoiceCountByBillingEmailAsync("repeat@example.com");

        // Assert
        count.ShouldBe(2);
    }

    #endregion

    #region Invoice Exists Tests

    [Fact]
    public async Task InvoiceExistsAsync_WithExistingInvoice_ReturnsTrue()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        await dataBuilder.SaveChangesAsync();

        // Act
        var exists = await _invoiceService.InvoiceExistsAsync(invoice.Id);

        // Assert
        exists.ShouldBeTrue();
    }

    [Fact]
    public async Task InvoiceExistsAsync_WithNonExistingInvoice_ReturnsFalse()
    {
        // Act
        var exists = await _invoiceService.InvoiceExistsAsync(Guid.NewGuid());

        // Assert
        exists.ShouldBeFalse();
    }

    #endregion

    #region Soft Delete Tests

    [Fact]
    public async Task SoftDeleteInvoicesAsync_MarksInvoicesAsDeleted()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice1 = dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        var invoice2 = dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        var invoice3 = dataBuilder.CreateInvoiceWithOrders(orderCount: 1);
        await dataBuilder.SaveChangesAsync();

        // Act
        var deletedCount = await _invoiceService.SoftDeleteInvoicesAsync([invoice1.Id, invoice2.Id]);

        // Assert
        deletedCount.ShouldBe(2);

        // Verify deleted invoices are excluded from queries (if implemented)
        _fixture.DbContext.ChangeTracker.Clear();
        var remaining = await _invoiceService.QueryInvoices(new InvoiceQueryParameters());
        remaining.Items.Count().ShouldBe(1);
        remaining.Items.First().Id.ShouldBe(invoice3.Id);
    }

    #endregion

    #region Get Invoices By Email Tests

    [Fact]
    public async Task GetInvoicesByBillingEmailAsync_ReturnsCustomerInvoices()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer(email: "loyal@example.com");
        dataBuilder.CreateInvoiceWithOrders(orderCount: 1, customer: customer);
        dataBuilder.CreateInvoiceWithOrders(orderCount: 1, customer: customer);
        dataBuilder.CreateInvoiceWithOrders(orderCount: 1); // Different customer
        await dataBuilder.SaveChangesAsync();

        // Act
        var invoices = await _invoiceService.GetInvoicesByBillingEmailAsync("loyal@example.com");

        // Assert
        invoices.Count.ShouldBe(2);
        invoices.All(i => i.BillingAddress?.Email == "loyal@example.com").ShouldBeTrue();
    }

    #endregion

    #region GetUnpaidInvoiceForBasketAsync Tests

    [Fact]
    public async Task GetUnpaidInvoiceForBasketAsync_WithExistingUnpaidInvoice_ReturnsInvoice()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();

        // Use fixed timestamps to avoid timing issues
        var basketTime = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);
        var invoiceTime = new DateTime(2026, 1, 1, 10, 5, 0, DateTimeKind.Utc); // 5 mins after basket

        // Create a basket with line items
        var basket = CreateBasket(
            basketTime,
            basketTime,
            "GBP",
            ("PROD-001", 2),
            ("PROD-002", 1));
        _fixture.DbContext.Baskets.Add(basket);

        // Create an invoice with matching line items
        var invoice = dataBuilder.CreateInvoice(customer: customer);
        invoice.BasketId = basket.Id;
        invoice.DateCreated = invoiceTime;
        invoice.DateUpdated = invoiceTime;

        // Add order with matching line items
        var warehouse = dataBuilder.CreateWarehouse();
        var shippingOption = dataBuilder.CreateShippingOption(warehouse: warehouse);
        var order = dataBuilder.CreateOrder(invoice: invoice, warehouse: warehouse, shippingOption: shippingOption);
        CreateOrderLineItem(order, "PROD-001", 2);
        CreateOrderLineItem(order, "PROD-002", 1);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _invoiceService.GetUnpaidInvoiceForBasketAsync(basket.Id);

        // Assert
        result.ShouldNotBeNull();
        result.Id.ShouldBe(invoice.Id);
    }

    [Fact]
    public async Task GetUnpaidInvoiceForBasketAsync_WithPaidInvoice_ReturnsNull()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();

        // Create a basket
        var basket = CreateBasket(
            DateTime.UtcNow.AddMinutes(-10),
            DateTime.UtcNow.AddMinutes(-10),
            "GBP");
        _fixture.DbContext.Baskets.Add(basket);

        // Create an invoice linked to the basket
        var invoice = dataBuilder.CreateInvoice(customer: customer);
        invoice.BasketId = basket.Id;
        invoice.DateCreated = DateTime.UtcNow.AddMinutes(-5);

        // Add a successful payment
        var payment = dataBuilder.CreatePayment(invoice);
        payment.PaymentSuccess = true;
        payment.PaymentType = Core.Payments.Models.PaymentType.Payment;

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _invoiceService.GetUnpaidInvoiceForBasketAsync(basket.Id);

        // Assert - should return null because invoice is already paid
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetUnpaidInvoiceForBasketAsync_WithModifiedBasket_ReturnsNull()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();

        // Create a basket that was modified AFTER invoice creation
        var basket = CreateBasket(
            DateTime.UtcNow.AddMinutes(-10),
            DateTime.UtcNow,
            "GBP");
        _fixture.DbContext.Baskets.Add(basket);

        // Create an invoice linked to the basket (created before basket was modified)
        var invoice = dataBuilder.CreateInvoice(customer: customer);
        invoice.BasketId = basket.Id;
        invoice.DateCreated = DateTime.UtcNow.AddMinutes(-5); // Created before basket was updated

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _invoiceService.GetUnpaidInvoiceForBasketAsync(basket.Id);

        // Assert - should return null because basket was modified after invoice creation
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetUnpaidInvoiceForBasketAsync_WithNoExistingInvoice_ReturnsNull()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();

        // Create a basket with no associated invoice
        var basket = CreateBasket(DateTime.UtcNow, DateTime.UtcNow, "GBP");
        _fixture.DbContext.Baskets.Add(basket);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _invoiceService.GetUnpaidInvoiceForBasketAsync(basket.Id);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetUnpaidInvoiceForBasketAsync_WithNonExistentBasket_ReturnsNull()
    {
        // Act
        var result = await _invoiceService.GetUnpaidInvoiceForBasketAsync(Guid.NewGuid());

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetUnpaidInvoiceForBasketAsync_WithDifferentSku_ReturnsNull()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();

        var basketTime = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);
        var invoiceTime = new DateTime(2026, 1, 1, 10, 5, 0, DateTimeKind.Utc);

        // Create basket with one SKU
        var basket = CreateBasket(
            basketTime,
            basketTime,
            "GBP",
            ("PROD-NEW", 2));
        _fixture.DbContext.Baskets.Add(basket);

        // Create invoice with different SKU
        var invoice = dataBuilder.CreateInvoice(customer: customer);
        invoice.BasketId = basket.Id;
        invoice.DateCreated = invoiceTime;
        invoice.DateUpdated = invoiceTime;

        var warehouse = dataBuilder.CreateWarehouse();
        var shippingOption = dataBuilder.CreateShippingOption(warehouse: warehouse);
        var order = dataBuilder.CreateOrder(invoice: invoice, warehouse: warehouse, shippingOption: shippingOption);
        CreateOrderLineItem(order, "PROD-OLD", 2);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _invoiceService.GetUnpaidInvoiceForBasketAsync(basket.Id);

        // Assert - should return null because SKUs don't match
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetUnpaidInvoiceForBasketAsync_WithDifferentQuantity_ReturnsNull()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();

        var basketTime = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);
        var invoiceTime = new DateTime(2026, 1, 1, 10, 5, 0, DateTimeKind.Utc);

        // Create basket with quantity 5
        var basket = CreateBasket(
            basketTime,
            basketTime,
            "GBP",
            ("PROD-001", 5));
        _fixture.DbContext.Baskets.Add(basket);

        // Create invoice with quantity 2 (different)
        var invoice = dataBuilder.CreateInvoice(customer: customer);
        invoice.BasketId = basket.Id;
        invoice.DateCreated = invoiceTime;
        invoice.DateUpdated = invoiceTime;

        var warehouse = dataBuilder.CreateWarehouse();
        var shippingOption = dataBuilder.CreateShippingOption(warehouse: warehouse);
        var order = dataBuilder.CreateOrder(invoice: invoice, warehouse: warehouse, shippingOption: shippingOption);
        CreateOrderLineItem(order, "PROD-001", 2);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _invoiceService.GetUnpaidInvoiceForBasketAsync(basket.Id);

        // Assert - should return null because quantities don't match
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetUnpaidInvoiceForBasketAsync_WithExtraItemInBasket_ReturnsNull()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();

        var basketTime = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);
        var invoiceTime = new DateTime(2026, 1, 1, 10, 5, 0, DateTimeKind.Utc);

        // Create basket with 2 items
        var basket = CreateBasket(
            basketTime,
            basketTime,
            "GBP",
            ("PROD-001", 1),
            ("PROD-002", 1));
        _fixture.DbContext.Baskets.Add(basket);

        // Create invoice with only 1 item
        var invoice = dataBuilder.CreateInvoice(customer: customer);
        invoice.BasketId = basket.Id;
        invoice.DateCreated = invoiceTime;
        invoice.DateUpdated = invoiceTime;

        var warehouse = dataBuilder.CreateWarehouse();
        var shippingOption = dataBuilder.CreateShippingOption(warehouse: warehouse);
        var order = dataBuilder.CreateOrder(invoice: invoice, warehouse: warehouse, shippingOption: shippingOption);
        CreateOrderLineItem(order, "PROD-001", 1);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _invoiceService.GetUnpaidInvoiceForBasketAsync(basket.Id);

        // Assert - should return null because basket has extra item
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetUnpaidInvoiceForBasketAsync_WithMissingItemInBasket_ReturnsNull()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer();

        var basketTime = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);
        var invoiceTime = new DateTime(2026, 1, 1, 10, 5, 0, DateTimeKind.Utc);

        // Create basket with 1 item
        var basket = CreateBasket(
            basketTime,
            basketTime,
            "GBP",
            ("PROD-001", 1));
        _fixture.DbContext.Baskets.Add(basket);

        // Create invoice with 2 items
        var invoice = dataBuilder.CreateInvoice(customer: customer);
        invoice.BasketId = basket.Id;
        invoice.DateCreated = invoiceTime;
        invoice.DateUpdated = invoiceTime;

        var warehouse = dataBuilder.CreateWarehouse();
        var shippingOption = dataBuilder.CreateShippingOption(warehouse: warehouse);
        var order = dataBuilder.CreateOrder(invoice: invoice, warehouse: warehouse, shippingOption: shippingOption);
        CreateOrderLineItem(order, "PROD-001", 1);
        CreateOrderLineItem(order, "PROD-002", 1);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _invoiceService.GetUnpaidInvoiceForBasketAsync(basket.Id);

        // Assert - should return null because basket is missing an item
        result.ShouldBeNull();
    }

    #endregion

    private Core.Checkout.Models.Basket CreateBasket(
        DateTime created,
        DateTime updated,
        string currency,
        params (string Sku, int Quantity)[] items)
    {
        var currencySymbol = currency == "GBP" ? "GBP" : "$";
        var basket = _basketFactory.Create(null, currency, currencySymbol);
        basket.DateCreated = created;
        basket.DateUpdated = updated;

        foreach (var (sku, quantity) in items)
        {
            var lineItem = LineItemFactory.CreateCustomLineItem(
                Guid.Empty,
                "Product",
                sku,
                amount: 0m,
                cost: 0m,
                quantity: quantity,
                isTaxable: false,
                taxRate: 0m);
            lineItem.LineItemType = LineItemType.Product;
            lineItem.OrderId = null;
            basket.LineItems.Add(lineItem);
        }

        return basket;
    }

    private LineItem CreateOrderLineItem(Order order, string sku, int quantity)
    {
        var lineItem = LineItemFactory.CreateCustomLineItem(
            order.Id,
            "Product",
            sku,
            amount: 0m,
            cost: 0m,
            quantity: quantity,
            isTaxable: false,
            taxRate: 0m);
        lineItem.LineItemType = LineItemType.Product;
        lineItem.OrderId = order.Id;
        lineItem.Order = order;
        _fixture.DbContext.LineItems.Add(lineItem);
        order.LineItems ??= [];
        order.LineItems.Add(lineItem);
        return lineItem;
    }
}
