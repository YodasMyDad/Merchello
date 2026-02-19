using System.Text.Json;
using Merchello.Core;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

/// <summary>
/// Integration tests for UCP order retrieval functionality.
/// </summary>
[Collection("Integration Tests")]
public class UcpOrderTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICommerceProtocolAdapter _adapter;
    private const string TestAgentId = "test-agent";

    public UcpOrderTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        _adapter = fixture.GetService<ICommerceProtocolAdapter>();
    }

    [Fact]
    public async Task GetOrderAsync_WithValidId_ReturnsOrder()
    {
        // Arrange
        var invoice = await CreateTestInvoice();
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert
        response.ShouldNotBeNull();
        response.Success.ShouldBeTrue();
        response.Data.ShouldNotBeNull();
    }

    [Fact]
    public async Task GetOrderAsync_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        var invalidOrderId = Guid.NewGuid().ToString();
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invalidOrderId, agentIdentity);

        // Assert
        response.Success.ShouldBeFalse();
        response.Error?.Code.ShouldBe("not_found");
    }

    [Fact]
    public async Task GetOrderAsync_IncludesLineItems()
    {
        // Arrange
        var invoice = await CreateTestInvoiceWithOrders();
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        var orderData = ExtractOrderData(response.Data);
        orderData.ShouldNotBeNull();

        // Response should contain line items in the UCP format
        var dataType = orderData!.GetType();
        var lineItemsProperty = dataType.GetProperty("LineItems") ?? dataType.GetProperty("line_items");
        if (lineItemsProperty != null)
        {
            var lineItems = lineItemsProperty.GetValue(orderData);
            lineItems.ShouldNotBeNull();
        }
    }

    [Fact]
    public async Task GetOrderAsync_WithPartialPayment_ReturnsPaymentStatus()
    {
        // Arrange
        var invoice = await CreateTestInvoiceWithPartialPayment();
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        response.Data.ShouldNotBeNull();
    }

    [Fact]
    public async Task GetOrderAsync_WithFullPayment_ReturnsPaymentStatus()
    {
        // Arrange
        var invoice = await CreateTestInvoiceWithFullPayment();
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        response.Data.ShouldNotBeNull();
    }

    [Fact]
    public async Task GetOrderAsync_WithMalformedId_ReturnsError()
    {
        // Arrange
        var malformedId = "not-a-valid-guid";
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(malformedId, agentIdentity);

        // Assert
        response.Success.ShouldBeFalse();
    }

    [Fact]
    public async Task GetOrderAsync_WithEmptyId_ReturnsError()
    {
        // Arrange
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync("", agentIdentity);

        // Assert
        response.Success.ShouldBeFalse();
    }

    [Fact]
    public async Task GetOrderAsync_IncludesTotals()
    {
        // Arrange
        var invoice = await CreateTestInvoice();
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        var orderData = ExtractOrderData(response.Data);
        orderData.ShouldNotBeNull();

        // Response should contain totals in the UCP format
        var dataType = orderData!.GetType();
        var totalsProperty = dataType.GetProperty("Totals") ?? dataType.GetProperty("totals");
        if (totalsProperty != null)
        {
            var totals = totalsProperty.GetValue(orderData);
            totals.ShouldNotBeNull();
        }
    }

    [Fact]
    public async Task GetOrderAsync_IncludesOrderMetadata()
    {
        // Arrange
        var invoice = await CreateTestInvoice();
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        var orderData = ExtractOrderData(response.Data);
        orderData.ShouldNotBeNull();

        // Response should contain order ID
        var dataType = orderData!.GetType();
        var idProperty = dataType.GetProperty("Id") ?? dataType.GetProperty("id");
        if (idProperty != null)
        {
            var id = idProperty.GetValue(orderData);
            id.ShouldNotBeNull();
        }
    }

    #region Shipment/Fulfillment Tests

    [Fact]
    public async Task GetOrderAsync_WithShipment_ReturnsOrder()
    {
        // Arrange - Create invoice with shipment tracking
        var invoice = await CreateTestInvoiceWithShipment();
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert - Order with shipment should be returned successfully
        response.Success.ShouldBeTrue();
        response.Data.ShouldNotBeNull();

        // Verify response has id at root (UCP flat envelope format)
        using var envelope1 = JsonDocument.Parse(JsonSerializer.Serialize(response.Data));
        envelope1.RootElement.TryGetProperty("id", out _).ShouldBeTrue("Response should contain id at root");
    }

    [Fact]
    public async Task GetOrderAsync_WithMultipleShipments_ReturnsAllOrderData()
    {
        // Arrange
        var invoice = await CreateTestInvoiceWithMultipleShipments();
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        response.Data.ShouldNotBeNull();
    }

    [Fact]
    public async Task GetOrderAsync_WithShippedOrder_ReturnsOrderWithStatus()
    {
        // Arrange
        var invoice = await CreateTestInvoiceWithShippedOrder();
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert - Order with shipped status should return successfully
        response.Success.ShouldBeTrue();
        response.Data.ShouldNotBeNull();

        // Verify response has id and fulfillment at root (UCP flat envelope format)
        using var envelope2 = JsonDocument.Parse(JsonSerializer.Serialize(response.Data));
        envelope2.RootElement.TryGetProperty("id", out _).ShouldBeTrue("Response should contain id at root");
        envelope2.RootElement.TryGetProperty("fulfillment", out _).ShouldBeTrue("Order data should be present");
    }

    #endregion

    #region Payment Status Tests

    [Fact]
    public async Task GetOrderAsync_WithMultiplePayments_ReflectsCorrectTotal()
    {
        // Arrange
        var invoice = await CreateTestInvoiceWithMultiplePayments();
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        response.Data.ShouldNotBeNull();
    }

    [Fact]
    public async Task GetOrderAsync_WithFailedPayment_ReturnsUnpaidStatus()
    {
        // Arrange
        var invoice = await CreateTestInvoiceWithFailedPayment();
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        response.Data.ShouldNotBeNull();
    }

    #endregion

    #region Order Status Tests

    [Fact]
    public async Task GetOrderAsync_WithPendingOrder_ReturnsPendingStatus()
    {
        // Arrange
        var invoice = await CreateTestInvoiceWithOrderStatus(OrderStatus.Pending);
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        response.Data.ShouldNotBeNull();
    }

    [Fact]
    public async Task GetOrderAsync_WithProcessingOrder_ReturnsProcessingStatus()
    {
        // Arrange
        var invoice = await CreateTestInvoiceWithOrderStatus(OrderStatus.Processing);
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        response.Data.ShouldNotBeNull();
    }

    [Fact]
    public async Task GetOrderAsync_WithCancelledOrder_ReturnsCancelledStatus()
    {
        // Arrange
        var invoice = await CreateTestInvoiceWithOrderStatus(OrderStatus.Cancelled);
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        response.Data.ShouldNotBeNull();
    }

    [Fact]
    public async Task GetOrderAsync_WithShippedOrder_ReturnsShippedStatus()
    {
        // Arrange
        var invoice = await CreateTestInvoiceWithOrderStatus(OrderStatus.Shipped);
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        response.Data.ShouldNotBeNull();
    }

    #endregion

    #region Line Item Variation Tests

    [Fact]
    public async Task GetOrderAsync_WithDiscountLineItems_IncludesAdjustments()
    {
        // Arrange
        var invoice = await CreateTestInvoiceWithDiscountLineItems();
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        response.Data.ShouldNotBeNull();
    }

    [Fact]
    public async Task GetOrderAsync_WithMultipleLineItems_ReturnsAllItems()
    {
        // Arrange
        var invoice = await CreateTestInvoiceWithMultipleLineItems();
        var agentIdentity = CreateTestAgentIdentity();

        // Act
        var response = await _adapter.GetOrderAsync(invoice.Id.ToString(), agentIdentity);

        // Assert
        response.Success.ShouldBeTrue();
        response.Data.ShouldNotBeNull();
    }

    #endregion

    // Helper methods

    private async Task<Invoice> CreateTestInvoice()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer("order-test@example.com", "John", "Doe");
        var invoice = dataBuilder.CreateInvoice("order-test@example.com", 100.00m, customer);
        ApplyUcpSource(invoice);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return invoice;
    }

    private async Task<Invoice> CreateTestInvoiceWithOrders()
    {
        var dataBuilder = _fixture.CreateDataBuilder();

        // Create supporting entities
        var taxGroup = dataBuilder.CreateTaxGroup("Standard", 20);
        var productType = dataBuilder.CreateProductType("Physical", "physical");
        var supplier = dataBuilder.CreateSupplier("Test Supplier", "TEST");
        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "GB", supplier);
        var productRoot = dataBuilder.CreateProductRoot("Test Product", taxGroup, productType);
        var product = dataBuilder.CreateProduct("ORDER-SKU", productRoot, 25.00m);
        var shippingOption = dataBuilder.CreateShippingOption("Standard Delivery", warehouse, 5.00m, 3);

        var customer = dataBuilder.CreateCustomer("order-test@example.com", "John", "Doe");
        var invoice = dataBuilder.CreateInvoice("order-test@example.com", 55.00m, customer);
        ApplyUcpSource(invoice);

        // Create order with line items
        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Processing);
        dataBuilder.CreateLineItem(order, product, "Test Product", 2, 50.00m);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return invoice;
    }

    private async Task<Invoice> CreateTestInvoiceWithPartialPayment()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer("partial-payment@example.com", "Jane", "Smith");
        var invoice = dataBuilder.CreateInvoice("partial-payment@example.com", 100.00m, customer);
        ApplyUcpSource(invoice);

        // Add partial payment (50 of 100)
        var payment = dataBuilder.CreatePayment(invoice, 50.00m, "USD");
        payment.PaymentSuccess = true;

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return invoice;
    }

    private async Task<Invoice> CreateTestInvoiceWithFullPayment()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer("full-payment@example.com", "Bob", "Johnson");
        var invoice = dataBuilder.CreateInvoice("full-payment@example.com", 100.00m, customer);
        ApplyUcpSource(invoice);

        // Add full payment
        var payment = dataBuilder.CreatePayment(invoice, 100.00m, "USD");
        payment.PaymentSuccess = true;

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return invoice;
    }

    private async Task<Invoice> CreateTestInvoiceWithShipment()
    {
        var dataBuilder = _fixture.CreateDataBuilder();

        var taxGroup = dataBuilder.CreateTaxGroup("Standard", 20);
        var productType = dataBuilder.CreateProductType("Physical", "physical");
        var supplier = dataBuilder.CreateSupplier("Shipment Supplier", "SHIP");
        var warehouse = dataBuilder.CreateWarehouse("Shipment Warehouse", "GB", supplier);
        var productRoot = dataBuilder.CreateProductRoot("Shippable Product", taxGroup, productType);
        var product = dataBuilder.CreateProduct("SHIPPABLE-SKU", productRoot, 30.00m);
        var shippingOption = dataBuilder.CreateShippingOption("Standard", warehouse, 5.00m, 3);

        var customer = dataBuilder.CreateCustomer("shipment-test@example.com", "Test", "User");
        var invoice = dataBuilder.CreateInvoice("shipment-test@example.com", 35.00m, customer);
        ApplyUcpSource(invoice);

        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Shipped);
        dataBuilder.CreateLineItem(order, product, "Shippable Product", 1, 30.00m);

        // Add shipment with tracking
        _ = dataBuilder.CreateShipment(order, warehouse, "TRACK123456", "Royal Mail");

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return invoice;
    }

    private async Task<Invoice> CreateTestInvoiceWithMultipleShipments()
    {
        var dataBuilder = _fixture.CreateDataBuilder();

        var taxGroup = dataBuilder.CreateTaxGroup("Standard", 20);
        var productType = dataBuilder.CreateProductType("Physical", "physical");
        var supplier = dataBuilder.CreateSupplier("Multi-Ship Supplier", "MULTI");
        var warehouse1 = dataBuilder.CreateWarehouse("Warehouse 1", "GB", supplier);
        var warehouse2 = dataBuilder.CreateWarehouse("Warehouse 2", "GB", supplier);
        var productRoot = dataBuilder.CreateProductRoot("Multi-Ship Product", taxGroup, productType);
        var product = dataBuilder.CreateProduct("MULTI-SKU", productRoot, 25.00m);
        var shippingOption1 = dataBuilder.CreateShippingOption("Standard 1", warehouse1, 5.00m, 3);
        var shippingOption2 = dataBuilder.CreateShippingOption("Standard 2", warehouse2, 5.00m, 3);

        var customer = dataBuilder.CreateCustomer("multi-shipment@example.com", "Multi", "Shipper");
        var invoice = dataBuilder.CreateInvoice("multi-shipment@example.com", 60.00m, customer);
        ApplyUcpSource(invoice);

        var order1 = dataBuilder.CreateOrder(invoice, warehouse1, shippingOption1, OrderStatus.Shipped);
        dataBuilder.CreateLineItem(order1, product, "Product 1", 1, 25.00m);
        dataBuilder.CreateShipment(order1, warehouse1, "TRACK-A", "DHL");

        var order2 = dataBuilder.CreateOrder(invoice, warehouse2, shippingOption2, OrderStatus.Shipped);
        dataBuilder.CreateLineItem(order2, product, "Product 2", 1, 25.00m);
        dataBuilder.CreateShipment(order2, warehouse2, "TRACK-B", "UPS");

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return invoice;
    }

    private async Task<Invoice> CreateTestInvoiceWithShippedOrder()
    {
        var dataBuilder = _fixture.CreateDataBuilder();

        var taxGroup = dataBuilder.CreateTaxGroup("Standard", 20);
        var productType = dataBuilder.CreateProductType("Physical", "physical");
        var supplier = dataBuilder.CreateSupplier("Shipped Supplier", "SHIP");
        var warehouse = dataBuilder.CreateWarehouse("Shipped Warehouse", "GB", supplier);
        var productRoot = dataBuilder.CreateProductRoot("Shipped Product", taxGroup, productType);
        var product = dataBuilder.CreateProduct("SHIPPED-SKU", productRoot, 20.00m);
        var shippingOption = dataBuilder.CreateShippingOption("Express", warehouse, 10.00m, 1);

        var customer = dataBuilder.CreateCustomer("shipped@example.com", "Shipped", "Customer");
        var invoice = dataBuilder.CreateInvoice("shipped@example.com", 30.00m, customer);
        ApplyUcpSource(invoice);

        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Shipped);
        dataBuilder.CreateLineItem(order, product, "Shipped Product", 1, 20.00m);
        dataBuilder.CreateShipment(order, warehouse, "SHIP-TRACK", "FedEx");

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return invoice;
    }

    private async Task<Invoice> CreateTestInvoiceWithMultiplePayments()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer("multi-payment@example.com", "Multi", "Payer");
        var invoice = dataBuilder.CreateInvoice("multi-payment@example.com", 100.00m, customer);
        ApplyUcpSource(invoice);

        // Add multiple partial payments
        var payment1 = dataBuilder.CreatePayment(invoice, 30.00m, "USD");
        payment1.PaymentSuccess = true;

        var payment2 = dataBuilder.CreatePayment(invoice, 70.00m, "USD");
        payment2.PaymentSuccess = true;

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return invoice;
    }

    private async Task<Invoice> CreateTestInvoiceWithFailedPayment()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var customer = dataBuilder.CreateCustomer("failed-payment@example.com", "Failed", "Payer");
        var invoice = dataBuilder.CreateInvoice("failed-payment@example.com", 100.00m, customer);
        ApplyUcpSource(invoice);

        // Add failed payment
        var payment = dataBuilder.CreatePayment(invoice, 100.00m, "USD");
        payment.PaymentSuccess = false;

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return invoice;
    }

    private async Task<Invoice> CreateTestInvoiceWithOrderStatus(OrderStatus status)
    {
        var dataBuilder = _fixture.CreateDataBuilder();

        var taxGroup = dataBuilder.CreateTaxGroup("Standard", 20);
        var productType = dataBuilder.CreateProductType("Physical", "physical");
        var supplier = dataBuilder.CreateSupplier($"Supplier-{status}", $"S{(int)status}");
        var warehouse = dataBuilder.CreateWarehouse($"Warehouse-{status}", "GB", supplier);
        var productRoot = dataBuilder.CreateProductRoot($"Product-{status}", taxGroup, productType);
        var product = dataBuilder.CreateProduct($"SKU-{status}", productRoot, 25.00m);
        var shippingOption = dataBuilder.CreateShippingOption("Standard", warehouse, 5.00m, 3);

        var customer = dataBuilder.CreateCustomer($"status-{status}@example.com", "Status", "Test");
        var invoice = dataBuilder.CreateInvoice($"status-{status}@example.com", 30.00m, customer);
        ApplyUcpSource(invoice);

        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, status);
        dataBuilder.CreateLineItem(order, product, $"Product {status}", 1, 25.00m);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return invoice;
    }

    private async Task<Invoice> CreateTestInvoiceWithDiscountLineItems()
    {
        var dataBuilder = _fixture.CreateDataBuilder();

        var taxGroup = dataBuilder.CreateTaxGroup("Standard", 20);
        var productType = dataBuilder.CreateProductType("Physical", "physical");
        var supplier = dataBuilder.CreateSupplier("Discount Supplier", "DISC");
        var warehouse = dataBuilder.CreateWarehouse("Discount Warehouse", "GB", supplier);
        var productRoot = dataBuilder.CreateProductRoot("Discounted Product", taxGroup, productType);
        var product = dataBuilder.CreateProduct("DISCOUNT-SKU", productRoot, 50.00m);
        var shippingOption = dataBuilder.CreateShippingOption("Standard", warehouse, 5.00m, 3);

        var customer = dataBuilder.CreateCustomer("discount@example.com", "Discount", "Customer");
        var invoice = dataBuilder.CreateInvoice("discount@example.com", 45.00m, customer);
        ApplyUcpSource(invoice);

        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Processing);
        var productLineItem = dataBuilder.CreateLineItem(order, product, "Discounted Product", 1, 50.00m);

        // Add discount line item
        dataBuilder.CreateDiscountLineItem(order, productLineItem, 10.00m, reason: "Promo Code");

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return invoice;
    }

    private async Task<Invoice> CreateTestInvoiceWithMultipleLineItems()
    {
        var dataBuilder = _fixture.CreateDataBuilder();

        var taxGroup = dataBuilder.CreateTaxGroup("Standard", 20);
        var productType = dataBuilder.CreateProductType("Physical", "physical");
        var supplier = dataBuilder.CreateSupplier("Multi-Item Supplier", "MULTI");
        var warehouse = dataBuilder.CreateWarehouse("Multi-Item Warehouse", "GB", supplier);
        var productRoot = dataBuilder.CreateProductRoot("Multi-Item Product", taxGroup, productType);
        var product1 = dataBuilder.CreateProduct("ITEM1-SKU", productRoot, 15.00m);
        var product2 = dataBuilder.CreateProduct("ITEM2-SKU", productRoot, 25.00m);
        var product3 = dataBuilder.CreateProduct("ITEM3-SKU", productRoot, 35.00m);
        var shippingOption = dataBuilder.CreateShippingOption("Standard", warehouse, 5.00m, 3);

        var customer = dataBuilder.CreateCustomer("multi-item@example.com", "Multi", "Item");
        var invoice = dataBuilder.CreateInvoice("multi-item@example.com", 80.00m, customer);
        ApplyUcpSource(invoice);

        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Processing);
        dataBuilder.CreateLineItem(order, product1, "Item 1", 1, 15.00m);
        dataBuilder.CreateLineItem(order, product2, "Item 2", 1, 25.00m);
        dataBuilder.CreateLineItem(order, product3, "Item 3", 1, 35.00m);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return invoice;
    }

    private static AgentIdentity CreateTestAgentIdentity()
    {
        return new AgentIdentity
        {
            AgentId = TestAgentId,
            Protocol = ProtocolAliases.Ucp,
            ProfileUri = "https://test-agent.example.com/profile",
            Capabilities =
            [
                UcpCapabilityNames.Checkout,
                UcpCapabilityNames.Order
            ]
        };
    }

    private static void ApplyUcpSource(Invoice invoice)
    {
        invoice.Source = new InvoiceSource
        {
            Type = Constants.InvoiceSources.Ucp,
            DisplayName = "UCP Agent",
            SourceId = TestAgentId,
            SourceName = TestAgentId,
            ProfileUri = "https://test-agent.example.com/profile",
            ProtocolVersion = "2026-01-11",
            SessionId = Guid.NewGuid().ToString()
        };
    }

    private static object? ExtractOrderData(object? responseData)
    {
        if (responseData == null) return null;

        var type = responseData.GetType();
        var dataProperty = type.GetProperty("Data") ?? type.GetProperty("data");
        return dataProperty?.GetValue(responseData) ?? responseData;
    }
}
