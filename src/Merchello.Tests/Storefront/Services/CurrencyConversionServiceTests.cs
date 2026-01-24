using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Services;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Storefront.Services;

public class CurrencyConversionServiceTests
{
    private readonly Mock<ICurrencyService> _currencyServiceMock;
    private readonly CurrencyConversionService _service;

    public CurrencyConversionServiceTests()
    {
        _currencyServiceMock = new Mock<ICurrencyService>();
        _currencyServiceMock
            .Setup(s => s.Round(It.IsAny<decimal>(), It.IsAny<string>()))
            .Returns((decimal amount, string _) => Math.Round(amount, 2));

        _service = new CurrencyConversionService(_currencyServiceMock.Object);
    }

    [Fact]
    public void Convert_ExchangeRateIsOne_ReturnsUnchangedAmount()
    {
        // Arrange
        var amount = 29.99m;

        // Act
        var result = _service.Convert(amount, 1.0m, "USD");

        // Assert
        result.ShouldBe(29.99m);
        _currencyServiceMock.Verify(s => s.Round(It.IsAny<decimal>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public void Convert_NonOneRate_MultipliesAndRounds()
    {
        // Arrange
        var amount = 100m;
        var exchangeRate = 1.356m;

        // Act
        var result = _service.Convert(amount, exchangeRate, "GBP");

        // Assert
        result.ShouldBe(135.60m);
        _currencyServiceMock.Verify(s => s.Round(135.6m, "GBP"), Times.Once);
    }

    [Fact]
    public void ConvertBatch_MultipleAmounts_ReturnsCorrectDictionary()
    {
        // Arrange
        var amounts = new[] { 10m, 20m, 30m };
        var exchangeRate = 1.5m;

        // Act
        var result = _service.ConvertBatch(amounts, exchangeRate, "EUR");

        // Assert
        result.Count.ShouldBe(3);
        result[10m].ShouldBe(15m);
        result[20m].ShouldBe(30m);
        result[30m].ShouldBe(45m);
    }

    [Fact]
    public void ConvertBatch_DuplicateAmounts_DeduplicatesIdenticalValues()
    {
        // Arrange
        var amounts = new[] { 25m, 50m, 25m, 50m, 25m };
        var exchangeRate = 2.0m;

        // Act
        var result = _service.ConvertBatch(amounts, exchangeRate, "CAD");

        // Assert
        result.Count.ShouldBe(2);
        result[25m].ShouldBe(50m);
        result[50m].ShouldBe(100m);
    }

    [Fact]
    public void ConvertBatch_EmptyInput_ReturnsEmptyDictionary()
    {
        // Arrange
        var amounts = Enumerable.Empty<decimal>();

        // Act
        var result = _service.ConvertBatch(amounts, 1.5m, "USD");

        // Assert
        result.ShouldBeEmpty();
    }

    [Fact]
    public void Format_ProducesCorrectOutput()
    {
        // Arrange
        var amount = 19.99m;
        var symbol = "$";

        // Act
        var result = _service.Format(amount, symbol);

        // Assert
        result.ShouldBe("$19.99");
    }
}
