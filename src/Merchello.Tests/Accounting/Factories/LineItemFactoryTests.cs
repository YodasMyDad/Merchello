using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Services.Interfaces;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Accounting.Factories;

/// <summary>
/// Tests for LineItemFactory, particularly TaxGroupId handling.
/// </summary>
public class LineItemFactoryTests
{
    private readonly LineItemFactory _factory;

    public LineItemFactoryTests()
    {
        var currencyService = new Mock<ICurrencyService>();
        currencyService.Setup(x => x.Round(It.IsAny<decimal>(), It.IsAny<string>()))
            .Returns((decimal amount, string _) => Math.Round(amount, 2));
        _factory = new LineItemFactory(currencyService.Object);
    }

    #region CreateFromProduct Tests

    [Fact]
    public void CreateFromProduct_CapturesTaxGroupId()
    {
        // Arrange
        var taxGroupId = Guid.NewGuid();
        var taxGroupFactory = new TaxGroupFactory();
        var productTypeFactory = new ProductTypeFactory();
        var productRootFactory = new ProductRootFactory();
        var productFactory = new ProductFactory(new SlugHelper());

        var taxGroup = taxGroupFactory.Create("Books", 5m);
        taxGroup.Id = taxGroupId;
        var productType = productTypeFactory.Create("Books", "books");
        productType.Id = Guid.NewGuid();
        var productRoot = productRootFactory.Create("Test Book", taxGroup, productType, []);
        productRoot.Id = Guid.NewGuid();

        var product = productFactory.Create(
            productRoot,
            "Test Book Hardcover",
            29.99m,
            costOfGoods: 0m,
            gtin: string.Empty,
            sku: "BOOK-001",
            isDefault: true);
        product.Id = Guid.NewGuid();
        product.ProductRootId = productRoot.Id;

        // Act
        var lineItem = _factory.CreateFromProduct(product, 2);

        // Assert
        lineItem.TaxGroupId.ShouldBe(taxGroupId);
        lineItem.TaxRate.ShouldBe(5m);
        lineItem.IsTaxable.ShouldBeTrue();
        lineItem.Quantity.ShouldBe(2);
    }

    [Fact]
    public void CreateFromProduct_WithNoTaxGroup_SetsTaxGroupIdAndZeroRate()
    {
        // Arrange - ProductRoot with no TaxGroup set
        var taxGroupFactory = new TaxGroupFactory();
        var productTypeFactory = new ProductTypeFactory();
        var productRootFactory = new ProductRootFactory();
        var productFactory = new ProductFactory(new SlugHelper());

        var placeholderTaxGroup = taxGroupFactory.Create("Standard", 20m);
        placeholderTaxGroup.Id = Guid.NewGuid();
        var productType = productTypeFactory.Create("Products", "products");
        productType.Id = Guid.NewGuid();
        var productRoot = productRootFactory.Create("Test Product", placeholderTaxGroup, productType, []);
        productRoot.Id = Guid.NewGuid();
        productRoot.TaxGroupId = Guid.Empty;
        productRoot.TaxGroup = null;

        var product = productFactory.Create(
            productRoot,
            "Test Product Variant",
            19.99m,
            costOfGoods: 0m,
            gtin: string.Empty,
            sku: "PROD-001",
            isDefault: true);
        product.Id = Guid.NewGuid();
        product.ProductRootId = productRoot.Id;

        // Act
        var lineItem = _factory.CreateFromProduct(product, 1);

        // Assert
        lineItem.TaxGroupId.ShouldBe(Guid.Empty);
        lineItem.TaxRate.ShouldBe(0m);
        lineItem.IsTaxable.ShouldBeFalse();
    }

    #endregion

    #region CreateForOrder Tests

    [Fact]
    public void CreateForOrder_PreservesTaxGroupId()
    {
        // Arrange
        var taxGroupId = Guid.NewGuid();
        var basketLineItem = LineItemFactory.CreateCustomLineItem(
            Guid.Empty,
            "Test Product",
            "TEST-001",
            10m,
            cost: 0m,
            quantity: 5,
            isTaxable: true,
            taxRate: 20m);
        basketLineItem.ProductId = Guid.NewGuid();
        basketLineItem.LineItemType = LineItemType.Product;
        basketLineItem.TaxGroupId = taxGroupId;

        // Act
        var orderLineItem = _factory.CreateForOrder(basketLineItem, 3, 10m, 5m);

        // Assert
        orderLineItem.TaxGroupId.ShouldBe(taxGroupId);
        orderLineItem.TaxRate.ShouldBe(20m);
        orderLineItem.IsTaxable.ShouldBeTrue();
        orderLineItem.Quantity.ShouldBe(3);
    }

    [Fact]
    public void CreateForOrder_PreservesNullTaxGroupId()
    {
        // Arrange - Line item with null TaxGroupId (legacy scenario)
        var basketLineItem = LineItemFactory.CreateCustomLineItem(
            Guid.Empty,
            "Legacy Product",
            "LEGACY-001",
            15m,
            cost: 0m,
            quantity: 2,
            isTaxable: false,
            taxRate: 0m);
        basketLineItem.ProductId = Guid.NewGuid();
        basketLineItem.LineItemType = LineItemType.Product;
        basketLineItem.TaxGroupId = null;

        // Act
        var orderLineItem = _factory.CreateForOrder(basketLineItem, 2, 15m, 8m);

        // Assert
        orderLineItem.TaxGroupId.ShouldBeNull();
        orderLineItem.IsTaxable.ShouldBeFalse();
    }

    #endregion

    #region CreateAddonForOrder Tests

    [Fact]
    public void CreateAddonForOrder_PreservesTaxGroupId()
    {
        // Arrange
        var taxGroupId = Guid.NewGuid();
        var addonItem = LineItemFactory.CreateCustomLineItem(
            Guid.Empty,
            "Gift Wrapping",
            "ADDON-WRAP",
            5m,
            cost: 0m,
            quantity: 1,
            isTaxable: true,
            taxRate: 20m);
        addonItem.LineItemType = LineItemType.Addon;
        addonItem.TaxGroupId = taxGroupId;
        addonItem.DependantLineItemSku = "PROD-001";

        // Act
        var orderAddon = _factory.CreateAddonForOrder(addonItem, 1, 5m);

        // Assert
        orderAddon.TaxGroupId.ShouldBe(taxGroupId);
        orderAddon.TaxRate.ShouldBe(20m);
        orderAddon.IsTaxable.ShouldBeTrue();
        orderAddon.DependantLineItemSku.ShouldBe("PROD-001");
    }

    #endregion
}
