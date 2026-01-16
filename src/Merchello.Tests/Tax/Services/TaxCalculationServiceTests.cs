using Merchello.Core.Accounting.Models;
using Merchello.Core.Tax.Services.Interfaces;
using Merchello.Core.Tax.Services.Models;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Tax.Services;

/// <summary>
/// Integration tests for TaxCalculationService - the centralized tax calculation service
/// that handles pro-rating of discounts, proper rounding, and consistent tax algorithms.
/// </summary>
[Collection("Integration")]
public class TaxCalculationServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ITaxCalculationService _taxCalculationService;

    public TaxCalculationServiceTests(ServiceTestFixture fixture)
    {
        _taxCalculationService = fixture.GetService<ITaxCalculationService>();
    }

    #region Tax Exempt Tests

    [Fact]
    public void CalculateLineItemTax_WhenTaxExempt_ReturnsZeroTax()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            IsTaxExempt = true,
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Id = Guid.NewGuid(),
                    Sku = "SKU-001",
                    Amount = 100m,
                    Quantity = 2,
                    TaxRate = 20m,
                    IsTaxable = true
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        result.TotalTax.ShouldBe(0m);
        result.LineItems.ShouldHaveSingleItem();
        result.LineItems[0].TaxAmount.ShouldBe(0m);
        result.LineItems[0].TaxableAmount.ShouldBe(0m);
        result.LineItems[0].LineTotal.ShouldBe(200m); // Line total still calculated
    }

    [Fact]
    public void CalculateLineItemTax_WhenTaxExempt_WithMultipleItems_AllHaveZeroTax()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            IsTaxExempt = true,
            LineItems =
            [
                new TaxableLineItemInput { Amount = 50m, Quantity = 1, TaxRate = 20m, IsTaxable = true },
                new TaxableLineItemInput { Amount = 100m, Quantity = 2, TaxRate = 5m, IsTaxable = true }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        result.TotalTax.ShouldBe(0m);
        result.LineItems.Count.ShouldBe(2);
        result.LineItems.All(li => li.TaxAmount == 0m).ShouldBeTrue();
    }

    #endregion

    #region Single Item Tax Tests

    [Fact]
    public void CalculateLineItemTax_SingleTaxableItem_CalculatesCorrectTax()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Id = Guid.NewGuid(),
                    Sku = "SKU-001",
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        result.TotalTax.ShouldBe(20m); // 100 * 20% = 20
        result.LineItems.ShouldHaveSingleItem();
        result.LineItems[0].LineTotal.ShouldBe(100m);
        result.LineItems[0].TaxableAmount.ShouldBe(100m);
        result.LineItems[0].TaxAmount.ShouldBe(20m);
        result.LineItems[0].TaxRate.ShouldBe(20m);
    }

    [Fact]
    public void CalculateLineItemTax_SingleTaxableItem_WithQuantity_CalculatesCorrectTax()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 50m,
                    Quantity = 3,
                    TaxRate = 10m,
                    IsTaxable = true
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        result.LineItems[0].LineTotal.ShouldBe(150m); // 50 * 3
        result.TotalTax.ShouldBe(15m); // 150 * 10%
    }

    [Fact]
    public void CalculateLineItemTax_NonTaxableItem_HasZeroTax()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = false // Not taxable
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        result.TotalTax.ShouldBe(0m);
        result.LineItems[0].TaxAmount.ShouldBe(0m);
    }

    [Fact]
    public void CalculateLineItemTax_ZeroTaxRate_HasZeroTax()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 0m, // Zero rate
                    IsTaxable = true
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        result.TotalTax.ShouldBe(0m);
        result.LineItems[0].TaxAmount.ShouldBe(0m);
    }

    #endregion

    #region Mixed Tax Rate Tests

    [Fact]
    public void CalculateLineItemTax_MixedTaxRates_CalculatesEachCorrectly()
    {
        // Arrange - simulates standard VAT (20%) and zero-rated items (0%)
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Sku = "STANDARD",
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true
                },
                new TaxableLineItemInput
                {
                    Sku = "ZERO-RATED",
                    Amount = 50m,
                    Quantity = 2,
                    TaxRate = 0m,
                    IsTaxable = true
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "GBP");

        // Assert
        result.TotalTax.ShouldBe(20m); // Only standard item taxed: 100 * 20%

        var standardItem = result.LineItems.First(li => li.Sku == "STANDARD");
        standardItem.TaxAmount.ShouldBe(20m);

        var zeroRatedItem = result.LineItems.First(li => li.Sku == "ZERO-RATED");
        zeroRatedItem.TaxAmount.ShouldBe(0m);
    }

    [Fact]
    public void CalculateLineItemTax_MixedTaxableAndNonTaxable_OnlyTaxesTaxableItems()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Sku = "TAXABLE",
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true
                },
                new TaxableLineItemInput
                {
                    Sku = "NON-TAXABLE",
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = false // Even though rate is set, not taxable
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        result.TotalTax.ShouldBe(20m); // Only taxable item

        var nonTaxableItem = result.LineItems.First(li => li.Sku == "NON-TAXABLE");
        nonTaxableItem.TaxAmount.ShouldBe(0m);
    }

    #endregion

    #region Percentage Discount Tests

    [Fact]
    public void CalculateLineItemTax_WithPercentageDiscount_ReducesTaxableAmount()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true,
                    DiscountType = DiscountValueType.Percentage,
                    DiscountValue = 10m // 10% off
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        result.LineItems[0].LineTotal.ShouldBe(100m);
        result.LineItems[0].DiscountAmount.ShouldBe(10m); // 100 * 10%
        result.LineItems[0].TaxableAmount.ShouldBe(90m); // 100 - 10
        result.LineItems[0].TaxAmount.ShouldBe(18m); // 90 * 20%
        result.TotalTax.ShouldBe(18m);
    }

    [Fact]
    public void CalculateLineItemTax_WithPercentageDiscount_OnMultipleQuantity_CalculatesCorrectly()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 50m,
                    Quantity = 2,
                    TaxRate = 20m,
                    IsTaxable = true,
                    DiscountType = DiscountValueType.Percentage,
                    DiscountValue = 20m // 20% off
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        result.LineItems[0].LineTotal.ShouldBe(100m); // 50 * 2
        result.LineItems[0].DiscountAmount.ShouldBe(20m); // 100 * 20%
        result.LineItems[0].TaxableAmount.ShouldBe(80m); // 100 - 20
        result.LineItems[0].TaxAmount.ShouldBe(16m); // 80 * 20%
    }

    #endregion

    #region Fixed Amount Discount Tests

    [Fact]
    public void CalculateLineItemTax_WithFixedDiscount_ReducesTaxableAmount()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true,
                    DiscountType = DiscountValueType.FixedAmount,
                    DiscountValue = 25m // £25 off
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "GBP");

        // Assert
        result.LineItems[0].LineTotal.ShouldBe(100m);
        result.LineItems[0].DiscountAmount.ShouldBe(25m);
        result.LineItems[0].TaxableAmount.ShouldBe(75m); // 100 - 25
        result.LineItems[0].TaxAmount.ShouldBe(15m); // 75 * 20%
    }

    [Fact]
    public void CalculateLineItemTax_WithFixedDiscount_MultipleQuantity_MultipliesDiscount()
    {
        // Arrange - Fixed discount is per unit
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 50m,
                    Quantity = 3,
                    TaxRate = 10m,
                    IsTaxable = true,
                    DiscountType = DiscountValueType.FixedAmount,
                    DiscountValue = 10m // £10 off per unit
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "GBP");

        // Assert
        result.LineItems[0].LineTotal.ShouldBe(150m); // 50 * 3
        result.LineItems[0].DiscountAmount.ShouldBe(30m); // 10 * 3 = 30
        result.LineItems[0].TaxableAmount.ShouldBe(120m); // 150 - 30
        result.LineItems[0].TaxAmount.ShouldBe(12m); // 120 * 10%
    }

    #endregion

    #region Discount Cap Tests

    [Fact]
    public void CalculateLineItemTax_DiscountExceedsLineTotal_CapsAtLineTotal()
    {
        // Arrange - Discount would exceed line total
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 50m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true,
                    DiscountType = DiscountValueType.FixedAmount,
                    DiscountValue = 100m // More than line total
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        result.LineItems[0].DiscountAmount.ShouldBe(50m); // Capped at line total
        result.LineItems[0].TaxableAmount.ShouldBe(0m);
        result.LineItems[0].TaxAmount.ShouldBe(0m);
        result.TotalTax.ShouldBe(0m);
    }

    [Fact]
    public void CalculateLineItemTax_PercentageDiscountOver100_CapsAt100Percent()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true,
                    DiscountType = DiscountValueType.Percentage,
                    DiscountValue = 150m // 150% - more than 100%
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        result.LineItems[0].DiscountAmount.ShouldBe(100m); // Capped at line total
        result.LineItems[0].TaxableAmount.ShouldBe(0m);
    }

    #endregion

    #region Order Discount Pro-Rating Tests

    [Fact]
    public void CalculateLineItemTax_WithOrderDiscount_ProRatesAcrossTaxableItems()
    {
        // Arrange - Two items of equal value, order discount should be split evenly
        var input = new LineItemTaxInput
        {
            OrderDiscountTotal = 20m, // £20 order discount
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Sku = "ITEM-1",
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true
                },
                new TaxableLineItemInput
                {
                    Sku = "ITEM-2",
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "GBP");

        // Assert
        // Each item gets 50% of the order discount (since they're equal value)
        var item1 = result.LineItems.First(li => li.Sku == "ITEM-1");
        var item2 = result.LineItems.First(li => li.Sku == "ITEM-2");

        item1.ProRatedOrderDiscount.ShouldBe(10m); // 50% of 20
        item2.ProRatedOrderDiscount.ShouldBe(10m);

        item1.TaxableAmount.ShouldBe(90m); // 100 - 10
        item2.TaxableAmount.ShouldBe(90m);

        item1.TaxAmount.ShouldBe(18m); // 90 * 20%
        item2.TaxAmount.ShouldBe(18m);

        result.TotalTax.ShouldBe(36m); // 18 + 18
    }

    [Fact]
    public void CalculateLineItemTax_WithOrderDiscount_ProRatesProportionally()
    {
        // Arrange - Items with different values get proportional discount
        var input = new LineItemTaxInput
        {
            OrderDiscountTotal = 30m,
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Sku = "EXPENSIVE",
                    Amount = 150m, // 75% of total
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true
                },
                new TaxableLineItemInput
                {
                    Sku = "CHEAP",
                    Amount = 50m, // 25% of total
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "GBP");

        // Assert
        var expensive = result.LineItems.First(li => li.Sku == "EXPENSIVE");
        var cheap = result.LineItems.First(li => li.Sku == "CHEAP");

        expensive.ProRatedOrderDiscount.ShouldBe(22.5m); // 75% of 30
        cheap.ProRatedOrderDiscount.ShouldBe(7.5m); // 25% of 30

        expensive.TaxableAmount.ShouldBe(127.5m); // 150 - 22.5
        cheap.TaxableAmount.ShouldBe(42.5m); // 50 - 7.5
    }

    [Fact]
    public void CalculateLineItemTax_WithOrderDiscount_NonTaxableItemsExcludedFromProRating()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            OrderDiscountTotal = 20m,
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Sku = "TAXABLE",
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true
                },
                new TaxableLineItemInput
                {
                    Sku = "NON-TAXABLE",
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 0m,
                    IsTaxable = false
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "GBP");

        // Assert
        // Only taxable item gets the order discount
        var taxable = result.LineItems.First(li => li.Sku == "TAXABLE");
        var nonTaxable = result.LineItems.First(li => li.Sku == "NON-TAXABLE");

        taxable.ProRatedOrderDiscount.ShouldBe(20m); // Gets full discount
        nonTaxable.ProRatedOrderDiscount.ShouldBe(0m); // No discount pro-rating

        taxable.TaxableAmount.ShouldBe(80m); // 100 - 20
    }

    [Fact]
    public void CalculateLineItemTax_WithOrderAndLineDiscount_BothApplied()
    {
        // Arrange - Combine line item discount and order discount
        var input = new LineItemTaxInput
        {
            OrderDiscountTotal = 10m,
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true,
                    DiscountType = DiscountValueType.FixedAmount,
                    DiscountValue = 15m // Line discount
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "GBP");

        // Assert
        result.LineItems[0].DiscountAmount.ShouldBe(15m);
        result.LineItems[0].ProRatedOrderDiscount.ShouldBe(10m);
        result.LineItems[0].TaxableAmount.ShouldBe(75m); // 100 - 15 - 10
        result.LineItems[0].TaxAmount.ShouldBe(15m); // 75 * 20%
    }

    #endregion

    #region Currency Rounding Tests

    [Fact]
    public void CalculateLineItemTax_WithJPY_RoundsToZeroDecimals()
    {
        // Arrange - Japanese Yen has 0 decimal places
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 1000m,
                    Quantity = 1,
                    TaxRate = 8m, // Japanese consumption tax
                    IsTaxable = true
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "JPY");

        // Assert
        result.TotalTax.ShouldBe(80m); // 1000 * 8% = 80
        (result.TotalTax % 1).ShouldBe(0m); // No decimal places
    }

    [Fact]
    public void CalculateLineItemTax_WithUSD_RoundsToTwoDecimals()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 99.99m,
                    Quantity = 1,
                    TaxRate = 8.25m, // US sales tax
                    IsTaxable = true
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        // 99.99 * 8.25% = 8.249175 → rounds to 8.25
        result.TotalTax.ShouldBe(8.25m);
    }

    [Fact]
    public void CalculateLineItemTax_WithGBP_RoundsCorrectly()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 33.33m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "GBP");

        // Assert
        // 33.33 * 20% = 6.666 → rounds to 6.67
        result.TotalTax.ShouldBe(6.67m);
    }

    #endregion

    #region CalculateTaxableAmount Tests

    [Fact]
    public void CalculateTaxableAmount_WithLineDiscount_SubtractsDiscount()
    {
        // Arrange
        var lineTotal = 100m;
        var lineDiscount = 20m;
        var orderDiscount = 0m;
        var totalTaxable = 100m;

        // Act
        var result = _taxCalculationService.CalculateTaxableAmount(
            lineTotal, lineDiscount, orderDiscount, totalTaxable, "USD");

        // Assert
        result.ShouldBe(80m); // 100 - 20
    }

    [Fact]
    public void CalculateTaxableAmount_WithOrderDiscount_ProRatesAndSubtracts()
    {
        // Arrange
        var lineTotal = 100m;
        var lineDiscount = 0m;
        var orderDiscount = 20m;
        var totalTaxable = 200m; // Line is 50% of total

        // Act
        var result = _taxCalculationService.CalculateTaxableAmount(
            lineTotal, lineDiscount, orderDiscount, totalTaxable, "USD");

        // Assert
        // Pro-rated: 20 * (100/200) = 10
        // Taxable: 100 - 0 - 10 = 90
        result.ShouldBe(90m);
    }

    [Fact]
    public void CalculateTaxableAmount_WithBothDiscounts_SubtractsBoth()
    {
        // Arrange
        var lineTotal = 100m;
        var lineDiscount = 15m;
        var orderDiscount = 30m;
        var totalTaxable = 100m; // Line is 100% of total

        // Act
        var result = _taxCalculationService.CalculateTaxableAmount(
            lineTotal, lineDiscount, orderDiscount, totalTaxable, "USD");

        // Assert
        // Pro-rated order discount: 30 * (100/100) = 30
        // Taxable: 100 - 15 - 30 = 55
        result.ShouldBe(55m);
    }

    [Fact]
    public void CalculateTaxableAmount_WhenDiscountsExceedTotal_ReturnsZero()
    {
        // Arrange
        var lineTotal = 50m;
        var lineDiscount = 40m;
        var orderDiscount = 20m;
        var totalTaxable = 50m;

        // Act
        var result = _taxCalculationService.CalculateTaxableAmount(
            lineTotal, lineDiscount, orderDiscount, totalTaxable, "USD");

        // Assert
        // 50 - 40 - 20 = -10, capped at 0
        result.ShouldBe(0m);
    }

    [Fact]
    public void CalculateTaxableAmount_WithZeroTotalTaxable_NoProRatedDiscount()
    {
        // Arrange
        var lineTotal = 100m;
        var lineDiscount = 0m;
        var orderDiscount = 50m;
        var totalTaxable = 0m; // No taxable items

        // Act
        var result = _taxCalculationService.CalculateTaxableAmount(
            lineTotal, lineDiscount, orderDiscount, totalTaxable, "USD");

        // Assert
        // No pro-rating when total taxable is 0
        result.ShouldBe(100m);
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void CalculateLineItemTax_EmptyLineItems_ReturnsZeroTax()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            LineItems = []
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        result.TotalTax.ShouldBe(0m);
        result.LineItems.ShouldBeEmpty();
    }

    [Fact]
    public void CalculateLineItemTax_PreservesLineItemIdentifiers()
    {
        // Arrange
        var id = Guid.NewGuid();
        var sku = "TEST-SKU-123";
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Id = id,
                    Sku = sku,
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        result.LineItems[0].Id.ShouldBe(id);
        result.LineItems[0].Sku.ShouldBe(sku);
    }

    [Fact]
    public void CalculateLineItemTax_NullDiscount_TreatedAsNoDiscount()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true,
                    DiscountType = null,
                    DiscountValue = null
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        result.LineItems[0].DiscountAmount.ShouldBe(0m);
        result.LineItems[0].TaxableAmount.ShouldBe(100m);
    }

    [Fact]
    public void CalculateLineItemTax_ZeroDiscountValue_NoDiscountApplied()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 100m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true,
                    DiscountType = DiscountValueType.Percentage,
                    DiscountValue = 0m // Zero discount
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        result.LineItems[0].DiscountAmount.ShouldBe(0m);
    }

    [Fact]
    public void CalculateLineItemTax_VerySmallAmounts_HandlesCorrectly()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 0.01m,
                    Quantity = 1,
                    TaxRate = 20m,
                    IsTaxable = true
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        // 0.01 * 20% = 0.002 → rounds to 0.00
        result.TotalTax.ShouldBe(0m);
    }

    [Fact]
    public void CalculateLineItemTax_LargeAmounts_HandlesCorrectly()
    {
        // Arrange
        var input = new LineItemTaxInput
        {
            LineItems =
            [
                new TaxableLineItemInput
                {
                    Amount = 999999.99m,
                    Quantity = 100,
                    TaxRate = 20m,
                    IsTaxable = true
                }
            ]
        };

        // Act
        var result = _taxCalculationService.CalculateLineItemTax(input, "USD");

        // Assert
        // 999999.99 * 100 * 20% = 19999999.80
        result.TotalTax.ShouldBe(19999999.80m);
    }

    #endregion

    #region CalculateOrderTax Shipping Tax Tests

    [Fact]
    public void CalculateOrderTax_ProportionalShipping_CalculatesWeightedAverage()
    {
        // Arrange - Two items at different tax rates
        var input = new OrderTaxInput
        {
            TaxableItems =
            [
                new TaxableItemWithDiscounts { ItemTotal = 100m, TaxRate = 20m }, // £100 @ 20%
                new TaxableItemWithDiscounts { ItemTotal = 100m, TaxRate = 10m } // £100 @ 10%
            ],
            ShippingAmount = 10m,
            IsShippingTaxable = true,
            ShippingTaxRate = null, // Proportional calculation
            UnlinkedBeforeTaxDiscountTotal = 0,
            TotalTaxableAmount = 200m
        };

        // Act
        var result = _taxCalculationService.CalculateOrderTax(input, "GBP");

        // Assert
        // Line item tax: (100 * 0.20) + (100 * 0.10) = 30
        result.LineItemTax.ShouldBe(30m);

        // Weighted average rate: (100*20 + 100*10) / 200 = 15%
        // Shipping tax: 10 * 0.15 = 1.50
        result.ShippingTax.ShouldBe(1.50m);
        result.TotalTax.ShouldBe(31.50m);
    }

    [Fact]
    public void CalculateOrderTax_ExplicitShippingRate_UsesProvidedRate()
    {
        // Arrange
        var input = new OrderTaxInput
        {
            TaxableItems =
            [
                new TaxableItemWithDiscounts { ItemTotal = 100m, TaxRate = 20m },
                new TaxableItemWithDiscounts { ItemTotal = 100m, TaxRate = 10m }
            ],
            ShippingAmount = 10m,
            IsShippingTaxable = true,
            ShippingTaxRate = 20m, // Explicit 20% rate
            UnlinkedBeforeTaxDiscountTotal = 0,
            TotalTaxableAmount = 200m
        };

        // Act
        var result = _taxCalculationService.CalculateOrderTax(input, "GBP");

        // Assert
        result.LineItemTax.ShouldBe(30m);
        result.ShippingTax.ShouldBe(2m); // 10 * 0.20 = 2
        result.TotalTax.ShouldBe(32m);
    }

    [Fact]
    public void CalculateOrderTax_ZeroShippingRate_NoShippingTax()
    {
        // Arrange
        var input = new OrderTaxInput
        {
            TaxableItems =
            [
                new TaxableItemWithDiscounts { ItemTotal = 100m, TaxRate = 20m }
            ],
            ShippingAmount = 10m,
            IsShippingTaxable = true,
            ShippingTaxRate = 0m, // Explicitly not taxable
            UnlinkedBeforeTaxDiscountTotal = 0,
            TotalTaxableAmount = 100m
        };

        // Act
        var result = _taxCalculationService.CalculateOrderTax(input, "GBP");

        // Assert
        result.LineItemTax.ShouldBe(20m);
        result.ShippingTax.ShouldBe(0m);
        result.TotalTax.ShouldBe(20m);
    }

    [Fact]
    public void CalculateOrderTax_ProportionalWithDiscounts_UsesPreDiscountTotalsForRate()
    {
        // Per architecture: "Shipping tax uses pre-discount item totals for weighted average"
        var input = new OrderTaxInput
        {
            TaxableItems =
            [
                new TaxableItemWithDiscounts
                {
                    ItemTotal = 100m,
                    TaxRate = 20m,
                    LinkedDiscount = -20m // £20 discount on this item
                },
                new TaxableItemWithDiscounts { ItemTotal = 100m, TaxRate = 10m }
            ],
            ShippingAmount = 10m,
            IsShippingTaxable = true,
            ShippingTaxRate = null, // Proportional
            UnlinkedBeforeTaxDiscountTotal = 0,
            TotalTaxableAmount = 200m
        };

        // Act
        var result = _taxCalculationService.CalculateOrderTax(input, "GBP");

        // Assert
        // Line item tax: (80 * 0.20) + (100 * 0.10) = 16 + 10 = 26
        result.LineItemTax.ShouldBe(26m);

        // Weighted average still uses pre-discount: (100*20 + 100*10) / 200 = 15%
        // NOT: (80*20 + 100*10) / 180 = 14.44%
        result.ShippingTax.ShouldBe(1.50m);
        result.TotalTax.ShouldBe(27.50m);
    }

    [Fact]
    public void CalculateOrderTax_ShippingNotTaxable_NoShippingTax()
    {
        // Arrange
        var input = new OrderTaxInput
        {
            TaxableItems =
            [
                new TaxableItemWithDiscounts { ItemTotal = 100m, TaxRate = 20m }
            ],
            ShippingAmount = 10m,
            IsShippingTaxable = false, // Shipping not taxable
            ShippingTaxRate = null,
            UnlinkedBeforeTaxDiscountTotal = 0,
            TotalTaxableAmount = 100m
        };

        // Act
        var result = _taxCalculationService.CalculateOrderTax(input, "GBP");

        // Assert
        result.LineItemTax.ShouldBe(20m);
        result.ShippingTax.ShouldBe(0m);
        result.TotalTax.ShouldBe(20m);
    }

    [Fact]
    public void CalculateOrderTax_ProportionalShipping_RoundsPerCurrency()
    {
        // Arrange - JPY has 0 decimal places
        var input = new OrderTaxInput
        {
            TaxableItems =
            [
                new TaxableItemWithDiscounts { ItemTotal = 1000m, TaxRate = 8m },
                new TaxableItemWithDiscounts { ItemTotal = 500m, TaxRate = 10m }
            ],
            ShippingAmount = 500m,
            IsShippingTaxable = true,
            ShippingTaxRate = null,
            UnlinkedBeforeTaxDiscountTotal = 0,
            TotalTaxableAmount = 1500m
        };

        // Act
        var result = _taxCalculationService.CalculateOrderTax(input, "JPY");

        // Assert
        // Line item tax: (1000 * 0.08) + (500 * 0.10) = 80 + 50 = 130
        result.LineItemTax.ShouldBe(130m);

        // Weighted rate: (1000*8 + 500*10) / 1500 = 13000/1500 = 8.67%
        // Shipping tax: 500 * 0.0867 = 43.33 → rounded to 43 (JPY)
        result.ShippingTax.ShouldBe(43m);
    }

    #endregion
}
