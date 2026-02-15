using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Models;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Services;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Storefront;

public class StorefrontDtoMapperTests
{
    [Fact]
    public void MapBasketOperationResult_UsesStorefrontItemCount_AndFormatsTotal()
    {
        var mapper = CreateMapper("$");
        var basket = new Basket
        {
            Total = 22m,
            LineItems =
            [
                new LineItem
                {
                    LineItemType = LineItemType.Product,
                    Quantity = 2,
                    Amount = 10m,
                    Sku = "SKU-1",
                    Name = "Product"
                },
                new LineItem
                {
                    LineItemType = LineItemType.Addon,
                    Quantity = 2,
                    Amount = 1m,
                    Sku = "ADD-1",
                    Name = "Addon",
                    DependantLineItemSku = "SKU-1"
                }
            ]
        };

        var dto = mapper.MapBasketOperationResult(
            success: true,
            message: "ok",
            basket: basket,
            storeCurrencySymbol: "$");

        dto.Success.ShouldBeTrue();
        dto.ItemCount.ShouldBe(2);
        dto.Total.ShouldBe(22m);
        dto.FormattedTotal.ShouldBe("$22.00");
    }

    [Fact]
    public void MapProductAvailability_MapsCanShipToLocation()
    {
        var mapper = CreateMapper("$");

        var dto = mapper.MapProductAvailability(new ProductLocationAvailability(
            CanShipToLocation: false,
            HasStock: true,
            AvailableStock: 3,
            StatusMessage: "Not available in selected location",
            ShowStockLevels: true));

        dto.CanShipToLocation.ShouldBeFalse();
        dto.HasStock.ShouldBeTrue();
        dto.AvailableStock.ShouldBe(3);
    }

    [Fact]
    public void MapBasketAvailability_MapsCanShipToLocation()
    {
        var mapper = CreateMapper("$");
        var lineItemId = Guid.NewGuid();
        var productId = Guid.NewGuid();

        var dto = mapper.MapBasketAvailability(new BasketLocationAvailability(
            AllItemsAvailable: false,
            Items:
            [
                new BasketItemLocationAvailability(
                    LineItemId: lineItemId,
                    ProductId: productId,
                    CanShipToLocation: false,
                    HasStock: true,
                    StatusMessage: "No shipping route")
            ]));

        dto.AllItemsAvailable.ShouldBeFalse();
        dto.Items.Count.ShouldBe(1);
        dto.Items[0].CanShipToLocation.ShouldBeFalse();
        dto.Items[0].LineItemId.ShouldBe(lineItemId);
        dto.Items[0].ProductId.ShouldBe(productId);
    }

    [Fact]
    public void MapStorefrontContext_ReturnsLocationCurrencyAndBasketSummary()
    {
        var mapper = CreateMapper("$");

        var basket = new Basket
        {
            Total = 10m,
            LineItems =
            [
                new LineItem
                {
                    LineItemType = LineItemType.Product,
                    Quantity = 1,
                    Amount = 10m
                }
            ]
        };

        var dto = mapper.MapStorefrontContext(
            new ShippingLocation("US", "United States", "CA", "California"),
            new StorefrontCurrency("USD", "$", 2),
            basket,
            "$");

        dto.Country.Code.ShouldBe("US");
        dto.Country.Name.ShouldBe("United States");
        dto.RegionCode.ShouldBe("CA");
        dto.RegionName.ShouldBe("California");
        dto.Currency.CurrencyCode.ShouldBe("USD");
        dto.Basket.ItemCount.ShouldBe(1);
        dto.Basket.Total.ShouldBe(10m);
    }

    private static StorefrontDtoMapper CreateMapper(string expectedSymbol)
    {
        var currencyService = new Mock<ICurrencyService>();
        var currencyConversion = new Mock<ICurrencyConversionService>();

        currencyConversion
            .Setup(x => x.Format(It.IsAny<decimal>(), It.IsAny<string>()))
            .Returns((decimal amount, string symbol) => $"{symbol}{amount:N2}");
        currencyConversion
            .Setup(x => x.Convert(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<string>()))
            .Returns((decimal amount, decimal rate, string _) => amount * rate);

        currencyService
            .Setup(x => x.GetCurrency(It.IsAny<string>()))
            .Returns(new CurrencyInfo(
                Code: expectedSymbol == "$" ? "USD" : "GBP",
                Symbol: expectedSymbol,
                DecimalPlaces: 2,
                SymbolBefore: true));

        return new StorefrontDtoMapper(currencyService.Object, currencyConversion.Object);
    }
}
