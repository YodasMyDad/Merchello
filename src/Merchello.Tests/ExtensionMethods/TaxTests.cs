using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Services.Interfaces;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.ExtensionMethods;

/// <summary>
/// Tests for tax calculation extension methods.
/// These test the PercentageAmount method which calculates tax amounts with currency-aware rounding.
/// </summary>
public class TaxTests
{
    private readonly Mock<ICurrencyService> _currencyServiceMock = new();
    private const string DefaultCurrency = "USD";

    public TaxTests()
    {
        // Setup currency service to round to 2 decimal places (standard for USD)
        _currencyServiceMock
            .Setup(x => x.Round(It.IsAny<decimal>(), It.IsAny<string>()))
            .Returns((decimal value, string _) => Math.Round(value, 2, MidpointRounding.AwayFromZero));
    }

    [Fact]
    public void PercentageAmount_20Percent_CalculatesCorrectly()
    {
        // Arrange
        var amount = 52.50m;

        // Act
        var taxAmount = amount.PercentageAmount(20, DefaultCurrency, _currencyServiceMock.Object);

        // Assert
        taxAmount.ShouldBe(10.5m);
    }

    [Fact]
    public void PercentageAmount_10Percent_CalculatesCorrectly()
    {
        // Arrange
        var amount = 552.51m;

        // Act
        var taxAmount = amount.PercentageAmount(10, DefaultCurrency, _currencyServiceMock.Object);

        // Assert
        taxAmount.ShouldBe(55.25m);
    }

    [Fact]
    public void PercentageAmount_NegativeValue_HandlesCorrectly()
    {
        // Arrange
        var amount = -552.51m;

        // Act
        var taxAmount = amount.PercentageAmount(10, DefaultCurrency, _currencyServiceMock.Object);

        // Assert
        taxAmount.ShouldBe(-55.25m);
    }

    [Fact]
    public void PercentageAmount_MidpointRounding_UsesAwayFromZero()
    {
        // Arrange - value that hits exact midpoint: 10.005
        var amount = 100.05m;

        // Act
        var taxAmount = amount.PercentageAmount(10, DefaultCurrency, _currencyServiceMock.Object);

        // Assert - 10.005 rounds to 10.01 with AwayFromZero (configured in currency service)
        taxAmount.ShouldBe(10.01m);
    }

    [Fact]
    public void PercentageAmount_ZeroTaxRate_ReturnsOriginalAmount()
    {
        // Arrange
        var amount = 100m;

        // Act
        var taxAmount = amount.PercentageAmount(0, DefaultCurrency, _currencyServiceMock.Object);

        // Assert - Zero tax rate returns the original amount (per implementation)
        taxAmount.ShouldBe(100m);
    }

    [Fact]
    public void PercentageAmount_NegativeTaxRate_ReturnsOriginalAmount()
    {
        // Arrange
        var amount = 100m;

        // Act
        var taxAmount = amount.PercentageAmount(-5, DefaultCurrency, _currencyServiceMock.Object);

        // Assert - Negative tax rate returns the original amount (guard clause)
        taxAmount.ShouldBe(100m);
    }

    [Fact]
    public void PercentageAmount_JpyRounding_UsesZeroDecimalPlaces()
    {
        // Arrange - Japanese Yen has 0 decimal places
        var jpyCurrencyMock = new Mock<ICurrencyService>();
        jpyCurrencyMock
            .Setup(x => x.Round(It.IsAny<decimal>(), "JPY"))
            .Returns((decimal value, string _) => Math.Round(value, 0, MidpointRounding.AwayFromZero));

        var amount = 1000m;

        // Act
        var taxAmount = amount.PercentageAmount(8, "JPY", jpyCurrencyMock.Object);

        // Assert - 80 yen tax, no decimal places
        taxAmount.ShouldBe(80m);
    }

    [Fact]
    public void AdjustByPercentage_PositiveAdjustment_IncreasesValue()
    {
        // Arrange
        var figure = 100m;

        // Act
        var adjusted = figure.AdjustByPercentage(10);

        // Assert
        adjusted.ShouldBe(110m);
    }

    [Fact]
    public void AdjustByPercentage_NegativeAdjustment_DecreasesValue()
    {
        // Arrange
        var figure = 100m;

        // Act
        var adjusted = figure.AdjustByPercentage(-10);

        // Assert
        adjusted.ShouldBe(90m);
    }
}
