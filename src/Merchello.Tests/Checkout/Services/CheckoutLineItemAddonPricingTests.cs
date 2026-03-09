using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Factories;
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

namespace Merchello.Tests.Checkout.Services;

[Collection("Integration Tests")]
public class CheckoutLineItemAddonPricingTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICheckoutDtoMapper _checkoutDtoMapper;
    private readonly ICheckoutService _checkoutService;
    private readonly ICurrencyService _currencyService;

    public CheckoutLineItemAddonPricingTests(ServiceTestFixture fixture)
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

    [Fact]
    public void MapBasketToDto_SetsAddonInclusiveDisplayFieldsForParentAndAddon()
    {
        var basket = new BasketFactory().Create(null, "USD", "$");

        var parent = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(),
            "Parent Product",
            "PARENT-001",
            100m,
            0m,
            2,
            true,
            20m);
        parent.LineItemType = LineItemType.Product;

        var addon = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(),
            "Assembly Service",
            "ADDON-001",
            10m,
            0m,
            2,
            true,
            20m);
        addon.LineItemType = LineItemType.Addon;
        addon.DependantLineItemSku = parent.Sku;
        addon.SetParentLineItemId(parent.Id);

        basket.LineItems.Add(parent);
        basket.LineItems.Add(addon);

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
            ShippingTaxRate: 20m);

        var dto = _checkoutDtoMapper.MapBasketToDto(basket, displayContext);

        var parentDto = dto.LineItems.Single(li => li.LineItemType == LineItemType.Product);
        var addonDto = dto.LineItems.Single(li => li.LineItemType == LineItemType.Addon);

        var expectedParentDisplayUnit = _currencyService.Round(100m * 1.20m * 0.79m, "GBP");
        var expectedParentDisplayLine = _currencyService.Round(100m * 2m * 1.20m * 0.79m, "GBP");
        var expectedAddonDisplayUnit = _currencyService.Round(10m * 1.20m * 0.79m, "GBP");
        var expectedAddonDisplayLine = _currencyService.Round(10m * 2m * 1.20m * 0.79m, "GBP");

        parentDto.DisplayUnitPriceWithAddons.ShouldBe(expectedParentDisplayUnit + expectedAddonDisplayUnit);
        parentDto.DisplayLineTotalWithAddons.ShouldBe(expectedParentDisplayLine + expectedAddonDisplayLine);
        parentDto.FormattedDisplayUnitPriceWithAddons.ShouldNotBeNullOrWhiteSpace();
        parentDto.FormattedDisplayLineTotalWithAddons.ShouldNotBeNullOrWhiteSpace();

        addonDto.DisplayUnitPriceWithAddons.ShouldBe(addonDto.DisplayUnitPrice);
        addonDto.DisplayLineTotalWithAddons.ShouldBe(addonDto.DisplayLineTotal);
        addonDto.FormattedDisplayUnitPriceWithAddons.ShouldBe(addonDto.FormattedDisplayUnitPrice);
        addonDto.FormattedDisplayLineTotalWithAddons.ShouldBe(addonDto.FormattedDisplayLineTotal);
    }

    [Fact]
    public async Task GetOrderConfirmationAsync_SetsAddonInclusiveDisplayFieldsForParentAndAddon()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 250m);
        var warehouse = dataBuilder.CreateWarehouse("Checkout Confirmation Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard", warehouse, fixedCost: 0m);
        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        order.ShippingOptionId = Guid.Empty;

        var parent = dataBuilder.CreateLineItem(
            order,
            name: "Parent Product",
            quantity: 2,
            amount: 100m,
            isTaxable: true,
            taxRate: 20m,
            lineItemType: LineItemType.Product);
        parent.Sku = "PARENT-ORDER-001";

        dataBuilder.CreateAddonLineItem(
            order,
            parent,
            name: "Assembly Service",
            quantity: 2,
            amount: 10m,
            isTaxable: true,
            taxRate: 20m);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var confirmation = await _checkoutService.GetOrderConfirmationAsync(invoice.Id);

        confirmation.ShouldNotBeNull();
        confirmation!.LineItems.ShouldNotBeEmpty();

        var parentLine = confirmation.LineItems.Single(li => li.LineItemType == LineItemType.Product);
        var addonLine = confirmation.LineItems.Single(li => li.LineItemType == LineItemType.Addon);

        var expectedParentDisplayUnitWithAddons = 110m;
        var expectedParentDisplayLineWithAddons = 220m;
        var currencyCode = invoice.CurrencyCode ?? "GBP";

        parentLine.DisplayUnitPriceWithAddons.ShouldBe(expectedParentDisplayUnitWithAddons);
        parentLine.DisplayLineTotalWithAddons.ShouldBe(expectedParentDisplayLineWithAddons);
        parentLine.FormattedDisplayUnitPriceWithAddons.ShouldBe(
            _currencyService.FormatAmount(expectedParentDisplayUnitWithAddons, currencyCode));
        parentLine.FormattedDisplayLineTotalWithAddons.ShouldBe(
            _currencyService.FormatAmount(expectedParentDisplayLineWithAddons, currencyCode));

        addonLine.DisplayUnitPriceWithAddons.ShouldBe(addonLine.DisplayUnitPrice);
        addonLine.DisplayLineTotalWithAddons.ShouldBe(addonLine.DisplayLineTotal);
    }

    #region Tax-Inclusive Discount DTO Mapping Tests

    [Fact]
    public void MapBasketToDto_TaxInclusiveDiscount_MapsAccurateValueFromLinkedProduct()
    {
        // Arrange - exact bug scenario: Tee + Beanie + 10% off Tee
        var basket = new BasketFactory().Create(null, "USD", "$");

        var tee = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(), "Classic Cotton Tee", "TEE-001", 19.99m, 0m, 1, true, 20m);
        tee.LineItemType = LineItemType.Product;

        var beanie = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(), "Knit Beanie", "BEANIE-001", 14.99m, 0m, 1, true, 20m);
        beanie.LineItemType = LineItemType.Product;

        var discount = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(), "10% Off Tees", "DISC-TEE", -10m, 0m, 1, false, 0m,
            new Dictionary<string, object>
            {
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountValueType] = "Percentage",
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountValue] = 10m
            });
        discount.LineItemType = LineItemType.Discount;
        discount.DependantLineItemSku = "TEE-001";

        basket.LineItems.Add(tee);
        basket.LineItems.Add(beanie);
        basket.LineItems.Add(discount);
        basket.SubTotal = 34.98m;
        basket.Discount = 2.00m;
        basket.Tax = 6.60m;
        basket.Shipping = 0m;
        basket.Total = 39.58m;

        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "USD",
            CurrencySymbol: "$",
            DecimalPlaces: 2,
            ExchangeRate: 1m,
            StoreCurrencyCode: "USD",
            DisplayPricesIncTax: true,
            TaxCountryCode: "US",
            TaxRegionCode: null,
            IsShippingTaxable: false,
            ShippingTaxRate: 0m);

        // Act
        var dto = _checkoutDtoMapper.MapBasketToDto(basket, displayContext);

        // Assert - tax-inclusive discount uses linked product's 20% rate
        dto.TaxInclusiveDisplayDiscount.ShouldBe(2.40m); // $2.00 * 1.20 = $2.40
        dto.FormattedTaxInclusiveDisplayDiscount.ShouldNotBeNullOrWhiteSpace();

        // Subtotal inc tax: 23.99 + 17.99 = 41.98
        dto.TaxInclusiveDisplaySubTotal.ShouldBe(41.98m);

        // GROSS reconciliation: subtotal - discount + shipping = total
        (dto.TaxInclusiveDisplaySubTotal - dto.TaxInclusiveDisplayDiscount).ShouldBe(dto.DisplayTotal);

        // Applied discount DTO should also include tax
        dto.AppliedDiscounts.Count.ShouldBe(1);
        dto.AppliedDiscounts[0].Amount.ShouldBe(2.40m);
    }

    [Fact]
    public void MapBasketToDto_TaxInclusiveDiscount_WithCurrencyConversion()
    {
        // Arrange - USD to GBP at 0.79
        var basket = new BasketFactory().Create(null, "USD", "$");

        var product = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(), "Product", "PROD-001", 100m, 0m, 1, true, 20m);
        product.LineItemType = LineItemType.Product;

        var discount = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(), "10% Off", "DISC-10", -10m, 0m, 1, false, 0m,
            new Dictionary<string, object>
            {
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountValueType] = "Percentage",
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountValue] = 10m
            });
        discount.LineItemType = LineItemType.Discount;
        discount.DependantLineItemSku = "PROD-001";

        basket.LineItems.Add(product);
        basket.LineItems.Add(discount);
        basket.SubTotal = 100m;
        basket.Discount = 10m;
        basket.Tax = 18m;
        basket.Shipping = 0m;
        basket.Total = 108m;

        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "GBP",
            CurrencySymbol: "£",
            DecimalPlaces: 2,
            ExchangeRate: 0.79m,
            StoreCurrencyCode: "USD",
            DisplayPricesIncTax: true,
            TaxCountryCode: "GB",
            TaxRegionCode: null,
            IsShippingTaxable: false,
            ShippingTaxRate: 0m);

        // Act
        var dto = _checkoutDtoMapper.MapBasketToDto(basket, displayContext);

        // Assert - $10 * 1.20 * 0.79 = £9.48
        var expectedTaxIncDiscount = _currencyService.Round(10m * 1.20m * 0.79m, "GBP");
        dto.TaxInclusiveDisplayDiscount.ShouldBe(expectedTaxIncDiscount);

        // GROSS reconciliation must hold
        var grossSum = dto.TaxInclusiveDisplaySubTotal - dto.TaxInclusiveDisplayDiscount;
        grossSum.ShouldBe(dto.DisplayTotal);
    }

    [Fact]
    public void MapBasketToDto_TaxInclusiveDiscount_MultipleDiscountsDifferentRates()
    {
        // Arrange - two discounts on products with different tax rates
        var basket = new BasketFactory().Create(null, "USD", "$");

        var product20 = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(), "Standard Rate Product", "PROD-20", 100m, 0m, 1, true, 20m);
        product20.LineItemType = LineItemType.Product;

        var product5 = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(), "Reduced Rate Product", "PROD-5", 100m, 0m, 1, true, 5m);
        product5.LineItemType = LineItemType.Product;

        var disc20 = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(), "Discount on Standard", "DISC-20", -10m, 0m, 1, false, 0m,
            new Dictionary<string, object>
            {
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountValueType] = "Percentage",
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountValue] = 10m
            });
        disc20.LineItemType = LineItemType.Discount;
        disc20.DependantLineItemSku = "PROD-20";

        var disc5 = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(), "Discount on Reduced", "DISC-5", -10m, 0m, 1, false, 0m,
            new Dictionary<string, object>
            {
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountValueType] = "Percentage",
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountValue] = 10m
            });
        disc5.LineItemType = LineItemType.Discount;
        disc5.DependantLineItemSku = "PROD-5";

        basket.LineItems.Add(product20);
        basket.LineItems.Add(product5);
        basket.LineItems.Add(disc20);
        basket.LineItems.Add(disc5);
        basket.SubTotal = 200m;
        basket.Discount = 20m;
        basket.Tax = 22.50m; // (90*0.20) + (90*0.05)
        basket.Shipping = 0m;
        basket.Total = 202.50m;

        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "USD",
            CurrencySymbol: "$",
            DecimalPlaces: 2,
            ExchangeRate: 1m,
            StoreCurrencyCode: "USD",
            DisplayPricesIncTax: true,
            TaxCountryCode: "US",
            TaxRegionCode: null,
            IsShippingTaxable: false,
            ShippingTaxRate: 0m);

        // Act
        var dto = _checkoutDtoMapper.MapBasketToDto(basket, displayContext);

        // Assert - each discount uses its linked product's tax rate
        // $10 * 1.20 = $12.00 (20% product) + $10 * 1.05 = $10.50 (5% product) = $22.50
        dto.TaxInclusiveDisplayDiscount.ShouldBe(22.50m);

        // Individual applied discount DTOs
        dto.AppliedDiscounts.Count.ShouldBe(2);
        var disc20Dto = dto.AppliedDiscounts.Single(d => d.Name == "Discount on Standard");
        var disc5Dto = dto.AppliedDiscounts.Single(d => d.Name == "Discount on Reduced");
        disc20Dto.Amount.ShouldBe(12m);   // 10 * 1.20
        disc5Dto.Amount.ShouldBe(10.50m); // 10 * 1.05

        // GROSS reconciliation
        (dto.TaxInclusiveDisplaySubTotal - dto.TaxInclusiveDisplayDiscount).ShouldBe(dto.DisplayTotal);
    }

    [Fact]
    public void MapBasketToDto_ExTaxDisplay_DoesNotUseTaxInclusiveDiscount()
    {
        // Arrange - DisplayPricesIncTax = false
        var basket = new BasketFactory().Create(null, "USD", "$");

        var product = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(), "Product", "PROD-001", 100m, 0m, 1, true, 20m);
        product.LineItemType = LineItemType.Product;

        var discount = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(), "Discount", "DISC-001", -10m, 0m, 1, false, 0m,
            new Dictionary<string, object>
            {
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountValueType] = "Percentage",
                [Merchello.Core.Constants.ExtendedDataKeys.DiscountValue] = 10m
            });
        discount.LineItemType = LineItemType.Discount;
        discount.DependantLineItemSku = "PROD-001";

        basket.LineItems.Add(product);
        basket.LineItems.Add(discount);
        basket.SubTotal = 100m;
        basket.Discount = 10m;
        basket.Tax = 18m;
        basket.Shipping = 0m;
        basket.Total = 108m;

        var displayContext = new StorefrontDisplayContext(
            CurrencyCode: "USD",
            CurrencySymbol: "$",
            DecimalPlaces: 2,
            ExchangeRate: 1m,
            StoreCurrencyCode: "USD",
            DisplayPricesIncTax: false,
            TaxCountryCode: "US",
            TaxRegionCode: null,
            IsShippingTaxable: false,
            ShippingTaxRate: 0m);

        // Act
        var dto = _checkoutDtoMapper.MapBasketToDto(basket, displayContext);

        // Assert - ex-tax display: discount stays at face value
        dto.DisplayDiscount.ShouldBe(10m);
        dto.DisplayPricesIncTax.ShouldBeFalse();
    }

    #endregion
}
