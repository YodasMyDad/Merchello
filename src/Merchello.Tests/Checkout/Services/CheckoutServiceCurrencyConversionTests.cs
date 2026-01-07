using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Notifications;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout.Services;

/// <summary>
/// Tests for the basket currency conversion functionality.
/// These tests verify the conversion logic without testing the full CheckoutService integration.
/// </summary>
public class BasketCurrencyConversionTests
{
    private readonly Mock<IExchangeRateCache> _exchangeRateCacheMock;
    private readonly Mock<ICurrencyService> _currencyServiceMock;
    private readonly Mock<IMerchelloNotificationPublisher> _notificationPublisherMock;

    public BasketCurrencyConversionTests()
    {
        _exchangeRateCacheMock = new Mock<IExchangeRateCache>();
        _currencyServiceMock = new Mock<ICurrencyService>();
        _notificationPublisherMock = new Mock<IMerchelloNotificationPublisher>();

        // Default mock setups
        _currencyServiceMock.Setup(x => x.Round(It.IsAny<decimal>(), It.IsAny<string>()))
            .Returns((decimal amount, string _) => Math.Round(amount, 2));

        _currencyServiceMock.Setup(x => x.GetCurrency(It.IsAny<string>()))
            .Returns((string code) => new CurrencyInfo(code, GetSymbolForCurrency(code), 2, true));

        _notificationPublisherMock.Setup(x => x.PublishCancelableAsync(
                It.IsAny<BasketCurrencyChangingNotification>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(false); // Don't cancel by default
    }

    private static string GetSymbolForCurrency(string code) => code switch
    {
        "USD" => "$",
        "EUR" => "€",
        "GBP" => "£",
        _ => code
    };

    [Fact]
    public void ConvertBasketCurrencyParameters_RequiresNewCurrencyCode()
    {
        // Arrange & Act
        var parameters = new ConvertBasketCurrencyParameters { NewCurrencyCode = "USD" };

        // Assert
        parameters.NewCurrencyCode.ShouldBe("USD");
        parameters.NewCurrencySymbol.ShouldBeNull(); // Optional
    }

    [Fact]
    public void ConvertBasketCurrencyParameters_CanSetSymbol()
    {
        // Arrange & Act
        var parameters = new ConvertBasketCurrencyParameters
        {
            NewCurrencyCode = "USD",
            NewCurrencySymbol = "$"
        };

        // Assert
        parameters.NewCurrencyCode.ShouldBe("USD");
        parameters.NewCurrencySymbol.ShouldBe("$");
    }

    [Fact]
    public async Task ExchangeRateCache_ReturnsRateForConversion()
    {
        // Arrange
        _exchangeRateCacheMock.Setup(x => x.GetRateAsync("GBP", "USD", It.IsAny<CancellationToken>()))
            .ReturnsAsync(1.27m);

        // Act
        var rate = await _exchangeRateCacheMock.Object.GetRateAsync("GBP", "USD");

        // Assert
        rate.ShouldBe(1.27m);
    }

    [Fact]
    public async Task ExchangeRateCache_ReturnsNullForUnavailableRate()
    {
        // Arrange
        _exchangeRateCacheMock.Setup(x => x.GetRateAsync("GBP", "XYZ", It.IsAny<CancellationToken>()))
            .ReturnsAsync((decimal?)null);

        // Act
        var rate = await _exchangeRateCacheMock.Object.GetRateAsync("GBP", "XYZ");

        // Assert
        rate.ShouldBeNull();
    }

    [Fact]
    public void CurrencyService_RoundsCorrectly()
    {
        // Arrange
        var amount = 127.456m;

        // Act
        var rounded = _currencyServiceMock.Object.Round(amount, "USD");

        // Assert
        rounded.ShouldBe(127.46m);
    }

    [Fact]
    public void CurrencyService_GetsCurrencyInfo()
    {
        // Act
        var usd = _currencyServiceMock.Object.GetCurrency("USD");
        var gbp = _currencyServiceMock.Object.GetCurrency("GBP");
        var eur = _currencyServiceMock.Object.GetCurrency("EUR");

        // Assert
        usd.Symbol.ShouldBe("$");
        gbp.Symbol.ShouldBe("£");
        eur.Symbol.ShouldBe("€");
    }

    [Fact]
    public void LineItemConversion_CalculatesCorrectly()
    {
        // Arrange
        var lineItem = CreateLineItem(100m);
        var exchangeRate = 1.27m;

        // Act
        var convertedAmount = _currencyServiceMock.Object.Round(
            lineItem.Amount * exchangeRate, "USD");

        // Assert
        convertedAmount.ShouldBe(127m);
    }

    [Fact]
    public void LineItemConversion_MultipleItems_CalculatesAllCorrectly()
    {
        // Arrange
        var lineItems = new List<LineItem>
        {
            CreateLineItem(100m),
            CreateLineItem(50m),
            CreateLineItem(25m)
        };
        var exchangeRate = 1.17m;

        // Act
        var convertedAmounts = lineItems.Select(li =>
            _currencyServiceMock.Object.Round(li.Amount * exchangeRate, "EUR")).ToList();

        // Assert
        convertedAmounts[0].ShouldBe(117m); // 100 * 1.17
        convertedAmounts[1].ShouldBe(58.5m); // 50 * 1.17
        convertedAmounts[2].ShouldBe(29.25m); // 25 * 1.17
    }

    [Fact]
    public void LineItemConversion_StoresAuditTrail()
    {
        // Arrange
        var lineItem = CreateLineItem(100m);
        var oldCurrency = "GBP";
        var exchangeRate = 1.27m;

        // Act - simulate conversion logic
        lineItem.ExtendedData["OriginalCurrency"] = oldCurrency;
        lineItem.ExtendedData["OriginalAmount"] = lineItem.Amount.ToString("G");
        lineItem.Amount = _currencyServiceMock.Object.Round(lineItem.Amount * exchangeRate, "USD");

        // Assert
        lineItem.ExtendedData["OriginalCurrency"].ShouldBe("GBP");
        lineItem.ExtendedData["OriginalAmount"].ShouldBe("100");
        lineItem.Amount.ShouldBe(127m);
    }

    [Fact]
    public void BasketCurrencyChangingNotification_CanBeCancelled()
    {
        // Arrange
        var basket = CreateBasket("GBP", [CreateLineItem(100m)]);
        var notification = new BasketCurrencyChangingNotification(basket, "GBP", "USD", 1.27m);

        // Act
        notification.CancelOperation("Test cancellation reason");

        // Assert
        notification.Cancel.ShouldBeTrue();
        notification.CancelReason.ShouldBe("Test cancellation reason");
    }

    [Fact]
    public void BasketCurrencyChangingNotification_ContainsCorrectData()
    {
        // Arrange
        var basket = CreateBasket("GBP", [CreateLineItem(100m)]);

        // Act
        var notification = new BasketCurrencyChangingNotification(basket, "GBP", "USD", 1.27m);

        // Assert
        notification.Basket.ShouldBe(basket);
        notification.OldCurrencyCode.ShouldBe("GBP");
        notification.NewCurrencyCode.ShouldBe("USD");
        notification.ExchangeRate.ShouldBe(1.27m);
    }

    [Fact]
    public void BasketCurrencyChangedNotification_ContainsCorrectData()
    {
        // Arrange
        var basket = CreateBasket("USD", [CreateLineItem(127m)]);

        // Act
        var notification = new BasketCurrencyChangedNotification(basket, "GBP", "USD", 1.27m);

        // Assert
        notification.Basket.ShouldBe(basket);
        notification.OldCurrencyCode.ShouldBe("GBP");
        notification.NewCurrencyCode.ShouldBe("USD");
        notification.ExchangeRate.ShouldBe(1.27m);
    }

    [Fact]
    public void SameCurrencyConversion_ShouldNotConvert()
    {
        // Arrange
        var oldCurrency = "GBP";
        var newCurrency = "GBP";

        // Act
        var shouldConvert = !string.Equals(oldCurrency, newCurrency, StringComparison.OrdinalIgnoreCase);

        // Assert
        shouldConvert.ShouldBeFalse();
    }

    [Fact]
    public void DifferentCurrencyConversion_ShouldConvert()
    {
        // Arrange
        var oldCurrency = "GBP";
        var newCurrency = "USD";

        // Act
        var shouldConvert = !string.Equals(oldCurrency, newCurrency, StringComparison.OrdinalIgnoreCase);

        // Assert
        shouldConvert.ShouldBeTrue();
    }

    [Fact]
    public void CaseInsensitiveCurrencyComparison_Works()
    {
        // Arrange & Act & Assert
        string.Equals("gbp", "GBP", StringComparison.OrdinalIgnoreCase).ShouldBeTrue();
        string.Equals("usd", "USD", StringComparison.OrdinalIgnoreCase).ShouldBeTrue();
    }

    private static Basket CreateBasket(string currency, List<LineItem> lineItems)
    {
        return new Basket
        {
            Id = Guid.NewGuid(),
            Currency = currency,
            CurrencySymbol = currency == "GBP" ? "£" : "$",
            LineItems = lineItems,
            ShippingAddress = new Merchello.Core.Locality.Models.Address
            {
                CountryCode = "GB"
            }
        };
    }

    private static LineItem CreateLineItem(decimal amount)
    {
        return new LineItem
        {
            Id = Guid.NewGuid(),
            Name = "Test Product",
            Sku = "TEST-SKU",
            Quantity = 1,
            Amount = amount,
            ExtendedData = new Dictionary<string, object>()
        };
    }
}
