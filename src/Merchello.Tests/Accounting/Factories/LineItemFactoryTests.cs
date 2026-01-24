using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Models;
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
        var taxGroup = new TaxGroup { Id = taxGroupId, Name = "Books", TaxPercentage = 5m };
        var productRoot = new ProductRoot
        {
            Id = Guid.NewGuid(),
            RootName = "Test Book",
            TaxGroupId = taxGroupId,
            TaxGroup = taxGroup
        };
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = "Test Book Hardcover",
            Sku = "BOOK-001",
            Price = 29.99m,
            ProductRoot = productRoot
        };

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
        var productRoot = new ProductRoot
        {
            Id = Guid.NewGuid(),
            RootName = "Test Product",
            TaxGroupId = Guid.Empty,
            TaxGroup = null
        };
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = "Test Product Variant",
            Sku = "PROD-001",
            Price = 19.99m,
            ProductRoot = productRoot
        };

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
        var basketLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            ProductId = Guid.NewGuid(),
            Name = "Test Product",
            Sku = "TEST-001",
            Quantity = 5,
            Amount = 10m,
            LineItemType = LineItemType.Product,
            IsTaxable = true,
            TaxRate = 20m,
            TaxGroupId = taxGroupId
        };

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
        var basketLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            ProductId = Guid.NewGuid(),
            Name = "Legacy Product",
            Sku = "LEGACY-001",
            Quantity = 2,
            Amount = 15m,
            LineItemType = LineItemType.Product,
            IsTaxable = false,
            TaxRate = 0m,
            TaxGroupId = null
        };

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
        var addonItem = new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Gift Wrapping",
            Sku = "ADDON-WRAP",
            Quantity = 1,
            Amount = 5m,
            LineItemType = LineItemType.Addon,
            IsTaxable = true,
            TaxRate = 20m,
            TaxGroupId = taxGroupId,
            DependantLineItemSku = "PROD-001"
        };

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
