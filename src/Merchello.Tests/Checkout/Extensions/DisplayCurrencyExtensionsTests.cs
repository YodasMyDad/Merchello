using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Extensions;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Models;
using Microsoft.Extensions.Options;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout.Extensions;

/// <summary>
/// Tests for DisplayCurrencyExtensions, particularly the GROSS-level reconciliation
/// that ensures tax-inclusive values sum correctly when currency conversion is active.
/// </summary>
public class DisplayCurrencyExtensionsTests
{
    private readonly ICurrencyService _currencyService;

    public DisplayCurrencyExtensionsTests()
    {
        var settings = Options.Create(new MerchelloSettings
        {
            DefaultRounding = MidpointRounding.AwayFromZero,
            StoreCurrencyCode = "USD"
        });
        _currencyService = new CurrencyService(settings);
    }

    #region GROSS Reconciliation Tests

    [Fact]
    public void GetDisplayAmounts_WithCurrencyAndTaxInclusive_GrossValuesSumToTotal()
    {
        // Arrange - multiple items designed to potentially cause rounding discrepancy
        // GROSS reconciliation only applies when there are 2+ items
        var basket = CreateBasket();
        basket.LineItems.Add(CreateLineItem(11.15m, 1, 20m));
        basket.LineItems.Add(CreateLineItem(11.16m, 1, 20m));
        basket.SubTotal = 22.31m;
        basket.Shipping = 22.31m;
        basket.Tax = 8.92m; // approx (22.31 + 22.31) * 0.20
        basket.Total = 53.54m; // SubTotal + Tax + Shipping = 22.31 + 8.92 + 22.31
        basket.Discount = 0m;

        var displayContext = CreateDisplayContext(
            exchangeRate: 0.80m,
            displayPricesIncTax: true,
            shippingTaxRate: 20m);

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert - CRITICAL: gross values must sum to total when multiple items
        var grossSum = result.TaxInclusiveSubTotal
                     + result.TaxInclusiveShipping
                     - result.TaxInclusiveDiscount;
        grossSum.ShouldBe(result.Total);
    }

    [Fact]
    public void GetDisplayAmounts_WithSingleItem_SubtotalMatchesLineItem()
    {
        // Arrange - single item: subtotal must match line item exactly (no reconciliation)
        var basket = CreateBasket();
        basket.LineItems.Add(CreateLineItem(48.35m, 1, 20m)); // £48.35 NET
        basket.SubTotal = 48.35m;
        basket.Shipping = 11.15m;
        basket.Tax = 11.90m;
        basket.Total = 71.40m;
        basket.Discount = 0m;

        var displayContext = CreateDisplayContext(
            exchangeRate: 1.0m,
            displayPricesIncTax: true,
            shippingTaxRate: 20m);

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert - with single item, TaxInclusiveSubTotal should be the raw line item calculation
        // £48.35 * 1.20 = £58.02 (tax-inclusive)
        var expectedLineItemGross = _currencyService.Round(48.35m * 1.20m, "GBP");
        result.TaxInclusiveSubTotal.ShouldBe(expectedLineItemGross);
    }

    [Fact]
    public void GetDisplayAmounts_WithMultipleTaxRates_ReconcilesToTotal()
    {
        // Arrange - items with different tax rates (0%, 5%, 20%)
        var basket = CreateBasket();
        basket.LineItems.Add(CreateLineItem(50m, 1, 0m));    // No tax
        basket.LineItems.Add(CreateLineItem(30m, 1, 5m));    // 5% tax
        basket.LineItems.Add(CreateLineItem(20m, 1, 20m));   // 20% tax
        basket.SubTotal = 100m;
        basket.Shipping = 10m;
        basket.Tax = 5.50m; // 0 + 1.50 + 4.00
        basket.Total = 115.50m;
        basket.Discount = 0m;

        var displayContext = CreateDisplayContext(
            exchangeRate: 1.25m,
            displayPricesIncTax: true,
            shippingTaxRate: 10m);

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert
        var grossSum = result.TaxInclusiveSubTotal
                     + result.TaxInclusiveShipping
                     - result.TaxInclusiveDiscount;
        grossSum.ShouldBe(result.Total);
    }

    [Fact]
    public void GetDisplayAmounts_WithDiscount_ReconcilesToTotal()
    {
        // Arrange - multiple items for GROSS reconciliation to apply
        var basket = CreateBasket();
        basket.LineItems.Add(CreateLineItem(60m, 1, 20m));
        basket.LineItems.Add(CreateLineItem(40m, 1, 20m));
        basket.SubTotal = 100m;
        basket.Shipping = 10m;
        basket.Discount = 20m;
        basket.Tax = 18m; // (100 - 20 + 10) * 0.20
        basket.Total = 108m; // 100 - 20 + 18 + 10

        var displayContext = CreateDisplayContext(
            exchangeRate: 0.85m,
            displayPricesIncTax: true,
            shippingTaxRate: 20m);

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert - with multiple items, GROSS reconciliation ensures values sum to total
        var grossSum = result.TaxInclusiveSubTotal
                     + result.TaxInclusiveShipping
                     - result.TaxInclusiveDiscount;
        grossSum.ShouldBe(result.Total);
    }

    [Fact]
    public void GetDisplayAmounts_WithZeroTaxShipping_ReconcilesToTotal()
    {
        // Arrange - shipping is not taxable
        var basket = CreateBasket();
        basket.LineItems.Add(CreateLineItem(50m, 2, 20m));
        basket.SubTotal = 100m;
        basket.Shipping = 15m;
        basket.Tax = 20m; // 100 * 0.20
        basket.Total = 135m;
        basket.Discount = 0m;

        var displayContext = CreateDisplayContext(
            exchangeRate: 1.10m,
            displayPricesIncTax: true,
            isShippingTaxable: false);

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert
        var grossSum = result.TaxInclusiveSubTotal
                     + result.TaxInclusiveShipping
                     - result.TaxInclusiveDiscount;
        grossSum.ShouldBe(result.Total);
    }

    [Fact]
    public void GetDisplayAmounts_WithDisplayPricesIncTaxFalse_DoesNotApplyGrossReconciliation()
    {
        // Arrange
        var basket = CreateBasket();
        basket.LineItems.Add(CreateLineItem(100m, 1, 20m));
        basket.SubTotal = 100m;
        basket.Shipping = 10m;
        basket.Tax = 22m;
        basket.Total = 132m;
        basket.Discount = 0m;

        var displayContext = CreateDisplayContext(
            exchangeRate: 0.80m,
            displayPricesIncTax: false);

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert - TaxInclusiveSubTotal should be calculated from NET + Tax (not line items)
        result.TaxInclusiveSubTotal.ShouldBe(result.SubTotal + result.Tax);
        result.DisplayPricesIncTax.ShouldBeFalse();
    }

    [Fact]
    public void GetDisplayAmounts_WithProblematicExchangeRate_ReconcilesToTotal()
    {
        // Arrange - exchange rate that causes many rounding issues
        var basket = CreateBasket();
        basket.LineItems.Add(CreateLineItem(33.33m, 1, 20m));
        basket.LineItems.Add(CreateLineItem(16.67m, 2, 20m));
        basket.SubTotal = 66.67m;
        basket.Shipping = 9.99m;
        basket.Tax = 15.33m;
        basket.Total = 91.99m;
        basket.Discount = 0m;

        var displayContext = CreateDisplayContext(
            exchangeRate: 0.7823m, // Problematic rate
            displayPricesIncTax: true,
            shippingTaxRate: 20m);

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert
        var grossSum = result.TaxInclusiveSubTotal
                     + result.TaxInclusiveShipping
                     - result.TaxInclusiveDiscount;
        grossSum.ShouldBe(result.Total);
    }

    [Fact]
    public void GetDisplayAmounts_WithJPYCurrency_ReconcilesToTotal()
    {
        // Arrange - JPY has 0 decimal places, more rounding issues
        var basket = CreateBasket();
        basket.LineItems.Add(CreateLineItem(100m, 1, 10m));
        basket.SubTotal = 100m;
        basket.Shipping = 10m;
        basket.Tax = 11m;
        basket.Total = 121m;
        basket.Discount = 0m;

        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "JPY",
            CurrencySymbol: "¥",
            DecimalPlaces: 0,
            ExchangeRate: 150m,
            StoreCurrencyCode: "USD",
            DisplayPricesIncTax: true,
            TaxCountryCode: "JP",
            TaxRegionCode: null,
            IsShippingTaxable: true,
            ShippingTaxRate: 10m);

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert
        var grossSum = result.TaxInclusiveSubTotal
                     + result.TaxInclusiveShipping
                     - result.TaxInclusiveDiscount;
        grossSum.ShouldBe(result.Total);
    }

    [Fact]
    public void GetDisplayAmounts_WithMultipleLineItems_SumsCorrectly()
    {
        // Arrange - multiple items that when summed independently might cause issues
        var basket = CreateBasket();
        basket.LineItems.Add(CreateLineItem(10.50m, 3, 20m));  // 31.50 + 6.30 tax
        basket.LineItems.Add(CreateLineItem(25.75m, 1, 20m));  // 25.75 + 5.15 tax
        basket.LineItems.Add(CreateLineItem(8.99m, 2, 20m));   // 17.98 + 3.60 tax
        basket.SubTotal = 75.23m;
        basket.Shipping = 12.50m;
        basket.Tax = 17.55m;
        basket.Total = 105.28m;
        basket.Discount = 0m;

        var displayContext = CreateDisplayContext(
            exchangeRate: 0.92m,
            displayPricesIncTax: true,
            shippingTaxRate: 20m);

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert
        var grossSum = result.TaxInclusiveSubTotal
                     + result.TaxInclusiveShipping
                     - result.TaxInclusiveDiscount;
        grossSum.ShouldBe(result.Total);
    }

    [Fact]
    public void GetDisplayAmounts_WithNullBasket_ReturnsZeros()
    {
        // Arrange
        Basket? basket = null;
        var displayContext = CreateDisplayContext(
            exchangeRate: 1.0m,
            displayPricesIncTax: true);

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert
        result.Total.ShouldBe(0);
        result.SubTotal.ShouldBe(0);
        result.TaxInclusiveSubTotal.ShouldBe(0);
    }

    [Fact]
    public void GetDisplayAmounts_WithEmptyLineItems_ReturnsConvertedTotals()
    {
        // Arrange - empty basket (no line items, just shipping)
        // This is an edge case - subtotal is 0, only shipping applies
        var basket = CreateBasket();
        basket.SubTotal = 0m;
        basket.Shipping = 10m;
        basket.Tax = 0m;
        basket.Total = 10m;
        basket.Discount = 0m;

        var displayContext = CreateDisplayContext(
            exchangeRate: 0.80m,
            displayPricesIncTax: true,
            shippingTaxRate: 20m);

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert - with no line items, TaxInclusiveSubTotal is 0
        // No reconciliation happens (nothing to absorb discrepancy into)
        result.TaxInclusiveSubTotal.ShouldBe(0);
        result.Total.ShouldBe(8m); // 10 * 0.80 = 8
    }

    #endregion

    #region Proportional Shipping Tax Tests (EffectiveShippingTaxRate)

    [Fact]
    public void GetDisplayAmounts_MultiCurrency_ProportionalShipping_ConvertsCorrectly()
    {
        // Arrange - USD store, GBP display, 0.79 rate with proportional shipping tax
        var basket = CreateBasket();
        basket.LineItems.Add(CreateLineItem(100m, 1, 20m)); // £100 @ 20%
        basket.LineItems.Add(CreateLineItem(100m, 1, 10m)); // £100 @ 10%
        basket.SubTotal = 200m;
        basket.Tax = 31.50m; // (100*0.20) + (100*0.10) + (10*0.15) = 20 + 10 + 1.50 = 31.50
        basket.Shipping = 10m;
        basket.Discount = 0m;
        basket.Total = 241.50m;
        basket.EffectiveShippingTaxRate = 15m; // Weighted average: (100*20 + 100*10) / 200 = 15%

        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "GBP",
            CurrencySymbol: "£",
            DecimalPlaces: 2,
            ExchangeRate: 0.79m, // 1 USD = 0.79 GBP
            StoreCurrencyCode: "USD",
            DisplayPricesIncTax: false,
            TaxCountryCode: "GB",
            TaxRegionCode: null,
            IsShippingTaxable: true,
            ShippingTaxRate: null); // Proportional - uses basket's EffectiveShippingTaxRate

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert - All amounts converted at 0.79 rate
        result.SubTotal.ShouldBe(158m); // 200 * 0.79 = 158
        result.Shipping.ShouldBe(7.90m); // 10 * 0.79 = 7.90
        result.Total.ShouldBe(190.79m); // 241.50 * 0.79 = 190.785 → 190.79
    }

    [Fact]
    public void GetDisplayAmounts_DisplayIncTax_ProportionalShipping_ShowsTaxInclusiveShipping()
    {
        // Arrange - Tax-inclusive display with proportional shipping rate from basket
        var basket = CreateBasket();
        basket.LineItems.Add(CreateLineItem(100m, 1, 20m));
        basket.LineItems.Add(CreateLineItem(100m, 1, 10m));
        basket.SubTotal = 200m;
        basket.Tax = 31.50m;
        basket.Shipping = 10m;
        basket.Discount = 0m;
        basket.Total = 241.50m;
        basket.EffectiveShippingTaxRate = 15m; // From proportional calculation

        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "GBP",
            CurrencySymbol: "£",
            DecimalPlaces: 2,
            ExchangeRate: 0.79m,
            StoreCurrencyCode: "USD",
            DisplayPricesIncTax: true, // Tax-inclusive display
            TaxCountryCode: "GB",
            TaxRegionCode: null,
            IsShippingTaxable: true,
            ShippingTaxRate: null); // Will use basket's EffectiveShippingTaxRate (15%)

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert
        // Tax-inclusive shipping: 10 * 1.15 * 0.79 = 9.085 → 9.09
        result.TaxInclusiveShipping.ShouldBe(9.09m);
    }

    [Fact]
    public void GetDisplayAmounts_NoEffectiveRate_FallsBackToNetShipping()
    {
        // Arrange - No effective rate available (edge case)
        var basket = CreateBasket();
        basket.LineItems.Add(CreateLineItem(100m, 1, 20m));
        basket.SubTotal = 100m;
        basket.Tax = 20m;
        basket.Shipping = 10m;
        basket.Discount = 0m;
        basket.Total = 130m;
        basket.EffectiveShippingTaxRate = null; // No rate stored

        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "GBP",
            CurrencySymbol: "£",
            DecimalPlaces: 2,
            ExchangeRate: 0.79m,
            StoreCurrencyCode: "USD",
            DisplayPricesIncTax: true,
            TaxCountryCode: "GB",
            TaxRegionCode: null,
            IsShippingTaxable: true,
            ShippingTaxRate: null); // And no rate in context either

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert - Falls back to net shipping (no tax applied to shipping display)
        result.TaxInclusiveShipping.ShouldBe(7.90m); // 10 * 0.79 (no tax added)
    }

    [Fact]
    public void GetDisplayAmounts_ProportionalShipping_ContextRateOverridesBasketRate()
    {
        // Arrange - Context has explicit rate that should override basket's effective rate
        var basket = CreateBasket();
        basket.LineItems.Add(CreateLineItem(100m, 1, 20m));
        basket.SubTotal = 100m;
        basket.Tax = 22m;
        basket.Shipping = 10m;
        basket.Discount = 0m;
        basket.Total = 132m;
        basket.EffectiveShippingTaxRate = 15m; // Basket has 15%

        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "GBP",
            CurrencySymbol: "£",
            DecimalPlaces: 2,
            ExchangeRate: 1m,
            StoreCurrencyCode: "GBP",
            DisplayPricesIncTax: true,
            TaxCountryCode: "GB",
            TaxRegionCode: null,
            IsShippingTaxable: true,
            ShippingTaxRate: 20m); // Context has explicit 20% - should override

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert - Uses context rate (20%), not basket rate (15%)
        // Tax-inclusive shipping: 10 * 1.20 = 12
        result.TaxInclusiveShipping.ShouldBe(12m);
    }

    #endregion

    #region Helper Methods

    private static Basket CreateBasket()
    {
        return new Basket
        {
            Id = Guid.NewGuid(),
            Currency = "USD",
            CurrencySymbol = "$",
            LineItems = []
        };
    }

    private static LineItem CreateLineItem(decimal amount, int quantity, decimal taxRate)
    {
        return new LineItem
        {
            Id = Guid.NewGuid(),
            Sku = $"SKU-{Guid.NewGuid():N}",
            Name = "Test Product",
            Amount = amount,
            Quantity = quantity,
            TaxRate = taxRate,
            IsTaxable = taxRate > 0,
            LineItemType = LineItemType.Product
        };
    }

    private static StorefrontDisplayContext CreateDisplayContext(
        decimal exchangeRate,
        bool displayPricesIncTax,
        decimal? shippingTaxRate = null,
        bool isShippingTaxable = true)
    {
        return new StorefrontDisplayContext(
            CurrencyCode: "GBP",
            CurrencySymbol: "£",
            DecimalPlaces: 2,
            ExchangeRate: exchangeRate,
            StoreCurrencyCode: "USD",
            DisplayPricesIncTax: displayPricesIncTax,
            TaxCountryCode: "GB",
            TaxRegionCode: null,
            IsShippingTaxable: isShippingTaxable,
            ShippingTaxRate: shippingTaxRate);
    }

    #endregion
}
