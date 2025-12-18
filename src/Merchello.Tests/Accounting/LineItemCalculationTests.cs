using Merchello.Core;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
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
        _lineItemService = new LineItemService(currencyService);
    }

    #region CalculateFromLineItems - Basic Tests

    [Fact]
    public void CalculateFromLineItems_WithProductsOnly_CalculatesCorrectTotals()
    {
        // Arrange
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20),
            CreateProductLineItem("SKU2", 50m, 2, taxRate: 20)
        };

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            _lineItemService.CalculateFromLineItems(lineItems, 0, 20, _currencyCode);

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
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        };

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            _lineItemService.CalculateFromLineItems(lineItems, 10m, 20, _currencyCode, isShippingTaxable: true);

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
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        };

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            _lineItemService.CalculateFromLineItems(lineItems, 10m, 20, _currencyCode, isShippingTaxable: false);

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
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        };
        _lineItemService.AddDiscountLineItem(lineItems, 10m, DiscountValueType.FixedAmount, _currencyCode, name: "£10 off");

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            _lineItemService.CalculateFromLineItems(lineItems, 0, 20, _currencyCode);

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
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20),
            CreateProductLineItem("SKU2", 50m, 1, taxRate: 20)
        };
        _lineItemService.AddDiscountLineItem(lineItems, 10m, DiscountValueType.FixedAmount, _currencyCode, linkedSku: "SKU1");

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            _lineItemService.CalculateFromLineItems(lineItems, 0, 20, _currencyCode);

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
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        };
        _lineItemService.AddDiscountLineItem(lineItems, 10m, DiscountValueType.Percentage, _currencyCode, name: "10% off");

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            _lineItemService.CalculateFromLineItems(lineItems, 0, 20, _currencyCode);

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
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20),
            CreateProductLineItem("SKU2", 200m, 1, taxRate: 20)
        };
        _lineItemService.AddDiscountLineItem(lineItems, 50m, DiscountValueType.Percentage, _currencyCode, linkedSku: "SKU1");

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            _lineItemService.CalculateFromLineItems(lineItems, 0, 20, _currencyCode);

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
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20),
            CreateProductLineItem("SKU2", 100m, 1, taxRate: 20)
        };
        _lineItemService.AddDiscountLineItem(lineItems, 20m, DiscountValueType.FixedAmount, _currencyCode);

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            _lineItemService.CalculateFromLineItems(lineItems, 0, 20, _currencyCode);

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
        var lineItems = new List<LineItem>();

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            _lineItemService.CalculateFromLineItems(lineItems, 0, 20, _currencyCode);

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
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20, isTaxable: false)
        };

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            _lineItemService.CalculateFromLineItems(lineItems, 0, 20, _currencyCode, isShippingTaxable: false);

        // Assert
        tax.ShouldBe(0m);
        total.ShouldBe(100m);
    }

    [Fact]
    public void CalculateFromLineItems_WithDiscountExceedingSubtotal_CapsAtZero()
    {
        // Arrange
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 50m, 1, taxRate: 20)
        };
        _lineItemService.AddDiscountLineItem(lineItems, 100m, DiscountValueType.FixedAmount, _currencyCode);

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            _lineItemService.CalculateFromLineItems(lineItems, 0, 20, _currencyCode);

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
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        };
        _lineItemService.AddDiscountLineItem(lineItems, 100m, DiscountValueType.Percentage, _currencyCode);

        // Act
        var (subTotal, discount, adjustedSubTotal, tax, total, shipping) =
            _lineItemService.CalculateFromLineItems(lineItems, 0, 20, _currencyCode);

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
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        };

        // Act
        var errors = _lineItemService.AddDiscountLineItem(lineItems, 0m, DiscountValueType.FixedAmount, _currencyCode);

        // Assert
        errors.ShouldContain(e => e.Contains("greater than zero"));
    }

    [Fact]
    public void AddDiscountLineItem_WithNegativeAmount_ReturnsError()
    {
        // Arrange
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        };

        // Act
        var errors = _lineItemService.AddDiscountLineItem(lineItems, -10m, DiscountValueType.FixedAmount, _currencyCode);

        // Assert
        errors.ShouldContain(e => e.Contains("greater than zero"));
    }

    [Fact]
    public void AddDiscountLineItem_WithPercentageOver100_ReturnsError()
    {
        // Arrange
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        };

        // Act
        var errors = _lineItemService.AddDiscountLineItem(lineItems, 150m, DiscountValueType.Percentage, _currencyCode);

        // Assert
        errors.ShouldContain(e => e.Contains("exceed 100%"));
    }

    [Fact]
    public void AddDiscountLineItem_WithInvalidLinkedSku_ReturnsError()
    {
        // Arrange
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        };

        // Act
        var errors = _lineItemService.AddDiscountLineItem(lineItems, 10m, DiscountValueType.FixedAmount, _currencyCode, linkedSku: "INVALID-SKU");

        // Assert
        errors.ShouldContain(e => e.Contains("not found"));
    }

    [Fact]
    public void AddDiscountLineItem_WithValidLinkedSku_AddsSuccessfully()
    {
        // Arrange
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        };

        // Act
        var errors = _lineItemService.AddDiscountLineItem(lineItems, 10m, DiscountValueType.FixedAmount, _currencyCode, linkedSku: "SKU1");

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
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        };

        // Act
        _lineItemService.AddDiscountLineItem(lineItems, 15m, DiscountValueType.Percentage, _currencyCode, name: "Test Discount", reason: "VIP Customer");

        // Assert
        var discount = lineItems.First(li => li.LineItemType == LineItemType.Discount);
        discount.Name.ShouldBe("Test Discount");
        discount.ExtendedData[Constants.ExtendedDataKeys.DiscountValueType].ShouldBe("Percentage");
        discount.ExtendedData[Constants.ExtendedDataKeys.DiscountValue].ShouldBe(15m);
        discount.ExtendedData[Constants.ExtendedDataKeys.Reason].ShouldBe("VIP Customer");
    }

    #endregion

    #region RemoveDiscountLineItem Tests

    [Fact]
    public void RemoveDiscountLineItem_WithValidId_RemovesDiscount()
    {
        // Arrange
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        };
        _lineItemService.AddDiscountLineItem(lineItems, 10m, DiscountValueType.FixedAmount, _currencyCode);
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
        var lineItems = new List<LineItem>
        {
            CreateProductLineItem("SKU1", 100m, 1, taxRate: 20)
        };
        _lineItemService.AddDiscountLineItem(lineItems, 10m, DiscountValueType.FixedAmount, _currencyCode);

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
        return new LineItem
        {
            Id = Guid.NewGuid(),
            Sku = sku,
            Name = $"Product {sku}",
            Amount = amount,
            Quantity = quantity,
            LineItemType = LineItemType.Product,
            IsTaxable = isTaxable,
            TaxRate = taxRate,
            DateCreated = DateTime.UtcNow,
            DateUpdated = DateTime.UtcNow,
            ExtendedData = new Dictionary<string, object>()
        };
    }

    #endregion
}
