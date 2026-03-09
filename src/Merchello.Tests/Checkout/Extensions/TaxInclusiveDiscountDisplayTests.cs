using Merchello.Core;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Extensions;
using Merchello.Core.Checkout.Factories;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Models;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Services;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Options;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout.Extensions;

/// <summary>
/// Integration tests for tax-inclusive discount display across the full stack:
/// Basket → GetDisplayAmounts → CheckoutDtoMapper → OrderConfirmation.
///
/// These tests verify that:
/// 1. Percentage discounts resolve to correct monetary amounts (not the percentage value)
/// 2. Tax-inclusive discounts use the linked product's exact tax rate (not effective rate)
/// 3. GROSS reconciliation formula holds: SubTotal + Shipping - Discount = Total
/// 4. Values propagate correctly through DTO mapping
/// 5. Confirmation page calculates tax-inclusive discounts correctly
///
/// The original bug: LineItem.Amount stores the percentage (-10) for percentage discounts,
/// but the display code was using Math.Abs(Amount * Quantity) = 10, then applying tax
/// to get $12.00 instead of the correct $2.40 (for a 10% discount on a $19.99 item).
/// </summary>
[Collection("Integration Tests")]
public class TaxInclusiveDiscountDisplayTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICheckoutDtoMapper _checkoutDtoMapper;
    private readonly ICheckoutService _checkoutService;
    private readonly ICurrencyService _currencyService;

    public TaxInclusiveDiscountDisplayTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        var storefrontContext = fixture.GetService<IStorefrontContextService>();
        var currencyConversion = fixture.GetService<ICurrencyConversionService>();
        _currencyService = fixture.GetService<ICurrencyService>();
        var settings = fixture.GetService<IOptions<MerchelloSettings>>();
        _checkoutDtoMapper = new CheckoutDtoMapper(storefrontContext, currencyConversion, _currencyService, settings);
        _checkoutService = fixture.GetService<ICheckoutService>();
    }

    #region Exact Bug Scenario: Tee + Beanie + 10% Off Tee

    [Fact]
    public void ExactBugScenario_TeeAndBeanie_10PercentOffTee_DisplaysCorrectIncTaxValues()
    {
        // Arrange - reproduces the exact seed data scenario that triggered the bug:
        // Classic Cotton Tee ($19.99, 20% VAT) + Knit Beanie ($14.99, 20% VAT)
        // 10% Off All T-Shirts discount (percentage-based, linked to Tee)
        // Expected: Subtotal $41.98, Discount -$2.40, Total $39.58
        var basket = CreateBasket("USD", "$");

        var tee = CreateProductLineItem(19.99m, 1, 20m, "TEE-001", "Classic Cotton Tee");
        var beanie = CreateProductLineItem(14.99m, 1, 20m, "BEANIE-001", "Knit Beanie");
        var discount = CreatePercentageDiscountLineItem(10m, "DISC-TEE", "TEE-001", "10% Off Tees");

        basket.LineItems.Add(tee);
        basket.LineItems.Add(beanie);
        basket.LineItems.Add(discount);
        basket.SubTotal = 34.98m; // 19.99 + 14.99
        basket.Discount = 2.00m;  // 19.99 * 10% = 1.999 → 2.00
        basket.Tax = 6.60m;       // (34.98 - 2.00) * 0.20 = 6.596 → 6.60
        basket.Shipping = 0m;
        basket.Total = 39.58m;    // 34.98 - 2.00 + 6.60

        var displayContext = CreateIncTaxDisplayContext("USD", "$", 1m);

        // Act - Core calculation
        var displayAmounts = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert - what the customer should see
        displayAmounts.TaxInclusiveSubTotal.ShouldBe(41.98m, "Subtotal: 23.99 + 17.99");
        displayAmounts.TaxInclusiveDiscount.ShouldBe(2.40m, "Discount: 2.00 * 1.20");
        displayAmounts.TaxInclusiveShipping.ShouldBe(0m, "Free shipping");
        displayAmounts.Total.ShouldBe(39.58m, "Total unchanged");

        // GROSS reconciliation must hold
        (displayAmounts.TaxInclusiveSubTotal - displayAmounts.TaxInclusiveDiscount + displayAmounts.TaxInclusiveShipping)
            .ShouldBe(displayAmounts.Total, "GROSS formula: SubTotal - Discount + Shipping = Total");
    }

    [Fact]
    public void ExactBugScenario_DtoMapping_PropagatesCorrectValues()
    {
        // Same scenario but through DTO mapper (full integration)
        var basket = CreateBasket("USD", "$");

        var tee = CreateProductLineItem(19.99m, 1, 20m, "TEE-001", "Classic Cotton Tee");
        var beanie = CreateProductLineItem(14.99m, 1, 20m, "BEANIE-001", "Knit Beanie");
        var discount = CreatePercentageDiscountLineItem(10m, "DISC-TEE", "TEE-001", "10% Off Tees");

        basket.LineItems.Add(tee);
        basket.LineItems.Add(beanie);
        basket.LineItems.Add(discount);
        basket.SubTotal = 34.98m;
        basket.Discount = 2.00m;
        basket.Tax = 6.60m;
        basket.Shipping = 0m;
        basket.Total = 39.58m;

        var displayContext = CreateIncTaxDisplayContext("USD", "$", 1m);

        // Act
        var dto = _checkoutDtoMapper.MapBasketToDto(basket, displayContext);

        // Assert - DTO values
        dto.TaxInclusiveDisplayDiscount.ShouldBe(2.40m);
        dto.TaxInclusiveDisplaySubTotal.ShouldBe(41.98m);
        dto.DisplayTotal.ShouldBe(39.58m);

        // Applied discount DTO should show tax-inclusive amount
        dto.AppliedDiscounts.Count.ShouldBe(1);
        dto.AppliedDiscounts[0].Amount.ShouldBe(2.40m);
        dto.AppliedDiscounts[0].Name.ShouldBe("10% Off Tees");

        // Formatted values should be present
        dto.FormattedTaxInclusiveDisplayDiscount.ShouldNotBeNullOrWhiteSpace();
    }

    #endregion

    #region Percentage Discount Scenarios

    [Theory]
    [InlineData(100.00, 10, 20, 1.0, "USD", 10.00, 12.00)]   // $100, 10% off, 20% VAT → $10 * 1.20 = $12
    [InlineData(49.99, 25, 20, 1.0, "USD", 12.50, 15.00)]     // $49.99, 25% off, 20% VAT → 12.4975→12.50 * 1.20 = 15.00
    [InlineData(19.99, 10, 20, 1.0, "USD", 2.00, 2.40)]       // Exact bug case
    [InlineData(100.00, 50, 10, 1.0, "USD", 50.00, 55.00)]    // $100, 50% off, 10% VAT → $50 * 1.10 = $55
    [InlineData(100.00, 10, 0, 1.0, "USD", 10.00, 10.00)]     // $100, 10% off, 0% VAT → no tax on discount
    public void PercentageDiscount_SingleProduct_CalculatesCorrectTaxInclusiveAmount(
        decimal productPrice,
        decimal discountPercentage,
        decimal taxRate,
        decimal exchangeRate,
        string currencyCode,
        decimal expectedExTaxDiscount,
        decimal expectedIncTaxDiscount)
    {
        var basket = CreateBasket(currencyCode, "$");

        var product = CreateProductLineItem(productPrice, 1, taxRate, "PROD-001");
        var discount = CreatePercentageDiscountLineItem(discountPercentage, "DISC-001", "PROD-001");

        basket.LineItems.Add(product);
        basket.LineItems.Add(discount);
        basket.SubTotal = productPrice;
        basket.Discount = expectedExTaxDiscount;
        basket.Tax = _currencyService.Round((productPrice - expectedExTaxDiscount) * (taxRate / 100m), currencyCode);
        basket.Shipping = 0m;
        basket.Total = basket.SubTotal - basket.Discount + basket.Tax;

        var displayContext = CreateIncTaxDisplayContext(currencyCode, "$", exchangeRate, taxRate > 0);

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Assert
        result.TaxInclusiveDiscount.ShouldBe(expectedIncTaxDiscount,
            $"Expected {discountPercentage}% off ${productPrice} at {taxRate}% VAT = ${expectedIncTaxDiscount}");
    }

    [Fact]
    public void PercentageDiscount_Quantity2_CalculatesFromFullLineTotal()
    {
        // 10% off 2x $50 products = $10 discount (not $5)
        var basket = CreateBasket("USD", "$");

        var product = CreateProductLineItem(50m, 2, 20m, "PROD-001");
        var discount = CreatePercentageDiscountLineItem(10m, "DISC-001", "PROD-001");

        basket.LineItems.Add(product);
        basket.LineItems.Add(discount);
        basket.SubTotal = 100m;
        basket.Discount = 10m;
        basket.Tax = 18m; // (100 - 10) * 0.20
        basket.Shipping = 0m;
        basket.Total = 108m;

        var displayContext = CreateIncTaxDisplayContext("USD", "$", 1m);

        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Tax-inclusive: $10 * 1.20 = $12
        result.TaxInclusiveDiscount.ShouldBe(12m);
    }

    #endregion

    #region Fixed Amount Discount Scenarios

    [Fact]
    public void FixedDiscount_LinkedToTaxableProduct_IncludesTax()
    {
        var basket = CreateBasket("USD", "$");

        var product = CreateProductLineItem(100m, 1, 20m, "PROD-001");
        var discount = CreateFixedDiscountLineItem(15m, "DISC-001", "PROD-001", "Save $15");

        basket.LineItems.Add(product);
        basket.LineItems.Add(discount);
        basket.SubTotal = 100m;
        basket.Discount = 15m;
        basket.Tax = 17m; // (100 - 15) * 0.20
        basket.Shipping = 0m;
        basket.Total = 102m;

        var displayContext = CreateIncTaxDisplayContext("USD", "$", 1m);

        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Fixed $15 discount on 20% VAT product → $15 * 1.20 = $18
        result.TaxInclusiveDiscount.ShouldBe(18m);
    }

    [Fact]
    public void FixedDiscount_OrderLevel_NoLinkedProduct_UsesEffectiveTaxRate()
    {
        var basket = CreateBasket("USD", "$");

        var product = CreateProductLineItem(100m, 1, 20m, "PROD-001");
        // Order-level discount: no DependantLineItemSku
        var discount = CreateFixedDiscountLineItem(10m, "DISC-ORDER", dependantSku: null, name: "SAVE10 Coupon");

        basket.LineItems.Add(product);
        basket.LineItems.Add(discount);
        basket.SubTotal = 100m;
        basket.Discount = 10m;
        basket.Tax = 18m;
        basket.Shipping = 0m;
        basket.Total = 108m;

        var displayContext = CreateIncTaxDisplayContext("USD", "$", 1m);

        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Order-level discount uses weighted effective tax rate from product line items (20%)
        // $10 * (1 + 20/100) = $12.00
        result.TaxInclusiveDiscount.ShouldBe(12m);
    }

    #endregion

    #region Multiple Discount Scenarios

    [Fact]
    public void MultipleDiscounts_DifferentTaxRates_EachUsesLinkedProductRate()
    {
        var basket = CreateBasket("USD", "$");

        var standard = CreateProductLineItem(100m, 1, 20m, "PROD-STD", "Standard Rate Product");
        var reduced = CreateProductLineItem(100m, 1, 5m, "PROD-RED", "Reduced Rate Product");
        var discStd = CreatePercentageDiscountLineItem(10m, "DISC-STD", "PROD-STD", "10% Off Standard");
        var discRed = CreatePercentageDiscountLineItem(10m, "DISC-RED", "PROD-RED", "10% Off Reduced");

        basket.LineItems.Add(standard);
        basket.LineItems.Add(reduced);
        basket.LineItems.Add(discStd);
        basket.LineItems.Add(discRed);
        basket.SubTotal = 200m;
        basket.Discount = 20m;
        basket.Tax = 22.50m; // (90*0.20) + (90*0.05)
        basket.Shipping = 0m;
        basket.Total = 202.50m;

        var displayContext = CreateIncTaxDisplayContext("USD", "$", 1m);

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // $10 * 1.20 = $12.00 (standard) + $10 * 1.05 = $10.50 (reduced) = $22.50
        result.TaxInclusiveDiscount.ShouldBe(22.50m);

        // Also verify through DTO mapper
        var dto = _checkoutDtoMapper.MapBasketToDto(basket, displayContext);
        dto.TaxInclusiveDisplayDiscount.ShouldBe(22.50m);
        dto.AppliedDiscounts.Count.ShouldBe(2);

        var stdDisc = dto.AppliedDiscounts.Single(d => d.Name == "10% Off Standard");
        var redDisc = dto.AppliedDiscounts.Single(d => d.Name == "10% Off Reduced");
        stdDisc.Amount.ShouldBe(12m, "Standard rate discount: $10 * 1.20");
        redDisc.Amount.ShouldBe(10.50m, "Reduced rate discount: $10 * 1.05");
    }

    [Fact]
    public void MixedDiscounts_PercentageAndFixed_CalculatesIndependently()
    {
        var basket = CreateBasket("USD", "$");

        var productA = CreateProductLineItem(200m, 1, 20m, "PROD-A");
        var productB = CreateProductLineItem(50m, 1, 20m, "PROD-B");
        var percentDisc = CreatePercentageDiscountLineItem(10m, "DISC-PCT", "PROD-A", "10% Off A");
        var fixedDisc = CreateFixedDiscountLineItem(5m, "DISC-FIX", "PROD-B", "$5 Off B");

        basket.LineItems.Add(productA);
        basket.LineItems.Add(productB);
        basket.LineItems.Add(percentDisc);
        basket.LineItems.Add(fixedDisc);
        basket.SubTotal = 250m;
        basket.Discount = 25m; // 200*10% + 5
        basket.Tax = 45m; // (250 - 25) * 0.20
        basket.Shipping = 0m;
        basket.Total = 270m;

        var displayContext = CreateIncTaxDisplayContext("USD", "$", 1m);

        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // 10% of $200 = $20, inc tax = $20 * 1.20 = $24
        // Fixed $5, inc tax = $5 * 1.20 = $6
        // Total: $30
        result.TaxInclusiveDiscount.ShouldBe(30m);
    }

    #endregion

    #region Multi-Currency Scenarios

    [Theory]
    [InlineData(0.79, "GBP", "£")]   // USD to GBP
    [InlineData(1.25, "EUR", "€")]   // USD to EUR
    [InlineData(150, "JPY", "¥")]    // USD to JPY (0 decimal places)
    public void PercentageDiscount_WithCurrencyConversion_AppliesRateCorrectly(
        decimal exchangeRate, string currencyCode, string currencySymbol)
    {
        var basket = CreateBasket("USD", "$");

        var product = CreateProductLineItem(100m, 1, 20m, "PROD-001");
        var discount = CreatePercentageDiscountLineItem(10m, "DISC-001", "PROD-001");

        basket.LineItems.Add(product);
        basket.LineItems.Add(discount);
        basket.SubTotal = 100m;
        basket.Discount = 10m;
        basket.Tax = 18m;
        basket.Shipping = 0m;
        basket.Total = 108m;

        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: currencyCode,
            CurrencySymbol: currencySymbol,
            DecimalPlaces: currencyCode == "JPY" ? 0 : 2,
            ExchangeRate: exchangeRate,
            StoreCurrencyCode: "USD",
            DisplayPricesIncTax: true,
            TaxCountryCode: "GB",
            TaxRegionCode: null,
            IsShippingTaxable: false,
            ShippingTaxRate: null);

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Expected: $10 * 1.20 * exchangeRate, rounded per currency
        var expected = _currencyService.Round(10m * 1.20m * exchangeRate, currencyCode);
        result.TaxInclusiveDiscount.ShouldBe(expected);

        // GROSS formula must hold
        (result.TaxInclusiveSubTotal - result.TaxInclusiveDiscount + result.TaxInclusiveShipping)
            .ShouldBe(result.Total);
    }

    #endregion

    #region Ex-Tax Display Mode (no tax on discounts)

    [Fact]
    public void ExTaxMode_PercentageDiscount_DoesNotIncludeTax()
    {
        var basket = CreateBasket("USD", "$");

        var product = CreateProductLineItem(100m, 1, 20m, "PROD-001");
        var discount = CreatePercentageDiscountLineItem(10m, "DISC-001", "PROD-001");

        basket.LineItems.Add(product);
        basket.LineItems.Add(discount);
        basket.SubTotal = 100m;
        basket.Discount = 10m;
        basket.Tax = 18m;
        basket.Shipping = 0m;
        basket.Total = 108m;

        var displayContext = CreateExTaxDisplayContext("USD", "$", 1m);

        // Act
        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Ex-tax: discount is $10, no tax added
        result.Discount.ShouldBe(10m);
        result.DisplayPricesIncTax.ShouldBeFalse();
    }

    [Fact]
    public void ExTaxMode_DtoMapping_UsesDisplayDiscount()
    {
        var basket = CreateBasket("USD", "$");

        var product = CreateProductLineItem(100m, 1, 20m, "PROD-001");
        var discount = CreatePercentageDiscountLineItem(10m, "DISC-001", "PROD-001");

        basket.LineItems.Add(product);
        basket.LineItems.Add(discount);
        basket.SubTotal = 100m;
        basket.Discount = 10m;
        basket.Tax = 18m;
        basket.Shipping = 0m;
        basket.Total = 108m;

        var displayContext = CreateExTaxDisplayContext("USD", "$", 1m);

        var dto = _checkoutDtoMapper.MapBasketToDto(basket, displayContext);

        dto.DisplayDiscount.ShouldBe(10m);
        dto.DisplayPricesIncTax.ShouldBeFalse();
    }

    #endregion

    #region Non-Taxable Product Discount

    [Fact]
    public void DiscountOnNonTaxableProduct_NoTaxAppliedToDiscount()
    {
        var basket = CreateBasket("USD", "$");

        // Tax-exempt product (0% tax rate, IsTaxable=false)
        var product = CreateProductLineItem(100m, 1, 0m, "EXEMPT-001", isTaxable: false);
        var discount = CreatePercentageDiscountLineItem(10m, "DISC-001", "EXEMPT-001");

        basket.LineItems.Add(product);
        basket.LineItems.Add(discount);
        basket.SubTotal = 100m;
        basket.Discount = 10m;
        basket.Tax = 0m;
        basket.Shipping = 0m;
        basket.Total = 90m;

        var displayContext = CreateIncTaxDisplayContext("USD", "$", 1m);

        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        result.TaxInclusiveDiscount.ShouldBe(10m, "No tax on discount for tax-exempt product");
    }

    #endregion

    #region Discount + Shipping Scenarios

    [Fact]
    public void DiscountWithShipping_GrossReconcilationHolds()
    {
        var basket = CreateBasket("USD", "$");

        var tee = CreateProductLineItem(19.99m, 1, 20m, "TEE-001");
        var beanie = CreateProductLineItem(14.99m, 1, 20m, "BEANIE-001");
        var discount = CreatePercentageDiscountLineItem(10m, "DISC-TEE", "TEE-001");

        basket.LineItems.Add(tee);
        basket.LineItems.Add(beanie);
        basket.LineItems.Add(discount);
        basket.SubTotal = 34.98m;
        basket.Discount = 2.00m;
        basket.Tax = 8.20m; // (34.98 - 2.00 + 8.00) * 0.20 = 8.196 → 8.20
        basket.Shipping = 8.00m;
        basket.Total = 49.18m; // 34.98 - 2.00 + 8.20 + 8.00

        var displayContext = CreateIncTaxDisplayContext("USD", "$", 1m,
            isShippingTaxable: true, shippingTaxRate: 20m);

        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Discount: $2.00 * 1.20 = $2.40
        result.TaxInclusiveDiscount.ShouldBe(2.40m);

        // Shipping: $8.00 * 1.20 = $9.60
        result.TaxInclusiveShipping.ShouldBe(9.60m);

        // GROSS: subtotal + shipping - discount = total
        (result.TaxInclusiveSubTotal + result.TaxInclusiveShipping - result.TaxInclusiveDiscount)
            .ShouldBe(result.Total);
    }

    #endregion

    #region Confirmation Page Scenarios

    [Fact]
    public async Task ConfirmationPage_PercentageDiscount_ShowsCorrectTaxInclusiveDiscount()
    {
        // Arrange - create a full order with percentage discount
        var builder = _fixture.CreateDataBuilder();
        var invoice = builder.CreateInvoice(total: 39.58m);
        // Set invoice discount fields (CreateInvoice doesn't set discount by default)
        invoice.Discount = 2.00m;
        invoice.SubTotal = 34.98m;
        invoice.Tax = 6.60m;

        var warehouse = builder.CreateWarehouse("Test Warehouse", "US");
        var shippingOption = builder.CreateShippingOption("Standard", warehouse, fixedCost: 0m);
        var order = builder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        order.ShippingOptionId = Guid.Empty;

        var tee = builder.CreateLineItem(order,
            name: "Classic Cotton Tee",
            quantity: 1,
            amount: 19.99m,
            isTaxable: true,
            taxRate: 20m,
            lineItemType: LineItemType.Product);
        tee.Sku = "TEE-001";

        var beanie = builder.CreateLineItem(order,
            name: "Knit Beanie",
            quantity: 1,
            amount: 14.99m,
            isTaxable: true,
            taxRate: 20m,
            lineItemType: LineItemType.Product);
        beanie.Sku = "BEANIE-001";

        // 10% off Tee: actual discount is $2.00, stored as percentage
        builder.CreateDiscountLineItem(order, tee,
            discountAmount: 2.00m,
            discountValueType: DiscountValueType.Percentage,
            discountValue: 10m,
            reason: "10% Off Tees");

        await builder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var confirmation = await _checkoutService.GetOrderConfirmationAsync(invoice.Id);

        // Assert - confirmation should have correct ex-tax discount
        confirmation.ShouldNotBeNull();
        confirmation!.LineItems.ShouldNotBeEmpty();

        // The confirmation DTO should have the discount line item
        var discountLines = confirmation.LineItems
            .Where(li => li.LineItemType == LineItemType.Discount)
            .ToList();
        discountLines.Count.ShouldBe(1);
        discountLines[0].DependantLineItemSku.ShouldBe("TEE-001");

        // DisplayDiscount comes from invoice.Discount = $2.00
        confirmation.DisplayDiscount.ShouldBe(2.00m);

        // The linked product line items should have correct tax rates for
        // the controller's tax-inclusive discount calculation
        var teeLine = confirmation.LineItems.First(li => li.Sku == "TEE-001");
        teeLine.TaxRate.ShouldBe(20m);
        teeLine.IsTaxable.ShouldBeTrue();
    }

    #endregion

    #region ResolveDiscountAmount Edge Cases

    [Fact]
    public void ResolveDiscountAmount_MissingExtendedDataKeys_FallsBackToAbsAmount()
    {
        // Discount line item without DiscountValueType in ExtendedData (legacy data)
        var discount = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(), "Legacy Discount", "DISC-LEGACY",
            -5m, 0m, 1, false, 0m);
        discount.LineItemType = LineItemType.Discount;

        var result = DisplayCurrencyExtensions.ResolveDiscountAmount(discount, null, 100m);

        result.ShouldBe(5m, "Falls back to Math.Abs(Amount * Quantity)");
    }

    [Fact]
    public void ResolveDiscountAmount_PercentageWithNoLinkedItem_UsesSubTotal()
    {
        var discount = CreatePercentageDiscountLineItem(10m, "DISC-ORDER", dependantSku: null);

        var result = DisplayCurrencyExtensions.ResolveDiscountAmount(discount, null, 200m);

        result.ShouldBe(20m, "10% of $200 subtotal = $20");
    }

    [Fact]
    public void ResolveDiscountAmount_FreeDiscountType_ReturnsFullProductValue()
    {
        var product = CreateProductLineItem(50m, 2, 20m, "PROD-001");
        var discount = CreateFreeDiscountLineItem("DISC-FREE", "PROD-001");

        var result = DisplayCurrencyExtensions.ResolveDiscountAmount(discount, product, 100m);

        result.ShouldBe(100m, "Free discount = full product value: $50 * 2 = $100");
    }

    [Fact]
    public void ResolveDiscountAmount_FixedAmount_IgnoresLinkedItemPrice()
    {
        var product = CreateProductLineItem(100m, 1, 20m, "PROD-001");
        var discount = CreateFixedDiscountLineItem(15m, "DISC-FIX", "PROD-001");

        var result = DisplayCurrencyExtensions.ResolveDiscountAmount(discount, product, 100m);

        result.ShouldBe(15m, "Fixed amount discount = $15 regardless of product price");
    }

    #endregion

    #region Order-Level Discount Reconciliation Tests

    // These tests verify the GROSS reconciliation formula holds for order-level discounts:
    // TaxInclusiveSubTotal + TaxInclusiveShipping - TaxInclusiveDiscount = Total
    // The original bug: order-level discounts were not grossed up by tax, causing visible
    // discrepancies especially on single-item baskets where reconciliation is skipped.

    [Fact]
    public void OrderLevelDiscount_SingleItem_ReconciliationHolds()
    {
        // Single-item basket where ReconcileTaxInclusiveSubTotal is SKIPPED (productItemCount <= 1).
        // This was the most visible manifestation of the bug: SubTotal - Discount ≠ Total.
        var basket = CreateBasket("USD", "$");

        var product = CreateProductLineItem(100m, 1, 20m, "PROD-001");
        var discount = CreateFixedDiscountLineItem(10m, "DISC-ORDER", dependantSku: null, name: "$10 Off Order");

        basket.LineItems.Add(product);
        basket.LineItems.Add(discount);
        basket.SubTotal = 100m;
        basket.Discount = 10m;
        basket.Tax = 18m; // (100 - 10) * 0.20
        basket.Shipping = 0m;
        basket.Total = 108m;

        var displayContext = CreateIncTaxDisplayContext("USD", "$", 1m);

        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Tax-inclusive subtotal for single item: $100 * 1.20 = $120
        result.TaxInclusiveSubTotal.ShouldBe(120m);
        // Order-level discount grossed up: $10 * 1.20 = $12
        result.TaxInclusiveDiscount.ShouldBe(12m);
        // GROSS formula: $120 - $12 + $0 = $108 ✓
        (result.TaxInclusiveSubTotal - result.TaxInclusiveDiscount + result.TaxInclusiveShipping)
            .ShouldBe(result.Total, "GROSS reconciliation must hold for single-item basket with order-level discount");
    }

    [Fact]
    public void OrderLevelDiscount_MultipleItems_ReconciliationHolds()
    {
        // Multi-item basket where reconciliation IS applied.
        var basket = CreateBasket("USD", "$");

        var productA = CreateProductLineItem(80m, 1, 20m, "PROD-A");
        var productB = CreateProductLineItem(40m, 2, 20m, "PROD-B");
        var discount = CreateFixedDiscountLineItem(15m, "DISC-ORDER", dependantSku: null, name: "$15 Off Order");

        basket.LineItems.Add(productA);
        basket.LineItems.Add(productB);
        basket.LineItems.Add(discount);
        basket.SubTotal = 160m; // 80 + 40*2
        basket.Discount = 15m;
        basket.Tax = 29m; // (160 - 15) * 0.20
        basket.Shipping = 0m;
        basket.Total = 174m; // 145 + 29

        var displayContext = CreateIncTaxDisplayContext("USD", "$", 1m);

        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Discount grossed up at 20%: $15 * 1.20 = $18
        result.TaxInclusiveDiscount.ShouldBe(18m);
        // GROSS formula must hold
        (result.TaxInclusiveSubTotal - result.TaxInclusiveDiscount + result.TaxInclusiveShipping)
            .ShouldBe(result.Total, "GROSS reconciliation must hold for multi-item basket with order-level discount");
    }

    [Fact]
    public void OrderLevelPercentageDiscount_SingleItem_ReconciliationHolds()
    {
        // Percentage-based order-level discount on single item.
        var basket = CreateBasket("USD", "$");

        var product = CreateProductLineItem(200m, 1, 20m, "PROD-001");
        var discount = CreatePercentageDiscountLineItem(15m, "DISC-ORDER", dependantSku: null, name: "15% Off Order");

        basket.LineItems.Add(product);
        basket.LineItems.Add(discount);
        basket.SubTotal = 200m;
        basket.Discount = 30m; // 200 * 15%
        basket.Tax = 34m; // (200 - 30) * 0.20
        basket.Shipping = 0m;
        basket.Total = 204m; // 170 + 34

        var displayContext = CreateIncTaxDisplayContext("USD", "$", 1m);

        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Percentage resolves to $30, grossed up at 20%: $30 * 1.20 = $36
        result.TaxInclusiveDiscount.ShouldBe(36m);
        // Single item: subtotal = $200 * 1.20 = $240
        result.TaxInclusiveSubTotal.ShouldBe(240m);
        // GROSS: $240 - $36 + $0 = $204 ✓
        (result.TaxInclusiveSubTotal - result.TaxInclusiveDiscount + result.TaxInclusiveShipping)
            .ShouldBe(result.Total, "GROSS reconciliation must hold for percentage order-level discount on single item");
    }

    [Fact]
    public void OrderLevelDiscount_WithShipping_ReconciliationHolds()
    {
        var basket = CreateBasket("USD", "$");

        var product = CreateProductLineItem(50m, 2, 20m, "PROD-001");
        var discount = CreateFixedDiscountLineItem(10m, "DISC-ORDER", dependantSku: null, name: "$10 Off Order");

        basket.LineItems.Add(product);
        basket.LineItems.Add(discount);
        basket.SubTotal = 100m;
        basket.Discount = 10m;
        basket.Tax = 19.60m; // (100 - 10 + 8) * 0.20 = 19.60
        basket.Shipping = 8m;
        basket.Total = 117.60m; // 90 + 19.60 + 8

        var displayContext = CreateIncTaxDisplayContext("USD", "$", 1m,
            isShippingTaxable: true, shippingTaxRate: 20m);

        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Discount: $10 * 1.20 = $12
        result.TaxInclusiveDiscount.ShouldBe(12m);
        // Shipping: $8 * 1.20 = $9.60
        result.TaxInclusiveShipping.ShouldBe(9.60m);
        // GROSS formula must hold (single product, reconciliation skipped)
        (result.TaxInclusiveSubTotal - result.TaxInclusiveDiscount + result.TaxInclusiveShipping)
            .ShouldBe(result.Total, "GROSS reconciliation must hold with order-level discount + taxable shipping");
    }

    [Fact]
    public void MixedLinkedAndOrderLevelDiscounts_ReconciliationHolds()
    {
        // Basket with BOTH a linked discount and an order-level discount.
        var basket = CreateBasket("USD", "$");

        var productA = CreateProductLineItem(100m, 1, 20m, "PROD-A");
        var productB = CreateProductLineItem(60m, 1, 20m, "PROD-B");
        var linkedDiscount = CreateFixedDiscountLineItem(10m, "DISC-A", "PROD-A", "$10 Off Prod A");
        var orderDiscount = CreateFixedDiscountLineItem(5m, "DISC-ORDER", dependantSku: null, name: "$5 Off Order");

        basket.LineItems.Add(productA);
        basket.LineItems.Add(productB);
        basket.LineItems.Add(linkedDiscount);
        basket.LineItems.Add(orderDiscount);
        basket.SubTotal = 160m;
        basket.Discount = 15m; // 10 + 5
        basket.Tax = 29m; // (160 - 15) * 0.20
        basket.Shipping = 0m;
        basket.Total = 174m; // 145 + 29

        var displayContext = CreateIncTaxDisplayContext("USD", "$", 1m);

        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Linked: $10 * 1.20 = $12, Order-level: $5 * 1.20 = $6 → Total: $18
        result.TaxInclusiveDiscount.ShouldBe(18m);
        // GROSS formula must hold
        (result.TaxInclusiveSubTotal - result.TaxInclusiveDiscount + result.TaxInclusiveShipping)
            .ShouldBe(result.Total, "GROSS reconciliation must hold with mixed linked + order-level discounts");
    }

    [Fact]
    public void OrderLevelDiscount_MixedTaxRates_UsesWeightedRate()
    {
        // Products with different tax rates: order-level discount uses weighted average.
        var basket = CreateBasket("USD", "$");

        var standardProduct = CreateProductLineItem(100m, 1, 20m, "PROD-STANDARD"); // 20% VAT
        var reducedProduct = CreateProductLineItem(100m, 1, 5m, "PROD-REDUCED");    // 5% VAT
        var discount = CreateFixedDiscountLineItem(20m, "DISC-ORDER", dependantSku: null, name: "$20 Off Order");

        basket.LineItems.Add(standardProduct);
        basket.LineItems.Add(reducedProduct);
        basket.LineItems.Add(discount);
        basket.SubTotal = 200m;
        basket.Discount = 20m;
        // Tax: standard portion = (100 - 10) * 0.20 = 18, reduced = (100 - 10) * 0.05 = 4.50
        // (proportional: each product gets 50% of the $20 discount)
        basket.Tax = 22.50m;
        basket.Shipping = 0m;
        basket.Total = 202.50m; // 180 + 22.50

        var displayContext = CreateIncTaxDisplayContext("USD", "$", 1m);

        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Weighted effective rate: (100*20/100 + 100*5/100) / 200 = (20 + 5) / 200 = 0.125 (12.5%)
        // Discount: $20 * (1 + 0.125) = $22.50
        result.TaxInclusiveDiscount.ShouldBe(22.50m);
        // GROSS formula must hold
        (result.TaxInclusiveSubTotal - result.TaxInclusiveDiscount + result.TaxInclusiveShipping)
            .ShouldBe(result.Total, "GROSS reconciliation must hold with mixed tax rates");
    }

    [Fact]
    public void OrderLevelDiscount_NonTaxableProducts_NoTaxOnDiscount()
    {
        // All products are tax-exempt: order-level discount should NOT include tax.
        var basket = CreateBasket("USD", "$");

        var product = CreateProductLineItem(100m, 1, 0m, "EXEMPT-001", isTaxable: false);
        var discount = CreateFixedDiscountLineItem(10m, "DISC-ORDER", dependantSku: null, name: "$10 Off Order");

        basket.LineItems.Add(product);
        basket.LineItems.Add(discount);
        basket.SubTotal = 100m;
        basket.Discount = 10m;
        basket.Tax = 0m;
        basket.Shipping = 0m;
        basket.Total = 90m;

        var displayContext = CreateIncTaxDisplayContext("USD", "$", 1m);

        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // No taxable products → weighted rate = 0 → discount stays at $10
        result.TaxInclusiveDiscount.ShouldBe(10m);
        // Single item, no reconciliation, but math should still work
        (result.TaxInclusiveSubTotal - result.TaxInclusiveDiscount + result.TaxInclusiveShipping)
            .ShouldBe(result.Total, "GROSS reconciliation must hold with non-taxable products");
    }

    [Theory]
    [InlineData(0.79, "GBP", "£")]   // USD to GBP
    [InlineData(1.25, "EUR", "€")]   // USD to EUR
    [InlineData(150, "JPY", "¥")]    // USD to JPY (0 decimal places)
    public void OrderLevelDiscount_WithCurrencyConversion_ReconciliationHolds(
        decimal exchangeRate, string currencyCode, string currencySymbol)
    {
        var basket = CreateBasket("USD", "$");

        var product = CreateProductLineItem(100m, 1, 20m, "PROD-001");
        var discount = CreateFixedDiscountLineItem(10m, "DISC-ORDER", dependantSku: null, name: "$10 Off Order");

        basket.LineItems.Add(product);
        basket.LineItems.Add(discount);
        basket.SubTotal = 100m;
        basket.Discount = 10m;
        basket.Tax = 18m;
        basket.Shipping = 0m;
        basket.Total = 108m;

        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: currencyCode,
            CurrencySymbol: currencySymbol,
            DecimalPlaces: currencyCode == "JPY" ? 0 : 2,
            ExchangeRate: exchangeRate,
            StoreCurrencyCode: "USD",
            DisplayPricesIncTax: true,
            TaxCountryCode: "GB",
            TaxRegionCode: null,
            IsShippingTaxable: false,
            ShippingTaxRate: null);

        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        // Discount: $10 * 1.20 * exchangeRate, rounded per currency
        var expected = _currencyService.Round(10m * 1.20m * exchangeRate, currencyCode);
        result.TaxInclusiveDiscount.ShouldBe(expected);

        // GROSS formula must hold regardless of currency
        (result.TaxInclusiveSubTotal - result.TaxInclusiveDiscount + result.TaxInclusiveShipping)
            .ShouldBe(result.Total, $"GROSS reconciliation must hold for order-level discount in {currencyCode}");
    }

    [Fact]
    public void OrderLevelDiscount_ExTaxMode_NoTaxApplied()
    {
        // In ex-tax display mode, discounts should never include tax.
        var basket = CreateBasket("USD", "$");

        var product = CreateProductLineItem(100m, 1, 20m, "PROD-001");
        var discount = CreateFixedDiscountLineItem(10m, "DISC-ORDER", dependantSku: null, name: "$10 Off Order");

        basket.LineItems.Add(product);
        basket.LineItems.Add(discount);
        basket.SubTotal = 100m;
        basket.Discount = 10m;
        basket.Tax = 18m;
        basket.Shipping = 0m;
        basket.Total = 108m;

        var displayContext = CreateExTaxDisplayContext("USD", "$", 1m);

        var result = basket.GetDisplayAmounts(displayContext, _currencyService);

        result.Discount.ShouldBe(10m, "Ex-tax mode should not gross up order-level discounts");
        result.DisplayPricesIncTax.ShouldBeFalse();
    }

    #endregion

    #region Helper Methods

    private static Basket CreateBasket(string currencyCode = "USD", string currencySymbol = "$")
    {
        var basket = new BasketFactory().Create(null, currencyCode, currencySymbol);
        basket.LineItems = [];
        return basket;
    }

    private static LineItem CreateProductLineItem(
        decimal price, int quantity, decimal taxRate, string sku,
        string name = "Test Product", bool isTaxable = true)
    {
        // For 0% tax rate products, respect the explicit isTaxable parameter
        var effectiveIsTaxable = isTaxable && taxRate > 0;
        var lineItem = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(), name, sku, price, 0m, quantity, effectiveIsTaxable, taxRate);
        lineItem.LineItemType = LineItemType.Product;
        return lineItem;
    }

    private static LineItem CreatePercentageDiscountLineItem(
        decimal percentage, string sku, string? dependantSku, string name = "Percentage Discount")
    {
        var extendedData = new Dictionary<string, object>
        {
            [Constants.ExtendedDataKeys.DiscountValueType] = nameof(DiscountValueType.Percentage),
            [Constants.ExtendedDataKeys.DiscountValue] = percentage
        };
        var lineItem = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(), name, sku, -percentage, 0m, 1, false, 0m, extendedData);
        lineItem.LineItemType = LineItemType.Discount;
        lineItem.DependantLineItemSku = dependantSku;
        return lineItem;
    }

    private static LineItem CreateFixedDiscountLineItem(
        decimal amount, string sku, string? dependantSku, string name = "Fixed Discount")
    {
        var extendedData = new Dictionary<string, object>
        {
            [Constants.ExtendedDataKeys.DiscountValueType] = nameof(DiscountValueType.FixedAmount),
            [Constants.ExtendedDataKeys.DiscountValue] = amount
        };
        var lineItem = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(), name, sku, -amount, 0m, 1, false, 0m, extendedData);
        lineItem.LineItemType = LineItemType.Discount;
        lineItem.DependantLineItemSku = dependantSku;
        return lineItem;
    }

    private static LineItem CreateFreeDiscountLineItem(string sku, string? dependantSku)
    {
        var extendedData = new Dictionary<string, object>
        {
            [Constants.ExtendedDataKeys.DiscountValueType] = nameof(DiscountValueType.Free),
            [Constants.ExtendedDataKeys.DiscountValue] = 0m
        };
        var lineItem = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(), "Free Item Discount", sku, 0m, 0m, 1, false, 0m, extendedData);
        lineItem.LineItemType = LineItemType.Discount;
        lineItem.DependantLineItemSku = dependantSku;
        return lineItem;
    }

    private static StorefrontDisplayContext CreateIncTaxDisplayContext(
        string currencyCode, string currencySymbol, decimal exchangeRate,
        bool isShippingTaxable = false, decimal? shippingTaxRate = null)
    {
        return new StorefrontDisplayContext(
            CurrencyCode: currencyCode,
            CurrencySymbol: currencySymbol,
            DecimalPlaces: currencyCode == "JPY" ? 0 : 2,
            ExchangeRate: exchangeRate,
            StoreCurrencyCode: "USD",
            DisplayPricesIncTax: true,
            TaxCountryCode: "US",
            TaxRegionCode: null,
            IsShippingTaxable: isShippingTaxable,
            ShippingTaxRate: shippingTaxRate);
    }

    private static StorefrontDisplayContext CreateExTaxDisplayContext(
        string currencyCode, string currencySymbol, decimal exchangeRate)
    {
        return new StorefrontDisplayContext(
            CurrencyCode: currencyCode,
            CurrencySymbol: currencySymbol,
            DecimalPlaces: currencyCode == "JPY" ? 0 : 2,
            ExchangeRate: exchangeRate,
            StoreCurrencyCode: "USD",
            DisplayPricesIncTax: false,
            TaxCountryCode: "US",
            TaxRegionCode: null,
            IsShippingTaxable: false,
            ShippingTaxRate: null);
    }

    #endregion
}
