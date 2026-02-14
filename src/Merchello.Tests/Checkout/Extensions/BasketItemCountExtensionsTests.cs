using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Extensions;
using Merchello.Core.Checkout.Factories;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout.Extensions;

public class BasketItemCountExtensionsTests
{
    [Fact]
    public void GetStorefrontItemCount_ExcludesAddonsAndNonSellableLineItems()
    {
        var basket = new BasketFactory().Create(null, "GBP", "$");
        basket.LineItems.Add(CreateLineItem(LineItemType.Product, 1, "PRODUCT-1"));
        basket.LineItems.Add(CreateLineItem(LineItemType.Custom, 2, "CUSTOM-1"));
        basket.LineItems.Add(CreateLineItem(LineItemType.Addon, 2, "ADDON-1"));
        basket.LineItems.Add(CreateLineItem(LineItemType.Discount, 1, "DISCOUNT-1"));
        basket.LineItems.Add(CreateLineItem(LineItemType.Shipping, 1, "SHIPPING-1"));

        var itemCount = basket.GetStorefrontItemCount();

        itemCount.ShouldBe(3);
    }

    [Fact]
    public void GetStorefrontItemCount_WithNullBasket_ReturnsZero()
    {
        var itemCount = ((Merchello.Core.Checkout.Models.Basket?)null).GetStorefrontItemCount();

        itemCount.ShouldBe(0);
    }

    [Fact]
    public void GetStorefrontItemCount_WithNullLineItems_ReturnsZero()
    {
        IEnumerable<LineItem>? lineItems = null;

        lineItems.GetStorefrontItemCount().ShouldBe(0);
    }

    private static LineItem CreateLineItem(LineItemType lineItemType, int quantity, string sku)
    {
        var lineItem = LineItemFactory.CreateCustomLineItem(
            Guid.NewGuid(),
            sku,
            sku,
            10m,
            0m,
            quantity,
            true,
            20m);

        lineItem.LineItemType = lineItemType;
        return lineItem;
    }
}
