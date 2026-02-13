using Merchello.Core;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
using Merchello.Core.Tax.Services;
using Microsoft.Extensions.Options;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Accounting;

/// <summary>
/// Tests for the unified LineItemService.CalculateFromLineItems method
/// that handles both basket and invoice calculations with discount line items.
/// </summary>
public class LineItemCalculationTests
{
    private readonly LineItemService _lineItemService;
    private readonly string _currencyCode = "USD";

    public LineItemCalculationTests()
    {
        var settings = Options.Create(new MerchelloSettings
        {
            DefaultRounding = MidpointRounding.AwayFromZero,
            StoreCurrencyCode = "USD"
        });
        var currencyService = new CurrencyService(settings);
        var taxCalculationService = new TaxCalculationService(currencyService);
        var lineItemFactory = new LineItemFactory(currencyService);
        _lineItemService = new LineItemService(currencyService, taxCalculationService, lineItemFactory);
    }

    #region CalculateFromLineItems - Basic Tests

    [Fact]
    public void CalculateFromLineItems_WithProductsOnly_CalculatesCorrectTotals()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20),
            CreateProductLineItem("SKU2", 50m, 2, taxRate: 20)
        ];

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert
        subTotal.ShouldBe(200m); // 100 + (50 * 2)
        discount.ShouldBe(0m);
        adjustedSubTotal.ShouldBe(200m);
        tax.ShouldBe(40m); // 200 * 0.20
        total.ShouldBe(240m); // 200 + 40
        shipping.ShouldBe(0m);
    }

    [Fact]
    public void CalculateFromLineItems_WithShipping_IncludesShippingInTotal()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        ];

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 10m, _currencyCode, isShippingTaxable: true);

        // Assert
        subTotal.ShouldBe(100m);
        adjustedSubTotal.ShouldBe(100m);
        tax.ShouldBe(22m); // (100 * 0.20) + (10 * 0.20)
        total.ShouldBe(132m); // 100 + 22 + 10
        shipping.ShouldBe(10m);
    }

    [Fact]
    public void CalculateFromLineItems_WithNonTaxableShipping_DoesNotTaxShipping()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        ];

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 10m, _currencyCode, isShippingTaxable: false);

        // Assert
        tax.ShouldBe(20m); // Only product tax, no shipping tax
        total.ShouldBe(130m); // 100 + 20 + 10
    }

    #endregion

    #region CalculateFromLineItems - Fixed Amount Discounts

    [Fact]
    public void CalculateFromLineItems_WithFixedAmountDiscount_AppliesDiscount()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        ];
        AddDiscount(lineItems, 10m, DiscountValueType.FixedAmount, _currencyCode, name: "£10 off");

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert
        subTotal.ShouldBe(100m);
        discount.ShouldBe(10m);
        adjustedSubTotal.ShouldBe(90m);
        tax.ShouldBe(18m); // Tax on discounted amount: 90 * 0.20
        total.ShouldBe(108m);
    }

    [Fact]
    public void CalculateFromLineItems_WithLinkedFixedAmountDiscount_AppliesToSpecificProduct()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20),
            CreateProductLineItem("SKU2", 50m, 1, taxRate: 20)
        ];
        AddDiscount(lineItems, 10m, DiscountValueType.FixedAmount, _currencyCode, linkedSku: "SKU1");

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert
        subTotal.ShouldBe(150m);
        discount.ShouldBe(10m);
        adjustedSubTotal.ShouldBe(140m);
        // Tax: SKU1 = (100-10) * 0.20 = 18, SKU2 = 50 * 0.20 = 10, Total = 28
        tax.ShouldBe(28m);
        total.ShouldBe(168m);
    }

    #endregion

    #region CalculateFromLineItems - Percentage Discounts

    [Fact]
    public void CalculateFromLineItems_WithPercentageDiscount_AppliesDiscountCorrectly()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        ];
        AddDiscount(lineItems, 10m, DiscountValueType.Percentage, _currencyCode, name: "10% off");

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert
        subTotal.ShouldBe(100m);
        discount.ShouldBe(10m); // 10% of 100
        adjustedSubTotal.ShouldBe(90m);
        tax.ShouldBe(18m); // 90 * 0.20
        total.ShouldBe(108m);
    }

    [Fact]
    public void CalculateFromLineItems_WithLinkedPercentageDiscount_AppliesToSpecificProduct()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20),
            CreateProductLineItem("SKU2", 200m, 1, taxRate: 20)
        ];
        AddDiscount(lineItems, 50m, DiscountValueType.Percentage, _currencyCode, linkedSku: "SKU1");

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert
        subTotal.ShouldBe(300m);
        discount.ShouldBe(50m); // 50% of SKU1's 100 = 50
        adjustedSubTotal.ShouldBe(250m);
        // Tax: SKU1 = (100-50) * 0.20 = 10, SKU2 = 200 * 0.20 = 40, Total = 50
        tax.ShouldBe(50m);
        total.ShouldBe(300m);
    }

    #endregion

    #region CalculateFromLineItems - Pro-rating

    [Fact]
    public void CalculateFromLineItems_WithUnlinkedDiscount_ProRatesAcrossItems()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20),
            CreateProductLineItem("SKU2", 100m, 1, taxRate: 20)
        ];
        AddDiscount(lineItems, 20m, DiscountValueType.FixedAmount, _currencyCode);

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert
        subTotal.ShouldBe(200m);
        discount.ShouldBe(20m);
        adjustedSubTotal.ShouldBe(180m);
        // Each item gets proportional discount: 10 each (50% of 20)
        // Tax: (100-10) * 0.20 + (100-10) * 0.20 = 18 + 18 = 36
        tax.ShouldBe(36m);
        total.ShouldBe(216m);
    }

    #endregion

    #region CalculateFromLineItems - Edge Cases

    [Fact]
    public void CalculateFromLineItems_WithEmptyLineItems_ReturnsZeros()
    {
        // Arrange
        List<LineItem> lineItems = [];

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert
        subTotal.ShouldBe(0m);
        discount.ShouldBe(0m);
        adjustedSubTotal.ShouldBe(0m);
        tax.ShouldBe(0m);
        total.ShouldBe(0m);
    }

    [Fact]
    public void CalculateFromLineItems_WithNonTaxableItems_DoesNotCalculateTax()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20, isTaxable: false)
        ];

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode, isShippingTaxable: false);

        // Assert
        tax.ShouldBe(0m);
        total.ShouldBe(100m);
    }

    [Fact]
    public void CalculateFromLineItems_WithDiscountExceedingSubtotal_CapsAtZero()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 50m, 1, taxRate: 20)
        ];
        AddDiscount(lineItems, 100m, DiscountValueType.FixedAmount, _currencyCode);

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert
        subTotal.ShouldBe(50m);
        adjustedSubTotal.ShouldBe(0m); // Capped at 0
        tax.ShouldBe(0m);
        total.ShouldBe(0m);
    }

    [Fact]
    public void CalculateFromLineItems_With100PercentDiscount_ResultsInZeroTotal()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        ];
        AddDiscount(lineItems, 100m, DiscountValueType.Percentage, _currencyCode);

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert
        subTotal.ShouldBe(100m);
        discount.ShouldBe(100m);
        adjustedSubTotal.ShouldBe(0m);
        tax.ShouldBe(0m);
        total.ShouldBe(0m);
    }

    #endregion

    #region AddDiscountLineItem - Validation Tests

    [Fact]
    public void AddDiscountLineItem_WithZeroAmount_ReturnsError()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        ];

        // Act
        var errors = AddDiscount(lineItems, 0m, DiscountValueType.FixedAmount, _currencyCode);

        // Assert
        errors.ShouldContain(e => e.Contains("greater than zero"));
    }

    [Fact]
    public void AddDiscountLineItem_WithNegativeAmount_ReturnsError()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        ];

        // Act
        var errors = AddDiscount(lineItems, -10m, DiscountValueType.FixedAmount, _currencyCode);

        // Assert
        errors.ShouldContain(e => e.Contains("greater than zero"));
    }

    [Fact]
    public void AddDiscountLineItem_WithPercentageOver100_ReturnsError()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        ];

        // Act
        var errors = AddDiscount(lineItems, 150m, DiscountValueType.Percentage, _currencyCode);

        // Assert
        errors.ShouldContain(e => e.Contains("exceed 100%"));
    }

    [Fact]
    public void AddDiscountLineItem_WithInvalidLinkedSku_ReturnsError()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        ];

        // Act
        var errors = AddDiscount(lineItems, 10m, DiscountValueType.FixedAmount, _currencyCode, linkedSku: "INVALID-SKU");

        // Assert
        errors.ShouldContain(e => e.Contains("not found"));
    }

    [Fact]
    public void AddDiscountLineItem_WithValidLinkedSku_AddsSuccessfully()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        ];

        // Act
        var errors = AddDiscount(lineItems, 10m, DiscountValueType.FixedAmount, _currencyCode, linkedSku: "SKU1");

        // Assert
        errors.ShouldBeEmpty();
        lineItems.Count.ShouldBe(2);
        var discount = lineItems.First(li => li.LineItemType == LineItemType.Discount);
        discount.DependantLineItemSku.ShouldBe("SKU1");
    }

    [Fact]
    public void AddDiscountLineItem_StoresMetadataCorrectly()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        ];

        // Act
        AddDiscount(lineItems, 15m, DiscountValueType.Percentage, _currencyCode, name: "Test Discount", reason: "VIP Customer");

        // Assert
        var discount = lineItems.First(li => li.LineItemType == LineItemType.Discount);
        discount.Name.ShouldBe("Test Discount");
        discount.ExtendedData[Constants.ExtendedDataKeys.DiscountValueType].ShouldBe("Percentage");
        discount.ExtendedData[Constants.ExtendedDataKeys.DiscountValue].ShouldBe(15m);
        discount.ExtendedData[Constants.ExtendedDataKeys.Reason].ShouldBe("VIP Customer");
    }

    #endregion

    #region Mixed Discounts Tests

    [Fact]
    public void CalculateFromLineItems_WithMixedDiscounts_AppliesInCorrectOrder()
    {
        // Arrange: Product with both percentage and fixed discounts
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        ];
        // Add percentage discount first, then fixed
        AddDiscount(lineItems, 10m, DiscountValueType.Percentage, _currencyCode, name: "10% off");
        AddDiscount(lineItems, 5m, DiscountValueType.FixedAmount, _currencyCode, name: "£5 off");

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert - Both discounts applied
        subTotal.ShouldBe(100m);
        discount.ShouldBe(15m); // 10% + £5 = £10 + £5
        adjustedSubTotal.ShouldBe(85m);
        tax.ShouldBe(17m); // 20% of 85
        total.ShouldBe(102m);
    }

    [Fact]
    public void CalculateFromLineItems_WithProductAndOrderDiscounts_CalculatesCorrectly()
    {
        // Arrange: Two products with product-level and order-level discounts
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 60m, 1, taxRate: 20),
            CreateProductLineItem("SKU2", 40m, 1, taxRate: 20)
        ];
        // Product-linked discount on SKU1
        AddDiscount(lineItems, 10m, DiscountValueType.FixedAmount, _currencyCode, linkedSku: "SKU1", name: "Product discount");
        // Order-level discount (not linked to any SKU)
        AddDiscount(lineItems, 5m, DiscountValueType.FixedAmount, _currencyCode, name: "Order discount");

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert
        subTotal.ShouldBe(100m);
        discount.ShouldBe(15m); // £10 product + £5 order
        adjustedSubTotal.ShouldBe(85m);
        tax.ShouldBe(17m); // 20% of 85
        total.ShouldBe(102m);
    }

    #endregion

    #region Multiple Tax Groups Tests

    [Fact]
    public void CalculateFromLineItems_WithMultipleTaxGroups_AppliesTaxCorrectly()
    {
        // Arrange: Items with different tax rates
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 50m, 1, taxRate: 20), // Standard rate
            CreateProductLineItem("SKU2", 30m, 1, taxRate: 5),   // Reduced rate
            CreateProductLineItem("SKU3", 20m, 1, taxRate: 0)    // Zero rate
        ];

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert
        subTotal.ShouldBe(100m);
        // Tax: (50 * 0.20) + (30 * 0.05) + (20 * 0) = 10 + 1.5 + 0 = 11.5
        tax.ShouldBe(11.5m);
        total.ShouldBe(111.5m);
    }

    [Fact]
    public void CalculateFromLineItems_WithDiscountOnMixedTaxItems_ProRatesTax()
    {
        // Arrange: Two items with different tax rates, order discount pro-rated
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 60m, 1, taxRate: 20), // 60% of subtotal
            CreateProductLineItem("SKU2", 40m, 1, taxRate: 10)  // 40% of subtotal
        ];
        // £10 order discount, pro-rated: £6 off SKU1, £4 off SKU2
        AddDiscount(lineItems, 10m, DiscountValueType.FixedAmount, _currencyCode, name: "Order discount");

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert
        subTotal.ShouldBe(100m);
        discount.ShouldBe(10m);
        adjustedSubTotal.ShouldBe(90m);
        // Tax after discount: (54 * 0.20) + (36 * 0.10) = 10.8 + 3.6 = 14.4
        tax.ShouldBe(14.4m);
        total.ShouldBe(104.4m);
    }

    #endregion

    #region Shipping and Discount Interaction Tests

    [Fact]
    public void CalculateFromLineItems_WithShippingAndDiscount_ShippingUnaffectedByDiscount()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        ];
        AddDiscount(lineItems, 20m, DiscountValueType.FixedAmount, _currencyCode, name: "£20 off");

        // Act - £15 shipping, taxable
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 15m, _currencyCode, isShippingTaxable: true);

        // Assert
        subTotal.ShouldBe(100m);
        discount.ShouldBe(20m);
        adjustedSubTotal.ShouldBe(80m);
        shipping.ShouldBe(15m);
        // Tax: 80 * 0.20 + 15 * 0.20 = 16 + 3 = 19
        tax.ShouldBe(19m);
        total.ShouldBe(114m); // 80 + 19 + 15
    }

    #endregion

    #region Additional Edge Cases

    [Fact]
    public void CalculateFromLineItems_WithZeroQuantity_HandlesGracefully()
    {
        // Arrange: Item with zero quantity shouldn't contribute to totals
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 0, taxRate: 20), // Zero quantity
            CreateProductLineItem("SKU2", 50m, 1, taxRate: 20)
        ];

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert
        subTotal.ShouldBe(50m); // Only SKU2 counts
        tax.ShouldBe(10m);
        total.ShouldBe(60m);
    }

    [Fact]
    public void CalculateFromLineItems_WithMixedTaxableAndNonTaxable_CalculatesCorrectly()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 80m, 1, taxRate: 20, isTaxable: true),
            CreateProductLineItem("SKU2", 20m, 1, taxRate: 20, isTaxable: false) // Gift card
        ];

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert
        subTotal.ShouldBe(100m);
        tax.ShouldBe(16m); // Only 80 is taxable at 20%
        total.ShouldBe(116m);
    }

    [Fact]
    public void CalculateFromLineItems_WithMixedZeroAndStandardRates_ProportionalShippingIncludesZeroRateLines()
    {
        // Arrange - 0% category remains taxable and must participate in proportional denominator.
        List<LineItem> lineItems =
        [
            CreateProductLineItem("ZERO-RATE", 100m, 1, taxRate: 0m, isTaxable: true),
            CreateProductLineItem("STANDARD", 100m, 1, taxRate: 20m, isTaxable: true)
        ];

        // Act - proportional shipping mode (ShippingTaxRate = null)
        var (_, _, _, tax, _, _) = Calculate(lineItems, 10m, _currencyCode, isShippingTaxable: true);

        // Assert - line tax = 20, weighted shipping rate = 10%, shipping tax = 1 => total tax = 21
        tax.ShouldBe(21m);
    }

    [Fact]
    public void CalculateFromLineItems_WithVerySmallAmounts_RoundsCorrectly()
    {
        // Arrange: Test currency rounding
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 0.01m, 1, taxRate: 20)
        ];

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert - Should round properly
        subTotal.ShouldBe(0.01m);
        tax.ShouldBe(0m); // 0.01 * 0.20 = 0.002, rounds to 0
        total.ShouldBe(0.01m);
    }

    [Fact]
    public void CalculateFromLineItems_WithLargeQuantity_CalculatesCorrectly()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 9.99m, 100, taxRate: 20)
        ];

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 0, _currencyCode);

        // Assert
        subTotal.ShouldBe(999m); // 9.99 * 100
        tax.ShouldBe(199.8m); // 999 * 0.20
        total.ShouldBe(1198.8m);
    }

    [Fact]
    public void CalculateFromLineItems_DisplayedValuesSumToTotal_NoRoundingDiscrepancy()
    {
        // Arrange - values that would cause rounding discrepancy without reconciliation
        // Using prices that when individually rounded and summed differ from rounded sum
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 7.446m, 1, taxRate: 30.05m)
        ];

        // Act - with shipping that also has fractional value
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 3.716m, _currencyCode);

        // Assert - displayed values MUST sum exactly to total (no penny discrepancy)
        var displaySum = adjustedSubTotal + tax + shipping;
        displaySum.ShouldBe(total, "Displayed values must sum exactly to total");
    }

    [Fact]
    public void CalculateFromLineItems_WithDiscountsAndShipping_DisplayedValuesSumToTotal()
    {
        // Arrange - complex scenario with discounts
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 49.99m, 2, taxRate: 20),
            CreateProductLineItem("SKU2", 24.99m, 1, taxRate: 5)
        ];
        AddDiscount(lineItems, 15m, DiscountValueType.Percentage, _currencyCode, name: "15% off");

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            Calculate(lineItems, 9.99m, _currencyCode);

        // Assert - displayed values MUST sum exactly to total
        var displaySum = adjustedSubTotal + tax + shipping;
        displaySum.ShouldBe(total, "Displayed values must sum exactly to total");
    }

    #endregion

    #region RemoveDiscountLineItem Tests

    [Fact]
    public void RemoveDiscountLineItem_WithValidId_RemovesDiscount()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        ];
        AddDiscount(lineItems, 10m, DiscountValueType.FixedAmount, _currencyCode);
        var discountId = lineItems.First(li => li.LineItemType == LineItemType.Discount).Id;

        // Act
        var result = _lineItemService.RemoveDiscountLineItem(lineItems, discountId);

        // Assert
        result.ShouldBeTrue();
        lineItems.Count.ShouldBe(1);
        lineItems.ShouldNotContain(li => li.LineItemType == LineItemType.Discount);
    }

    [Fact]
    public void RemoveDiscountLineItem_WithInvalidId_ReturnsFalse()
    {
        // Arrange
        List<LineItem> lineItems =
        [
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        ];
        AddDiscount(lineItems, 10m, DiscountValueType.FixedAmount, _currencyCode);

        // Act
        var result = _lineItemService.RemoveDiscountLineItem(lineItems, Guid.NewGuid());

        // Assert
        result.ShouldBeFalse();
        lineItems.Count.ShouldBe(2); // Product + Discount still there
    }

    #endregion

    #region Helper Methods

    private static LineItem CreateProductLineItem(string sku, decimal amount, int quantity, decimal taxRate, bool isTaxable = true)
    {
        var lineItem = LineItemFactory.CreateCustomLineItem(
            Guid.Empty,
            $"Product {sku}",
            sku,
            amount,
            cost: 0m,
            quantity: quantity,
            isTaxable: isTaxable,
            taxRate: taxRate);
        lineItem.LineItemType = LineItemType.Product;
        lineItem.OrderId = null;
        return lineItem;
    }

    /// <summary>
    /// Helper method to call CalculateFromLineItems with the old parameter style for test compatibility
    /// </summary>
    private (decimal subTotal, decimal discount, decimal adjustedSubTotal, decimal tax, decimal total, decimal shipping)
        Calculate(List<LineItem> lineItems, decimal shippingAmount, string currencyCode, bool isShippingTaxable = true)
    {
        var result = _lineItemService.CalculateFromLineItems(new CalculateLineItemsParameters
        {
            LineItems = lineItems,
            ShippingAmount = shippingAmount,
            CurrencyCode = currencyCode,
            IsShippingTaxable = isShippingTaxable
        });
        return (result.SubTotal, result.Discount, result.AdjustedSubTotal, result.Tax, result.Total, result.Shipping);
    }

    /// <summary>
    /// Helper method to call AddDiscountLineItem with the old parameter style for test compatibility
    /// </summary>
    private List<string> AddDiscount(
        List<LineItem> lineItems,
        decimal amount,
        DiscountValueType discountValueType,
        string currencyCode,
        string? linkedSku = null,
        string? name = null,
        string? reason = null,
        Dictionary<string, string>? extendedData = null)
    {
        return _lineItemService.AddDiscountLineItem(new AddDiscountLineItemParameters
        {
            LineItems = lineItems,
            Amount = amount,
            DiscountValueType = discountValueType,
            CurrencyCode = currencyCode,
            LinkedSku = linkedSku,
            Name = name,
            Reason = reason,
            ExtendedData = extendedData
        });
    }

    #endregion
}
