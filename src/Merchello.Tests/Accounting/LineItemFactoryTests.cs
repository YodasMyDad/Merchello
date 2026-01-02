using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Products.Models;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Accounting;

/// <summary>
/// Tests for LineItemFactory, specifically testing cost handling for products and add-ons.
/// </summary>
public class LineItemFactoryTests
{
    private readonly LineItemFactory _factory = new();

    #region CreateFromProduct Tests

    [Fact]
    public void CreateFromProduct_CapturesCostOfGoods()
    {
        // Arrange
        var productRoot = new ProductRoot
        {
            Id = Guid.NewGuid(),
            RootName = "Test Product",
            TaxGroup = new TaxGroup { TaxPercentage = 20m }
        };

        var product = new Product
        {
            Id = Guid.NewGuid(),
            ProductRootId = productRoot.Id,
            ProductRoot = productRoot,
            Name = "Test Variant",
            Sku = "TEST-001",
            Price = 100m,
            CostOfGoods = 40m // 40% cost
        };

        // Act
        var lineItem = _factory.CreateFromProduct(product, 2);

        // Assert
        lineItem.Cost.ShouldBe(40m);
        lineItem.Amount.ShouldBe(100m);
        lineItem.Quantity.ShouldBe(2);
        lineItem.LineItemType.ShouldBe(LineItemType.Product);
    }

    [Fact]
    public void CreateFromProduct_WithZeroCost_SetsCostToZero()
    {
        // Arrange
        var productRoot = new ProductRoot
        {
            Id = Guid.NewGuid(),
            RootName = "Digital Product",
            TaxGroup = new TaxGroup { TaxPercentage = 0m }
        };

        var product = new Product
        {
            Id = Guid.NewGuid(),
            ProductRootId = productRoot.Id,
            ProductRoot = productRoot,
            Name = "eBook",
            Sku = "EBOOK-001",
            Price = 9.99m,
            CostOfGoods = 0m // Digital product with no cost
        };

        // Act
        var lineItem = _factory.CreateFromProduct(product, 1);

        // Assert
        lineItem.Cost.ShouldBe(0m);
        lineItem.Amount.ShouldBe(9.99m);
    }

    [Fact]
    public void CreateFromProduct_SetsTaxableBasedOnTaxRate()
    {
        // Arrange - Product with tax
        var taxableRoot = new ProductRoot
        {
            Id = Guid.NewGuid(),
            TaxGroup = new TaxGroup { TaxPercentage = 20m }
        };
        var taxableProduct = new Product
        {
            Id = Guid.NewGuid(),
            ProductRoot = taxableRoot,
            Price = 50m,
            CostOfGoods = 20m
        };

        // Arrange - Product without tax
        var zeroTaxRoot = new ProductRoot
        {
            Id = Guid.NewGuid(),
            TaxGroup = new TaxGroup { TaxPercentage = 0m }
        };
        var zeroTaxProduct = new Product
        {
            Id = Guid.NewGuid(),
            ProductRoot = zeroTaxRoot,
            Price = 50m,
            CostOfGoods = 20m
        };

        // Act
        var taxableLineItem = _factory.CreateFromProduct(taxableProduct, 1);
        var zeroTaxLineItem = _factory.CreateFromProduct(zeroTaxProduct, 1);

        // Assert
        taxableLineItem.IsTaxable.ShouldBeTrue();
        taxableLineItem.TaxRate.ShouldBe(20m);

        zeroTaxLineItem.IsTaxable.ShouldBeFalse();
        zeroTaxLineItem.TaxRate.ShouldBe(0m);
    }

    #endregion

    #region CreateForOrder Tests

    [Fact]
    public void CreateForOrder_CapturesCostFromParameter()
    {
        // Arrange
        var basketLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            ProductId = Guid.NewGuid(),
            Name = "Test Product",
            Sku = "TEST-001",
            Quantity = 5,
            Amount = 100m,
            LineItemType = LineItemType.Product,
            IsTaxable = true,
            TaxRate = 20m,
            ExtendedData = new Dictionary<string, object>()
        };

        // Act - Allocate 3 of 5 items to this order with cost of £40 each
        var orderLineItem = _factory.CreateForOrder(basketLineItem, 3, 100m, cost: 40m);

        // Assert
        orderLineItem.Cost.ShouldBe(40m);
        orderLineItem.Quantity.ShouldBe(3);
        orderLineItem.Amount.ShouldBe(100m);
        orderLineItem.ProductId.ShouldBe(basketLineItem.ProductId);
    }

    [Fact]
    public void CreateForOrder_DefaultsCostToZero()
    {
        // Arrange
        var basketLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Test Product",
            Sku = "TEST-001",
            Quantity = 1,
            Amount = 50m,
            LineItemType = LineItemType.Product,
            ExtendedData = new Dictionary<string, object>()
        };

        // Act - No cost provided
        var orderLineItem = _factory.CreateForOrder(basketLineItem, 1, 50m);

        // Assert
        orderLineItem.Cost.ShouldBe(0m);
    }

    [Fact]
    public void CreateForOrder_PreservesExtendedData()
    {
        // Arrange
        var basketLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Test Product",
            Sku = "TEST-001",
            Quantity = 1,
            Amount = 50m,
            LineItemType = LineItemType.Product,
            ExtendedData = new Dictionary<string, object>
            {
                ["CustomField"] = "CustomValue",
                ["ProductRootId"] = Guid.NewGuid().ToString()
            }
        };

        // Act
        var orderLineItem = _factory.CreateForOrder(basketLineItem, 1, 50m, 20m);

        // Assert
        orderLineItem.ExtendedData.ShouldContainKey("CustomField");
        orderLineItem.ExtendedData["CustomField"].ShouldBe("CustomValue");
    }

    #endregion

    #region CreateAddonForOrder Tests

    [Fact]
    public void CreateAddonForOrder_ExtractsCostFromExtendedData()
    {
        // Arrange - Add-on with CostAdjustment stored in ExtendedData
        var addonLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Gift Wrapping",
            Sku = "ADDON-WRAP",
            Quantity = 1,
            Amount = 5m,
            LineItemType = LineItemType.Addon,
            DependantLineItemSku = "PRODUCT-001",
            IsTaxable = true,
            TaxRate = 20m,
            ExtendedData = new Dictionary<string, object>
            {
                ["CostAdjustment"] = 2m // Cost is £2 for wrapping materials
            }
        };

        // Act
        var orderAddon = _factory.CreateAddonForOrder(addonLineItem, 2);

        // Assert
        orderAddon.Cost.ShouldBe(2m);
        orderAddon.Amount.ShouldBe(5m);
        orderAddon.Quantity.ShouldBe(2);
        orderAddon.LineItemType.ShouldBe(LineItemType.Addon);
        orderAddon.DependantLineItemSku.ShouldBe("PRODUCT-001");
    }

    [Fact]
    public void CreateAddonForOrder_WithMissingCostAdjustment_DefaultsToZero()
    {
        // Arrange - Add-on without CostAdjustment
        var addonLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Express Processing",
            Sku = "ADDON-EXPRESS",
            Quantity = 1,
            Amount = 10m,
            LineItemType = LineItemType.Addon,
            ExtendedData = new Dictionary<string, object>() // No CostAdjustment
        };

        // Act
        var orderAddon = _factory.CreateAddonForOrder(addonLineItem, 1);

        // Assert
        orderAddon.Cost.ShouldBe(0m);
    }

    [Fact]
    public void CreateAddonForOrder_WithJsonElementCost_ParsesCorrectly()
    {
        // Arrange - Simulate JSON deserialized ExtendedData (JsonElement)
        var json = System.Text.Json.JsonSerializer.Serialize(new { CostAdjustment = 3.50m });
        var jsonDoc = System.Text.Json.JsonDocument.Parse(json);
        var costElement = jsonDoc.RootElement.GetProperty("CostAdjustment");

        var addonLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Engraving",
            Sku = "ADDON-ENGRAVE",
            Amount = 15m,
            LineItemType = LineItemType.Addon,
            ExtendedData = new Dictionary<string, object>
            {
                ["CostAdjustment"] = costElement // JsonElement from deserialization
            }
        };

        // Act
        var orderAddon = _factory.CreateAddonForOrder(addonLineItem, 1);

        // Assert
        orderAddon.Cost.ShouldBe(3.50m);
    }

    [Fact]
    public void CreateAddonForOrder_WithStringCostAdjustment_HandlesGracefully()
    {
        // Arrange - Invalid type in ExtendedData (should default to 0)
        var addonLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Custom Option",
            Sku = "ADDON-CUSTOM",
            Amount = 10m,
            LineItemType = LineItemType.Addon,
            ExtendedData = new Dictionary<string, object>
            {
                ["CostAdjustment"] = "invalid" // String that can't be parsed
            }
        };

        // Act
        var orderAddon = _factory.CreateAddonForOrder(addonLineItem, 1);

        // Assert - Should default to 0 instead of throwing
        orderAddon.Cost.ShouldBe(0m);
    }

    [Fact]
    public void CreateAddonForOrder_PreservesAllProperties()
    {
        // Arrange
        var addonLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Premium Packaging",
            Sku = "ADDON-PREMIUM",
            Quantity = 1,
            Amount = 8m,
            OriginalAmount = 10m,
            LineItemType = LineItemType.Addon,
            DependantLineItemSku = "PRODUCT-123",
            IsTaxable = true,
            TaxRate = 20m,
            ExtendedData = new Dictionary<string, object>
            {
                ["CostAdjustment"] = 4m,
                ["OptionValueId"] = "opt-123"
            }
        };

        // Act
        var orderAddon = _factory.CreateAddonForOrder(addonLineItem, 3);

        // Assert
        orderAddon.Name.ShouldBe("Premium Packaging");
        orderAddon.Sku.ShouldBe("ADDON-PREMIUM");
        orderAddon.Amount.ShouldBe(8m);
        orderAddon.OriginalAmount.ShouldBe(10m);
        orderAddon.Cost.ShouldBe(4m);
        orderAddon.Quantity.ShouldBe(3);
        orderAddon.IsTaxable.ShouldBeTrue();
        orderAddon.TaxRate.ShouldBe(20m);
        orderAddon.DependantLineItemSku.ShouldBe("PRODUCT-123");
        orderAddon.ExtendedData.ShouldContainKey("OptionValueId");
        orderAddon.ProductId.ShouldBeNull(); // Add-ons have no ProductId
    }

    #endregion

    #region CreateDiscountForOrder Tests

    [Fact]
    public void CreateDiscountForOrder_ScalesDiscountProportionally()
    {
        // Arrange - Original discount of £10 for 10 items
        var discountLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "10% Discount",
            Sku = "DISCOUNT-10PCT",
            Amount = 10m,
            OriginalAmount = 10m,
            LineItemType = LineItemType.Discount,
            DependantLineItemSku = "PRODUCT-001",
            ExtendedData = new Dictionary<string, object>
            {
                ["DiscountId"] = Guid.NewGuid().ToString()
            }
        };

        // Act - Split: 6 items go to this order out of original 10
        var orderDiscount = _factory.CreateDiscountForOrder(discountLineItem, 6, 10);

        // Assert - Should be £6 (60% of £10)
        orderDiscount.Amount.ShouldBe(6m);
        orderDiscount.Quantity.ShouldBe(1); // Discounts are always qty 1
        orderDiscount.LineItemType.ShouldBe(LineItemType.Discount);
    }

    [Fact]
    public void CreateDiscountForOrder_WithNoSplit_PreservesFullAmount()
    {
        // Arrange
        var discountLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "£5 Off",
            Amount = 5m,
            LineItemType = LineItemType.Discount,
            ExtendedData = new Dictionary<string, object>()
        };

        // Act - All items go to same order
        var orderDiscount = _factory.CreateDiscountForOrder(discountLineItem, 5, 5);

        // Assert
        orderDiscount.Amount.ShouldBe(5m);
    }

    [Fact]
    public void CreateDiscountForOrder_RoundsToTwoDecimalPlaces()
    {
        // Arrange - £10 discount split 3 ways (£3.33...)
        var discountLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Discount",
            Amount = 10m,
            LineItemType = LineItemType.Discount,
            ExtendedData = new Dictionary<string, object>()
        };

        // Act
        var orderDiscount = _factory.CreateDiscountForOrder(discountLineItem, 1, 3);

        // Assert - Should round to 2 decimal places
        orderDiscount.Amount.ShouldBe(3.33m);
    }

    [Fact]
    public void CreateAddonForOrder_WithWeightKg_PreservesWeightForShipping()
    {
        // Arrange - Add-on with WeightKg stored in ExtendedData (as stored by StorefrontApiController)
        var addonLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Gift Box",
            Sku = "ADDON-GIFTBOX",
            Quantity = 2,
            Amount = 3m,
            LineItemType = LineItemType.Addon,
            DependantLineItemSku = "PRODUCT-001",
            ExtendedData = new Dictionary<string, object>
            {
                ["AddonOptionId"] = Guid.NewGuid().ToString(),
                ["AddonValueId"] = Guid.NewGuid().ToString(),
                ["CostAdjustment"] = 1.50m,
                ["WeightKg"] = 0.25m  // 250g additional weight for shipping
            }
        };

        // Act
        var orderAddon = _factory.CreateAddonForOrder(addonLineItem, 2);

        // Assert - WeightKg should be preserved in ExtendedData for shipping calculations
        orderAddon.ExtendedData.ShouldContainKey("WeightKg");
        orderAddon.ExtendedData["WeightKg"].ShouldBe(0.25m);
        orderAddon.Quantity.ShouldBe(2);
        orderAddon.LineItemType.ShouldBe(LineItemType.Addon);
    }

    [Fact]
    public void CreateAddonForOrder_WithZeroWeight_PreservesZeroWeight()
    {
        // Arrange - Add-on with zero weight (digital add-on)
        var addonLineItem = new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Extended Warranty",
            Sku = "ADDON-WARRANTY",
            Amount = 20m,
            LineItemType = LineItemType.Addon,
            ExtendedData = new Dictionary<string, object>
            {
                ["WeightKg"] = 0m  // No additional weight
            }
        };

        // Act
        var orderAddon = _factory.CreateAddonForOrder(addonLineItem, 1);

        // Assert - Zero weight should be preserved
        orderAddon.ExtendedData.ShouldContainKey("WeightKg");
        orderAddon.ExtendedData["WeightKg"].ShouldBe(0m);
    }

    #endregion

    #region CreateShippingLineItem Tests

    [Fact]
    public void CreateShippingLineItem_CreatesWithCorrectProperties()
    {
        // Act
        var shippingLineItem = _factory.CreateShippingLineItem("Standard Delivery", 5.99m);

        // Assert
        shippingLineItem.Name.ShouldBe("Standard Delivery");
        shippingLineItem.Amount.ShouldBe(5.99m);
        shippingLineItem.Quantity.ShouldBe(1);
        shippingLineItem.LineItemType.ShouldBe(LineItemType.Shipping);
        shippingLineItem.IsTaxable.ShouldBeFalse();
    }

    #endregion
}
