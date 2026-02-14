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
}
