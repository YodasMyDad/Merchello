using Merchello.Core;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout.Services;

[Collection("Integration")]
public class GoogleAutoDiscountIntegrationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICheckoutService _checkoutService;
    private readonly ICheckoutDiscountService _checkoutDiscountService;

    public GoogleAutoDiscountIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.MockHttpContext.ClearSession();
        _checkoutService = fixture.GetService<ICheckoutService>();
        _checkoutDiscountService = fixture.GetService<ICheckoutDiscountService>();
    }

    [Fact]
    public async Task ApplyGoogleAutoDiscount_AddsPercentageDiscountLinkedToProduct()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var productRoot = dataBuilder.CreateProductRoot("Google Discount Product");
        var product = dataBuilder.CreateProduct("Google Discount Product - Default", productRoot, price: 50m);
        product.Sku = "GOOGLE-SKU-001";
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var addResult = await _checkoutService.AddProductWithAddonsAsync(new AddProductWithAddonsParameters
        {
            ProductId = product.Id,
            Quantity = 1,
            Addons = []
        });
        addResult.Success.ShouldBeTrue();

        var basket = await _checkoutService.GetBasket(new GetBasketParameters());
        basket.ShouldNotBeNull();

        // Act
        var result = await _checkoutDiscountService.ApplyGoogleAutoDiscountAsync(new ApplyGoogleAutoDiscountParameters
        {
            Basket = basket!,
            LinkedSku = "GOOGLE-SKU-001",
            DiscountPercentage = 10,
            DiscountCode = "GTEST123",
            OfferId = "offer-001"
        });

        // Assert
        result.Success.ShouldBeTrue();
        var updatedBasket = result.ResultObject.ShouldNotBeNull();

        var discountLine = updatedBasket.LineItems
            .FirstOrDefault(li => li.LineItemType == LineItemType.Discount);
        discountLine.ShouldNotBeNull();
        discountLine!.DependantLineItemSku.ShouldBe("GOOGLE-SKU-001");

        // Verify extended data markers
        discountLine.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.IsGoogleAutoDiscount, out var isGoogle).ShouldBeTrue();
        isGoogle.UnwrapJsonElement()?.ToString().ShouldBe("true");

        discountLine.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.GoogleAutoDiscountOfferId, out var offerId).ShouldBeTrue();
        offerId.UnwrapJsonElement()?.ToString().ShouldBe("offer-001");

        discountLine.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.GoogleAutoDiscountCode, out var discountCode).ShouldBeTrue();
        discountCode.UnwrapJsonElement()?.ToString().ShouldBe("GTEST123");

        // Verify discount is a percentage type
        discountLine.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountValueType, out var valueType).ShouldBeTrue();
        valueType.UnwrapJsonElement()?.ToString().ShouldBe("Percentage");

        discountLine.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountValue, out var discountValue).ShouldBeTrue();
        Convert.ToDecimal(discountValue.UnwrapJsonElement()).ShouldBe(10m);
    }

    [Fact]
    public async Task ApplyGoogleAutoDiscount_ReducesBasketTotal()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var productRoot = dataBuilder.CreateProductRoot("Priced Product");
        var product = dataBuilder.CreateProduct("Priced Product - Default", productRoot, price: 100m);
        product.Sku = "PRICE-SKU";
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var addResult = await _checkoutService.AddProductWithAddonsAsync(new AddProductWithAddonsParameters
        {
            ProductId = product.Id,
            Quantity = 2,
            Addons = []
        });
        addResult.Success.ShouldBeTrue();

        var basket = await _checkoutService.GetBasket(new GetBasketParameters());
        basket.ShouldNotBeNull();
        var originalSubTotal = basket!.SubTotal;
        originalSubTotal.ShouldBe(200m); // 2 x £100

        // Act
        var result = await _checkoutDiscountService.ApplyGoogleAutoDiscountAsync(new ApplyGoogleAutoDiscountParameters
        {
            Basket = basket,
            LinkedSku = "PRICE-SKU",
            DiscountPercentage = 15,
            DiscountCode = "G15OFF",
            OfferId = "offer-price"
        });

        // Assert
        result.Success.ShouldBeTrue();
        var updatedBasket = result.ResultObject.ShouldNotBeNull();

        // 15% of £200 = £30 discount
        updatedBasket.Discount.ShouldBe(30m);
        updatedBasket.AdjustedSubTotal.ShouldBe(170m);
    }

    [Fact]
    public async Task ApplyGoogleAutoDiscount_PreventsDuplicates_ReplacesExisting()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var productRoot = dataBuilder.CreateProductRoot("Dedup Product");
        var product = dataBuilder.CreateProduct("Dedup Product - Default", productRoot, price: 80m);
        product.Sku = "DEDUP-SKU";
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var addResult = await _checkoutService.AddProductWithAddonsAsync(new AddProductWithAddonsParameters
        {
            ProductId = product.Id,
            Quantity = 1,
            Addons = []
        });
        addResult.Success.ShouldBeTrue();

        var basket = await _checkoutService.GetBasket(new GetBasketParameters());
        basket.ShouldNotBeNull();

        // Apply first discount (8%)
        await _checkoutDiscountService.ApplyGoogleAutoDiscountAsync(new ApplyGoogleAutoDiscountParameters
        {
            Basket = basket!,
            LinkedSku = "DEDUP-SKU",
            DiscountPercentage = 8,
            DiscountCode = "FIRST",
            OfferId = "offer-1"
        });

        // Act - Apply second discount (12%) for same SKU
        var result = await _checkoutDiscountService.ApplyGoogleAutoDiscountAsync(new ApplyGoogleAutoDiscountParameters
        {
            Basket = basket!,
            LinkedSku = "DEDUP-SKU",
            DiscountPercentage = 12,
            DiscountCode = "SECOND",
            OfferId = "offer-2"
        });

        // Assert - Only one Google auto discount should exist
        result.Success.ShouldBeTrue();
        var updatedBasket = result.ResultObject.ShouldNotBeNull();

        var googleDiscounts = updatedBasket.LineItems
            .Where(li => li.LineItemType == LineItemType.Discount
                         && li.ExtendedData.ContainsKey(Constants.ExtendedDataKeys.IsGoogleAutoDiscount))
            .ToList();

        googleDiscounts.Count.ShouldBe(1);

        // Should have the second discount's data
        googleDiscounts[0].ExtendedData.TryGetValue(Constants.ExtendedDataKeys.GoogleAutoDiscountCode, out var code).ShouldBeTrue();
        code.UnwrapJsonElement()?.ToString().ShouldBe("SECOND");

        // 12% of £80 = £9.60
        updatedBasket.Discount.ShouldBe(9.6m);
    }

    [Fact]
    public async Task ApplyGoogleAutoDiscount_DoesNotAffectOtherProducts()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var productRoot1 = dataBuilder.CreateProductRoot("Discounted Product");
        var product1 = dataBuilder.CreateProduct("Discounted Product - Default", productRoot1, price: 60m);
        product1.Sku = "DISC-SKU";

        var productRoot2 = dataBuilder.CreateProductRoot("Other Product");
        var product2 = dataBuilder.CreateProduct("Other Product - Default", productRoot2, price: 40m);
        product2.Sku = "OTHER-SKU";

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        await _checkoutService.AddProductWithAddonsAsync(new AddProductWithAddonsParameters
        {
            ProductId = product1.Id,
            Quantity = 1,
            Addons = []
        });
        var basket = await _checkoutService.GetBasket(new GetBasketParameters());
        basket.ShouldNotBeNull();
        await _checkoutService.AddToBasketAsync(basket!, _checkoutService.CreateLineItem(product2, 1), "US");

        basket = await _checkoutService.GetBasket(new GetBasketParameters());
        basket.ShouldNotBeNull();
        basket!.SubTotal.ShouldBe(100m); // £60 + £40

        // Act - Apply 20% discount only to product1
        var result = await _checkoutDiscountService.ApplyGoogleAutoDiscountAsync(new ApplyGoogleAutoDiscountParameters
        {
            Basket = basket,
            LinkedSku = "DISC-SKU",
            DiscountPercentage = 20,
            DiscountCode = "GLINKED",
            OfferId = "offer-linked"
        });

        // Assert - Discount should be 20% of £60 = £12 (not 20% of £100)
        result.Success.ShouldBeTrue();
        var updatedBasket = result.ResultObject.ShouldNotBeNull();
        updatedBasket.Discount.ShouldBe(12m);
        updatedBasket.AdjustedSubTotal.ShouldBe(88m);
    }

    [Fact]
    public async Task ApplyGoogleAutoDiscount_InvalidPercentage_ReturnsError()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var productRoot = dataBuilder.CreateProductRoot("Invalid Product");
        var product = dataBuilder.CreateProduct("Invalid Product - Default", productRoot, price: 50m);
        product.Sku = "INVALID-SKU";
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var addResult = await _checkoutService.AddProductWithAddonsAsync(new AddProductWithAddonsParameters
        {
            ProductId = product.Id,
            Quantity = 1,
            Addons = []
        });
        addResult.Success.ShouldBeTrue();

        var basket = await _checkoutService.GetBasket(new GetBasketParameters());
        basket.ShouldNotBeNull();

        // Act - Apply 0% discount (invalid)
        var result = await _checkoutDiscountService.ApplyGoogleAutoDiscountAsync(new ApplyGoogleAutoDiscountParameters
        {
            Basket = basket!,
            LinkedSku = "INVALID-SKU",
            DiscountPercentage = 0,
            DiscountCode = "ZERO",
            OfferId = "offer-zero"
        });

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.Any(m => m.ResultMessageType == ResultMessageType.Error).ShouldBeTrue();
    }

    [Fact]
    public async Task ApplyGoogleAutoDiscount_SurvivesPromotionalRefresh()
    {
        // Arrange - Google auto discounts should NOT be removed by RefreshPromotionalDiscountsAsync
        var dataBuilder = _fixture.CreateDataBuilder();
        var productRoot = dataBuilder.CreateProductRoot("Refresh Survivor");
        var product = dataBuilder.CreateProduct("Refresh Survivor - Default", productRoot, price: 75m);
        product.Sku = "REFRESH-SKU";
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var addResult = await _checkoutService.AddProductWithAddonsAsync(new AddProductWithAddonsParameters
        {
            ProductId = product.Id,
            Quantity = 1,
            Addons = []
        });
        addResult.Success.ShouldBeTrue();

        var basket = await _checkoutService.GetBasket(new GetBasketParameters());
        basket.ShouldNotBeNull();

        // Apply Google auto discount
        await _checkoutDiscountService.ApplyGoogleAutoDiscountAsync(new ApplyGoogleAutoDiscountParameters
        {
            Basket = basket!,
            LinkedSku = "REFRESH-SKU",
            DiscountPercentage = 5,
            DiscountCode = "GSURVIVE",
            OfferId = "offer-survive"
        });

        var beforeRefresh = basket!.LineItems
            .Count(li => li.LineItemType == LineItemType.Discount
                         && li.ExtendedData.ContainsKey(Constants.ExtendedDataKeys.IsGoogleAutoDiscount));
        beforeRefresh.ShouldBe(1);

        // Act - Refresh promotional discounts (should not remove Google auto discount)
        var refreshResult = await _checkoutDiscountService.RefreshPromotionalDiscountsAsync(basket, "US");

        // Assert
        refreshResult.Success.ShouldBeTrue();
        var refreshedBasket = refreshResult.ResultObject.ShouldNotBeNull();

        var googleDiscountsAfter = refreshedBasket.LineItems
            .Where(li => li.LineItemType == LineItemType.Discount
                         && li.ExtendedData.ContainsKey(Constants.ExtendedDataKeys.IsGoogleAutoDiscount))
            .ToList();

        googleDiscountsAfter.Count.ShouldBe(1);
        googleDiscountsAfter[0].ExtendedData.TryGetValue(Constants.ExtendedDataKeys.GoogleAutoDiscountCode, out var code).ShouldBeTrue();
        code.UnwrapJsonElement()?.ToString().ShouldBe("GSURVIVE");
    }

    [Fact]
    public async Task ApplyGoogleAutoDiscount_RemovedWhenProductRemoved()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var productRoot = dataBuilder.CreateProductRoot("Remove Test");
        var product = dataBuilder.CreateProduct("Remove Test - Default", productRoot, price: 90m);
        product.Sku = "REMOVE-SKU";
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var addResult = await _checkoutService.AddProductWithAddonsAsync(new AddProductWithAddonsParameters
        {
            ProductId = product.Id,
            Quantity = 1,
            Addons = []
        });
        addResult.Success.ShouldBeTrue();

        var basket = await _checkoutService.GetBasket(new GetBasketParameters());
        basket.ShouldNotBeNull();

        await _checkoutDiscountService.ApplyGoogleAutoDiscountAsync(new ApplyGoogleAutoDiscountParameters
        {
            Basket = basket!,
            LinkedSku = "REMOVE-SKU",
            DiscountPercentage = 7,
            DiscountCode = "GREMOVE",
            OfferId = "offer-remove"
        });
        await _checkoutService.SaveBasketAsync(new SaveBasketParameters { Basket = basket! });

        // Verify discount exists
        basket = await _checkoutService.GetBasket(new GetBasketParameters());
        basket.ShouldNotBeNull();
        basket!.LineItems.Any(li =>
            li.LineItemType == LineItemType.Discount
            && li.ExtendedData.ContainsKey(Constants.ExtendedDataKeys.IsGoogleAutoDiscount)).ShouldBeTrue();

        // Act - Remove the product
        var productLineItem = basket.LineItems.First(li => li.LineItemType == LineItemType.Product);
        await _checkoutService.RemoveLineItem(productLineItem.Id, "US");

        // Assert - Discount should be gone too (linked discount removal)
        var afterRemoval = await _checkoutService.GetBasket(new GetBasketParameters());
        afterRemoval.ShouldNotBeNull();
        afterRemoval!.LineItems.Any(li =>
            li.LineItemType == LineItemType.Discount
            && li.ExtendedData.ContainsKey(Constants.ExtendedDataKeys.IsGoogleAutoDiscount)).ShouldBeFalse();
    }

    [Fact]
    public async Task ApplyGoogleAutoDiscount_PersistsSaveAndReload()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var productRoot = dataBuilder.CreateProductRoot("Persist Product");
        var product = dataBuilder.CreateProduct("Persist Product - Default", productRoot, price: 120m);
        product.Sku = "PERSIST-SKU";
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var addResult = await _checkoutService.AddProductWithAddonsAsync(new AddProductWithAddonsParameters
        {
            ProductId = product.Id,
            Quantity = 1,
            Addons = []
        });
        addResult.Success.ShouldBeTrue();

        var basket = await _checkoutService.GetBasket(new GetBasketParameters());
        basket.ShouldNotBeNull();

        await _checkoutDiscountService.ApplyGoogleAutoDiscountAsync(new ApplyGoogleAutoDiscountParameters
        {
            Basket = basket!,
            LinkedSku = "PERSIST-SKU",
            DiscountPercentage = 10,
            DiscountCode = "GPERSIST",
            OfferId = "offer-persist"
        });

        // Act - Save and reload from database
        await _checkoutService.SaveBasketAsync(new SaveBasketParameters { Basket = basket! });
        _fixture.DbContext.ChangeTracker.Clear();

        var reloaded = await _checkoutService.GetBasketByIdAsync(new GetBasketByIdParameters
        {
            BasketId = basket!.Id
        });

        // Assert
        reloaded.ShouldNotBeNull();
        var discountLine = reloaded!.LineItems
            .FirstOrDefault(li => li.LineItemType == LineItemType.Discount
                                  && li.ExtendedData.ContainsKey(Constants.ExtendedDataKeys.IsGoogleAutoDiscount));

        discountLine.ShouldNotBeNull();
        discountLine!.DependantLineItemSku.ShouldBe("PERSIST-SKU");

        discountLine.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.GoogleAutoDiscountOfferId, out var offerId).ShouldBeTrue();
        offerId.UnwrapJsonElement()?.ToString().ShouldBe("offer-persist");

        discountLine.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.GoogleAutoDiscountCode, out var code).ShouldBeTrue();
        code.UnwrapJsonElement()?.ToString().ShouldBe("GPERSIST");
    }
}
