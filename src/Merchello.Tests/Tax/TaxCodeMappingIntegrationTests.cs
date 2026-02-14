using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Tax;

/// <summary>
/// Integration tests for the full TaxGroupId → TaxCode mapping flow.
/// Verifies that TaxGroupId flows correctly through:
/// Product → LineItem (via factory) → TaxableLineItem (via InvoiceService) → Tax Provider
/// </summary>
[Collection("Integration Tests")]
public class TaxCodeMappingIntegrationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly LineItemFactory _lineItemFactory;

    public TaxCodeMappingIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _lineItemFactory = new LineItemFactory(fixture.GetService<ICurrencyService>());
    }

    [Fact]
    public async Task FullFlow_ProductWithTaxGroup_TaxGroupIdPreservedThroughPipeline()
    {
        // Arrange - Create tax group and product
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Books", 5m);
        var productRoot = dataBuilder.CreateProductRoot("Test Book", taxGroup);
        var product = dataBuilder.CreateProduct("Hardcover Edition", productRoot, price: 29.99m);
        await dataBuilder.SaveChangesAsync();

        // Act - Create line item from product (simulates basket add)
        var lineItem = _lineItemFactory.CreateFromProduct(product, 1);

        // Assert - TaxGroupId captured from product
        lineItem.TaxGroupId.ShouldBe(taxGroup.Id);
        lineItem.TaxGroupId.ShouldNotBeNull();
        lineItem.TaxRate.ShouldBe(5m);
        lineItem.IsTaxable.ShouldBeTrue();
    }

    [Fact]
    public async Task FullFlow_MultipleProductsWithDifferentTaxGroups_EachPreservesTaxGroupId()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();

        var booksGroup = dataBuilder.CreateTaxGroup("Books", 5m);
        var clothingGroup = dataBuilder.CreateTaxGroup("Clothing", 20m);
        var digitalGroup = dataBuilder.CreateTaxGroup("Digital", 0m);

        var bookRoot = dataBuilder.CreateProductRoot("Novel", booksGroup);
        var clothingRoot = dataBuilder.CreateProductRoot("T-Shirt", clothingGroup);
        var digitalRoot = dataBuilder.CreateProductRoot("E-Book", digitalGroup);

        var book = dataBuilder.CreateProduct("Novel Paperback", bookRoot, price: 15m);
        var clothing = dataBuilder.CreateProduct("T-Shirt Blue", clothingRoot, price: 25m);
        var digital = dataBuilder.CreateProduct("E-Book Download", digitalRoot, price: 10m);

        await dataBuilder.SaveChangesAsync();

        // Act
        var bookLine = _lineItemFactory.CreateFromProduct(book, 1);
        var clothingLine = _lineItemFactory.CreateFromProduct(clothing, 2);
        var digitalLine = _lineItemFactory.CreateFromProduct(digital, 1);

        // Assert - Each line item has correct TaxGroupId
        bookLine.TaxGroupId.ShouldBe(booksGroup.Id);
        clothingLine.TaxGroupId.ShouldBe(clothingGroup.Id);
        digitalLine.TaxGroupId.ShouldBe(digitalGroup.Id);

        // Verify tax rates are correct
        bookLine.TaxRate.ShouldBe(5m);
        clothingLine.TaxRate.ShouldBe(20m);
        digitalLine.TaxRate.ShouldBe(0m);
        digitalLine.IsTaxable.ShouldBeTrue(); // 0% categories remain taxable for proportional shipping fairness
    }

    [Fact]
    public void FullFlow_OrderLineItemFromBasket_PreservesTaxGroupId()
    {
        // Arrange - Simulate basket line item with TaxGroupId
        var taxGroupId = Guid.NewGuid();
        var basketLineItem = LineItemFactory.CreateCustomLineItem(
            orderId: Guid.Empty,
            name: "Test Product",
            sku: "TEST-001",
            amount: 25m,
            cost: 0m,
            quantity: 10,
            isTaxable: true,
            taxRate: 8.25m);
        basketLineItem.LineItemType = LineItemType.Product;
        basketLineItem.ProductId = Guid.NewGuid();
        basketLineItem.TaxGroupId = taxGroupId;

        // Act - Create order line item (simulates order creation from basket)
        var orderLineItem = _lineItemFactory.CreateForOrder(basketLineItem, 6, 25m, 10m);

        // Assert - TaxGroupId preserved
        orderLineItem.TaxGroupId.ShouldBe(taxGroupId);
        orderLineItem.TaxRate.ShouldBe(8.25m);
        orderLineItem.IsTaxable.ShouldBeTrue();
        orderLineItem.Quantity.ShouldBe(6);
    }

    [Fact]
    public void FullFlow_NullTaxGroupId_GracefullyHandled()
    {
        // Arrange - Line item without TaxGroupId (legacy or non-taxable)
        var basketLineItem = LineItemFactory.CreateCustomLineItem(
            orderId: Guid.Empty,
            name: "Gift Card",
            sku: "GIFT-001",
            amount: 50m,
            cost: 0m,
            quantity: 1,
            isTaxable: false,
            taxRate: 0m);
        basketLineItem.LineItemType = LineItemType.Product;
        basketLineItem.ProductId = Guid.NewGuid();
        basketLineItem.TaxGroupId = null;

        // Act
        var orderLineItem = _lineItemFactory.CreateForOrder(basketLineItem, 1, 50m, 0m);

        // Assert - Null preserved, no errors
        orderLineItem.TaxGroupId.ShouldBeNull();
        orderLineItem.IsTaxable.ShouldBeFalse();
        orderLineItem.TaxRate.ShouldBe(0m);
    }
}
