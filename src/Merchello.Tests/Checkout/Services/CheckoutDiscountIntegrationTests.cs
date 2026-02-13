using Merchello.Core;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Discounts.Services.Parameters;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout.Services;

[Collection("Integration")]
public class CheckoutDiscountIntegrationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICheckoutService _checkoutService;
    private readonly ICheckoutDiscountService _checkoutDiscountService;
    private readonly IDiscountService _discountService;

    public CheckoutDiscountIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        _checkoutService = fixture.GetService<ICheckoutService>();
        _checkoutDiscountService = fixture.GetService<ICheckoutDiscountService>();
        _discountService = fixture.GetService<IDiscountService>();
    }

    [Fact]
    public async Task ApplyDiscountCodeAsync_ProductTargetedDiscount_DoesNotAffectNonTargetedItems_WithAddons()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);

        var targetedRoot = dataBuilder.CreateProductRoot("Target Product", taxGroup);
        var targetedProduct = dataBuilder.CreateProduct("Target Product - Default", targetedRoot, price: 100m);
        targetedProduct.Sku = "TARGET-SKU";

        var otherRoot = dataBuilder.CreateProductRoot("Other Product", taxGroup);
        var otherProduct = dataBuilder.CreateProduct("Other Product - Default", otherRoot, price: 80m);
        otherProduct.Sku = "OTHER-SKU";

        var optionFactory = new ProductOptionFactory();
        var addonOption = optionFactory.CreateEmpty();
        addonOption.Name = "Add-ons";
        addonOption.IsVariant = false;
        addonOption.IsMultiSelect = true;

        var giftWrap = optionFactory.CreateEmptyValue();
        giftWrap.Name = "Gift Wrap";
        giftWrap.PriceAdjustment = 10m;
        addonOption.ProductOptionValues = [giftWrap];
        targetedRoot.ProductOptions = [addonOption];

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var addTargetResult = await _checkoutService.AddProductWithAddonsAsync(new AddProductWithAddonsParameters
        {
            ProductId = targetedProduct.Id,
            Quantity = 1,
            Addons =
            [
                new AddonSelectionDto
                {
                    OptionId = addonOption.Id,
                    ValueId = giftWrap.Id
                }
            ]
        });
        addTargetResult.Success.ShouldBeTrue();

        var basket = await _checkoutService.GetBasket(new GetBasketParameters());
        basket.ShouldNotBeNull();

        await _checkoutService.AddToBasketAsync(
            basket!,
            _checkoutService.CreateLineItem(otherProduct, 1),
            "US");

        var discount = await CreateCodeDiscountAsync(
            code: "TARGET10",
            targetRules:
            [
                new CreateDiscountTargetRuleParameters
                {
                    TargetType = DiscountTargetType.SpecificProducts,
                    TargetIds = [targetedProduct.Id]
                }
            ]);

        var applyResult = await _checkoutDiscountService.ApplyDiscountCodeAsync(basket, "TARGET10", "US");
        applyResult.Success.ShouldBeTrue();

        var updatedBasket = applyResult.ResultObject.ShouldNotBeNull();
        var discountLines = updatedBasket.LineItems
            .Where(li => li.LineItemType == LineItemType.Discount)
            .ToList();

        discountLines.Count.ShouldBeGreaterThan(0);
        discountLines.Any(li =>
            string.Equals(li.DependantLineItemSku, otherProduct.Sku, StringComparison.OrdinalIgnoreCase)).ShouldBeFalse();
        discountLines.Any(li =>
            li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var discountIdObj) &&
            Guid.TryParse(discountIdObj.UnwrapJsonElement()?.ToString(), out var parsedId) &&
            parsedId == discount.Id).ShouldBeTrue();
    }

    [Fact]
    public async Task RemovePromotionalDiscountAsync_RemovesPersistedDiscount_WhenDiscountIdIsJsonElement()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var productRoot = dataBuilder.CreateProductRoot("Roundtrip Product");
        var product = dataBuilder.CreateProduct("Roundtrip Product - Default", productRoot, price: 60m);
        await dataBuilder.SaveChangesAsync();

        var basket = _checkoutService.CreateBasket();
        basket.LineItems.Add(_checkoutService.CreateLineItem(product, 1));
        await _checkoutService.SaveBasketAsync(new SaveBasketParameters { Basket = basket });

        var discount = await CreateCodeDiscountAsync(code: "ROUND10");
        var applyResult = await _checkoutDiscountService.ApplyDiscountCodeAsync(basket, "ROUND10", "US");
        applyResult.Success.ShouldBeTrue();
        await _checkoutService.SaveBasketAsync(new SaveBasketParameters { Basket = basket });

        var reloaded = await _checkoutService.GetBasketByIdAsync(new GetBasketByIdParameters
        {
            BasketId = basket.Id
        });
        reloaded.ShouldNotBeNull();

        var persistedDiscountId = reloaded!.LineItems
            .Where(li => li.LineItemType == LineItemType.Discount)
            .Select(li => li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var idObj)
                ? idObj.UnwrapJsonElement()?.ToString()
                : null)
            .Where(id => Guid.TryParse(id, out _))
            .Select(id => Guid.Parse(id!))
            .FirstOrDefault();

        persistedDiscountId.ShouldBe(discount.Id);

        var removeResult = await _checkoutDiscountService.RemovePromotionalDiscountAsync(reloaded, discount.Id, "US");
        removeResult.Success.ShouldBeTrue();
        removeResult.ResultObject.ShouldNotBeNull();
        removeResult.ResultObject!.LineItems
            .Any(li => li.LineItemType == LineItemType.Discount).ShouldBeFalse();
    }

    [Fact]
    public async Task RefreshPromotionalDiscountsAsync_RemovesInvalidPersistedCodes_AndReturnsWarning()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var productRoot = dataBuilder.CreateProductRoot("Refresh Product");
        var product = dataBuilder.CreateProduct("Refresh Product - Default", productRoot, price: 40m);
        await dataBuilder.SaveChangesAsync();

        var basket = _checkoutService.CreateBasket();
        basket.LineItems.Add(_checkoutService.CreateLineItem(product, 1));
        await _checkoutService.SaveBasketAsync(new SaveBasketParameters { Basket = basket });

        var discount = await CreateCodeDiscountAsync(code: "TEMP10");
        var applyResult = await _checkoutDiscountService.ApplyDiscountCodeAsync(basket, "TEMP10", "US");
        applyResult.Success.ShouldBeTrue();
        basket = applyResult.ResultObject!;

        var deactivateResult = await _discountService.DeactivateAsync(discount.Id);
        deactivateResult.Success.ShouldBeTrue();

        var refreshResult = await _checkoutDiscountService.RefreshPromotionalDiscountsAsync(basket, "US");
        refreshResult.Success.ShouldBeTrue();
        refreshResult.ResultObject.ShouldNotBeNull();
        refreshResult.ResultObject!.LineItems.Any(li =>
            li.LineItemType == LineItemType.Discount &&
            li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var idObj) &&
            Guid.TryParse(idObj.UnwrapJsonElement()?.ToString(), out var parsedId) &&
            parsedId == discount.Id).ShouldBeFalse();

        refreshResult.Messages.Any(m => m.ResultMessageType == ResultMessageType.Warning).ShouldBeTrue();
    }

    private async Task<Discount> CreateCodeDiscountAsync(
        string code,
        List<CreateDiscountTargetRuleParameters>? targetRules = null)
    {
        var createResult = await _discountService.CreateAsync(new CreateDiscountParameters
        {
            Name = $"Test {code}",
            Category = DiscountCategory.AmountOffProducts,
            Method = DiscountMethod.Code,
            Code = code,
            ValueType = DiscountValueType.Percentage,
            Value = 10m,
            StartsAt = DateTime.UtcNow.AddMinutes(-5),
            TargetRules = targetRules,
            CanCombineWithProductDiscounts = true,
            CanCombineWithOrderDiscounts = true,
            CanCombineWithShippingDiscounts = true
        });

        createResult.Success.ShouldBeTrue();
        return createResult.ResultObject.ShouldNotBeNull();
    }
}
