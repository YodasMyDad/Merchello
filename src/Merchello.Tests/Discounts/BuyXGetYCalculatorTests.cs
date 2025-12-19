using Merchello.Core.Accounting.Models;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services;
using Merchello.Core.Discounts.Services.Calculators;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
using Microsoft.Extensions.Options;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Discounts;

/// <summary>
/// Unit tests for BuyXGetYCalculator.
/// Tests various Buy X Get Y discount scenarios including:
/// - Basic quantity triggers
/// - Amount triggers
/// - Different Buy/Get targets
/// - Selection methods (cheapest vs most expensive)
/// - Overlap handling
/// </summary>
public class BuyXGetYCalculatorTests
{
    private readonly BuyXGetYCalculator _calculator;

    public BuyXGetYCalculatorTests()
    {
        var settings = Options.Create(new MerchelloSettings { DefaultRounding = MidpointRounding.AwayFromZero });
        var currencyService = new CurrencyService(settings);
        _calculator = new BuyXGetYCalculator(currencyService);
    }

    #region A. Basic Buy X Get Y - Quantity Trigger

    [Fact]
    public void Calculate_Buy2Get1Free_AppliesCorrectly()
    {
        // Arrange: Buy 2, get 1 free - 3 items at £10 each
        var productId = Guid.NewGuid();
        var context = CreateContext(new[]
        {
            CreateLineItem(productId, quantity: 3, unitPrice: 10m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 2,
            getQuantity: 1,
            getValueType: DiscountValueType.Free);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(10m); // 1 free item at £10
        result.DiscountedLineItems.Count.ShouldBe(1);
        result.DiscountedLineItems[0].DiscountedQuantity.ShouldBe(1);
    }

    [Fact]
    public void Calculate_Buy3Get1Free_NotEnoughItems_ZeroDiscount()
    {
        // Arrange: Buy 3, get 1 free - but only 2 items
        var productId = Guid.NewGuid();
        var context = CreateContext(new[]
        {
            CreateLineItem(productId, quantity: 2, unitPrice: 10m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 3,
            getQuantity: 1,
            getValueType: DiscountValueType.Free);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(0m);
    }

    [Fact]
    public void Calculate_Buy2Get1Free_MultipleTriggersEarned()
    {
        // Arrange: Buy 2, get 1 free - 6 items = 2 triggers = 2 free items
        var productId = Guid.NewGuid();
        var context = CreateContext(new[]
        {
            CreateLineItem(productId, quantity: 6, unitPrice: 10m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 2,
            getQuantity: 1,
            getValueType: DiscountValueType.Free);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(20m); // 2 free items at £10
        result.DiscountedLineItems[0].DiscountedQuantity.ShouldBe(2);
    }

    [Fact]
    public void Calculate_Buy1Get1HalfOff_AppliesCorrectly()
    {
        // Arrange: Buy 1, get 1 at 50% off - 2 items at £20 each
        var productId = Guid.NewGuid();
        var context = CreateContext(new[]
        {
            CreateLineItem(productId, quantity: 2, unitPrice: 20m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 1,
            getQuantity: 1,
            getValueType: DiscountValueType.Percentage,
            getValue: 50m);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(10m); // 50% of £20
        result.DiscountedLineItems[0].DiscountPerUnit.ShouldBe(10m);
        result.DiscountedLineItems[0].DiscountedUnitPrice.ShouldBe(10m);
    }

    [Fact]
    public void Calculate_Buy2Get1FixedDiscount_AppliesCorrectly()
    {
        // Arrange: Buy 2, get 1 at £5 off - 3 items at £15 each
        var productId = Guid.NewGuid();
        var context = CreateContext(new[]
        {
            CreateLineItem(productId, quantity: 3, unitPrice: 15m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 2,
            getQuantity: 1,
            getValueType: DiscountValueType.FixedAmount,
            getValue: 5m);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(5m);
        result.DiscountedLineItems[0].DiscountPerUnit.ShouldBe(5m);
        result.DiscountedLineItems[0].DiscountedUnitPrice.ShouldBe(10m);
    }

    #endregion

    #region B. Buy X Get Y - Amount Trigger

    [Fact]
    public void Calculate_Spend50GetItemFree_AppliesCorrectly()
    {
        // Arrange: Spend £50, get 1 free - £60 purchase, 3 items at £20
        var productId = Guid.NewGuid();
        var context = CreateContext(new[]
        {
            CreateLineItem(productId, quantity: 3, unitPrice: 20m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumPurchaseAmount,
            buyTriggerValue: 50m,
            getQuantity: 1,
            getValueType: DiscountValueType.Free);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(20m); // 1 free item
    }

    [Fact]
    public void Calculate_Spend100GetItemFree_MultipleTriggersEarned()
    {
        // Arrange: Spend £100, get 1 free - £250 purchase = 2 triggers
        var productId = Guid.NewGuid();
        var context = CreateContext(new[]
        {
            CreateLineItem(productId, quantity: 5, unitPrice: 50m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumPurchaseAmount,
            buyTriggerValue: 100m,
            getQuantity: 1,
            getValueType: DiscountValueType.Free);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(100m); // 2 free items at £50
    }

    [Fact]
    public void Calculate_Spend50NotMet_ZeroDiscount()
    {
        // Arrange: Spend £50 required, only £40 purchase
        var productId = Guid.NewGuid();
        var context = CreateContext(new[]
        {
            CreateLineItem(productId, quantity: 2, unitPrice: 20m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumPurchaseAmount,
            buyTriggerValue: 50m,
            getQuantity: 1,
            getValueType: DiscountValueType.Free);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(0m);
    }

    #endregion

    #region C. Selection Method Tests

    [Fact]
    public void Calculate_SelectCheapest_DiscountsCheapestItem()
    {
        // Arrange: Buy 2 get 1 free, select cheapest - items at £10, £20, £30
        var context = CreateContext(new[]
        {
            CreateLineItem(Guid.NewGuid(), quantity: 1, unitPrice: 30m),
            CreateLineItem(Guid.NewGuid(), quantity: 1, unitPrice: 10m),
            CreateLineItem(Guid.NewGuid(), quantity: 1, unitPrice: 20m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 2,
            getQuantity: 1,
            getValueType: DiscountValueType.Free,
            selectionMethod: BuyXGetYSelectionMethod.Cheapest);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(10m); // Cheapest item free
    }

    [Fact]
    public void Calculate_SelectMostExpensive_DiscountsMostExpensiveItem()
    {
        // Arrange: Buy 2 get 1 free, select most expensive - items at £10, £20, £30
        var context = CreateContext(new[]
        {
            CreateLineItem(Guid.NewGuid(), quantity: 1, unitPrice: 30m),
            CreateLineItem(Guid.NewGuid(), quantity: 1, unitPrice: 10m),
            CreateLineItem(Guid.NewGuid(), quantity: 1, unitPrice: 20m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 2,
            getQuantity: 1,
            getValueType: DiscountValueType.Free,
            selectionMethod: BuyXGetYSelectionMethod.MostExpensive);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(30m); // Most expensive item free
    }

    [Fact]
    public void Calculate_SelectCheapest_MultipleGet_DiscountsMultipleCheapest()
    {
        // Arrange: Buy 2 get 2 free (cheapest), items at £10, £15, £20, £25
        var context = CreateContext(new[]
        {
            CreateLineItem(Guid.NewGuid(), quantity: 1, unitPrice: 25m),
            CreateLineItem(Guid.NewGuid(), quantity: 1, unitPrice: 10m),
            CreateLineItem(Guid.NewGuid(), quantity: 1, unitPrice: 20m),
            CreateLineItem(Guid.NewGuid(), quantity: 1, unitPrice: 15m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 2,
            getQuantity: 2,
            getValueType: DiscountValueType.Free,
            selectionMethod: BuyXGetYSelectionMethod.Cheapest);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(25m); // £10 + £15 (two cheapest)
    }

    #endregion

    #region D. Different Buy/Get Targets

    [Fact]
    public void Calculate_BuyACategoryGetBFree_AppliesCorrectly()
    {
        // Arrange: Buy 2 from category A, get 1 from category B free
        var categoryA = Guid.NewGuid();
        var categoryB = Guid.NewGuid();

        var context = CreateContext(new[]
        {
            CreateLineItem(Guid.NewGuid(), quantity: 2, unitPrice: 30m, categoryIds: [categoryA]),
            CreateLineItem(Guid.NewGuid(), quantity: 1, unitPrice: 15m, categoryIds: [categoryB])
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 2,
            buyTargetType: DiscountTargetType.Categories,
            buyTargetIds: [categoryA],
            getQuantity: 1,
            getTargetType: DiscountTargetType.Categories,
            getTargetIds: [categoryB],
            getValueType: DiscountValueType.Free);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(15m); // Category B item free
    }

    [Fact]
    public void Calculate_BuySpecificProductGetAnyFree_AppliesCorrectly()
    {
        // Arrange: Buy 2 of specific product, get any 1 free
        var specificProduct = Guid.NewGuid();
        var anyProduct = Guid.NewGuid();

        var context = CreateContext(new[]
        {
            CreateLineItem(specificProduct, quantity: 2, unitPrice: 25m),
            CreateLineItem(anyProduct, quantity: 1, unitPrice: 10m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 2,
            buyTargetType: DiscountTargetType.SpecificProducts,
            buyTargetIds: [specificProduct],
            getQuantity: 1,
            getTargetType: DiscountTargetType.AllProducts,
            getTargetIds: [],
            getValueType: DiscountValueType.Free);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(10m);
    }

    [Fact]
    public void Calculate_NoBuyItemsMatch_ZeroDiscount()
    {
        // Arrange: Buy from category A, but cart has category B
        var categoryA = Guid.NewGuid();
        var categoryB = Guid.NewGuid();

        var context = CreateContext(new[]
        {
            CreateLineItem(Guid.NewGuid(), quantity: 5, unitPrice: 20m, categoryIds: [categoryB])
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 2,
            buyTargetType: DiscountTargetType.Categories,
            buyTargetIds: [categoryA],
            getQuantity: 1,
            getValueType: DiscountValueType.Free);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(0m);
    }

    [Fact]
    public void Calculate_NoGetItemsMatch_ZeroDiscount()
    {
        // Arrange: Buy any, get category B free - but no category B items
        var categoryB = Guid.NewGuid();

        var context = CreateContext(new[]
        {
            CreateLineItem(Guid.NewGuid(), quantity: 5, unitPrice: 20m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 2,
            getQuantity: 1,
            getTargetType: DiscountTargetType.Categories,
            getTargetIds: [categoryB],
            getValueType: DiscountValueType.Free);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(0m);
    }

    #endregion

    #region E. Overlap Handling

    [Fact]
    public void Calculate_SameProductForBuyAndGet_HandlesOverlap()
    {
        // Arrange: Buy 2 get 1 free - same product, 3 items
        // 2 items count for "buy", leaving 1 for "get"
        var productId = Guid.NewGuid();
        var context = CreateContext(new[]
        {
            CreateLineItem(productId, quantity: 3, unitPrice: 10m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 2,
            buyTargetType: DiscountTargetType.SpecificProducts,
            buyTargetIds: [productId],
            getQuantity: 1,
            getTargetType: DiscountTargetType.SpecificProducts,
            getTargetIds: [productId],
            getValueType: DiscountValueType.Free);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(10m); // 1 free after using 2 for buy
    }

    [Fact]
    public void Calculate_OverlapWithMultipleLineItems_HandlesCorrectly()
    {
        // Arrange: Buy 3 get 1 free - multiple line items of same product type
        var productId = Guid.NewGuid();
        var context = CreateContext(new[]
        {
            CreateLineItem(productId, quantity: 2, unitPrice: 20m),
            CreateLineItem(productId, quantity: 2, unitPrice: 15m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 3,
            getQuantity: 1,
            getValueType: DiscountValueType.Free,
            selectionMethod: BuyXGetYSelectionMethod.Cheapest);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        // Total 4 items, need 3 for buy, 1 for get (cheapest = £15)
        result.TotalDiscountAmount.ShouldBe(15m);
    }

    #endregion

    #region F. Per-Order Usage Limit

    [Fact]
    public void Calculate_PerOrderLimitApplied_CapsDiscountedQuantity()
    {
        // Arrange: Buy 1 get 1 free, limit 2 per order - 6 items available
        var productId = Guid.NewGuid();
        var context = CreateContext(new[]
        {
            CreateLineItem(productId, quantity: 6, unitPrice: 10m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 1,
            getQuantity: 1,
            getValueType: DiscountValueType.Free,
            perOrderUsageLimit: 2);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        // Without limit: 3 triggers = 3 free items = £30
        // With limit of 2: 2 free items = £20
        result.TotalDiscountAmount.ShouldBe(20m);
    }

    #endregion

    #region G. Edge Cases

    [Fact]
    public void Calculate_MissingConfig_ReturnsFailed()
    {
        // Arrange
        var context = CreateContext(new[]
        {
            CreateLineItem(Guid.NewGuid(), quantity: 3, unitPrice: 10m)
        });

        var discount = new Discount
        {
            Category = DiscountCategory.BuyXGetY,
            BuyXGetYConfig = null
        };

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("configuration is missing");
    }

    [Fact]
    public void Calculate_ZeroPriceItems_SkipsZeroPriceForDiscount()
    {
        // Arrange: Mix of priced and free items
        var context = CreateContext(new[]
        {
            CreateLineItem(Guid.NewGuid(), quantity: 2, unitPrice: 20m),
            CreateLineItem(Guid.NewGuid(), quantity: 1, unitPrice: 0m) // Free item
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 2,
            getQuantity: 1,
            getValueType: DiscountValueType.Free,
            selectionMethod: BuyXGetYSelectionMethod.Cheapest);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        // Should not discount the £0 item (no benefit), should discount £20 item
        result.TotalDiscountAmount.ShouldBe(20m);
    }

    [Fact]
    public void Calculate_FixedDiscountExceedsItemPrice_CappedAtPrice()
    {
        // Arrange: £100 fixed discount on £25 item
        var productId = Guid.NewGuid();
        var context = CreateContext(new[]
        {
            CreateLineItem(productId, quantity: 3, unitPrice: 25m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 2,
            getQuantity: 1,
            getValueType: DiscountValueType.FixedAmount,
            getValue: 100m);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(25m); // Capped at item price
        result.DiscountedLineItems[0].DiscountPerUnit.ShouldBe(25m);
    }

    [Fact]
    public void Calculate_EmptyLineItems_ZeroDiscount()
    {
        // Arrange
        var context = CreateContext([]);

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 2,
            getQuantity: 1,
            getValueType: DiscountValueType.Free);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        result.TotalDiscountAmount.ShouldBe(0m);
    }

    [Fact]
    public void Calculate_GetQuantityGreaterThanAvailable_CapsAtAvailable()
    {
        // Arrange: Buy 1 get 3 free - but only 2 items available for get
        var productId = Guid.NewGuid();
        var context = CreateContext(new[]
        {
            CreateLineItem(productId, quantity: 2, unitPrice: 10m)
        });

        var discount = CreateBuyXGetYDiscount(
            buyTriggerType: BuyXTriggerType.MinimumQuantity,
            buyTriggerValue: 1,
            getQuantity: 3,
            getValueType: DiscountValueType.Free);

        // Act
        var result = _calculator.Calculate(discount, context);

        // Assert
        result.Success.ShouldBeTrue();
        // 1 buy, leaves 1 for get (not 3) = £10 discount
        result.TotalDiscountAmount.ShouldBe(10m);
    }

    #endregion

    #region Helper Methods

    private static Discount CreateBuyXGetYDiscount(
        BuyXTriggerType buyTriggerType = BuyXTriggerType.MinimumQuantity,
        decimal buyTriggerValue = 2,
        DiscountTargetType buyTargetType = DiscountTargetType.AllProducts,
        List<Guid>? buyTargetIds = null,
        int getQuantity = 1,
        DiscountTargetType getTargetType = DiscountTargetType.AllProducts,
        List<Guid>? getTargetIds = null,
        DiscountValueType getValueType = DiscountValueType.Free,
        decimal getValue = 0m,
        BuyXGetYSelectionMethod selectionMethod = BuyXGetYSelectionMethod.Cheapest,
        int? perOrderUsageLimit = null)
    {
        return new Discount
        {
            Id = Guid.NewGuid(),
            Name = "BOGO Test",
            Category = DiscountCategory.BuyXGetY,
            Status = DiscountStatus.Active,
            PerOrderUsageLimit = perOrderUsageLimit,
            BuyXGetYConfig = new DiscountBuyXGetYConfig
            {
                BuyTriggerType = buyTriggerType,
                BuyTriggerValue = buyTriggerValue,
                BuyTargetType = buyTargetType,
                BuyTargetIds = buyTargetIds != null
                    ? System.Text.Json.JsonSerializer.Serialize(buyTargetIds)
                    : null,
                GetQuantity = getQuantity,
                GetTargetType = getTargetType,
                GetTargetIds = getTargetIds != null
                    ? System.Text.Json.JsonSerializer.Serialize(getTargetIds)
                    : null,
                GetValueType = getValueType,
                GetValue = getValue,
                SelectionMethod = selectionMethod
            }
        };
    }

    private static DiscountContext CreateContext(DiscountContextLineItem[] lineItems)
    {
        return new DiscountContext
        {
            LineItems = lineItems.ToList(),
            SubTotal = lineItems.Sum(i => i.LineTotal),
            CurrencyCode = "GBP"
        };
    }

    private static DiscountContextLineItem CreateLineItem(
        Guid productId,
        int quantity = 1,
        decimal unitPrice = 10m,
        List<Guid>? categoryIds = null)
    {
        return new DiscountContextLineItem
        {
            LineItemId = Guid.NewGuid(),
            ProductId = productId,
            ProductRootId = productId,
            Quantity = quantity,
            UnitPrice = unitPrice,
            LineTotal = quantity * unitPrice,
            CategoryIds = categoryIds ?? []
        };
    }

    #endregion
}
