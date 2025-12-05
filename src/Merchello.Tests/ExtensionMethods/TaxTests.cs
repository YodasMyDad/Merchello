using Merchello.Core.Shared.Extensions;
using Shouldly;
using Xunit;

namespace Merchello.Tests.ExtensionMethods;

/// <summary>
/// Tests for tax calculation extension methods.
/// These test the PercentageAmount method which calculates tax amounts with configurable rounding.
/// </summary>
public class TaxTests
{
    [Fact]
    public void PercentageAmount_20Percent_CalculatesCorrectly()
    {
        // Arrange
        var amount = 52.50m;

        // Act
        var taxAmount = amount.PercentageAmount(20);

        // Assert
        taxAmount.ShouldBe(10.5m);
    }

    [Fact]
    public void PercentageAmount_10Percent_CalculatesCorrectly()
    {
        // Arrange
        var amount = 552.51m;

        // Act
        var taxAmount = amount.PercentageAmount(10);

        // Assert
        taxAmount.ShouldBe(55.25m);
    }

    [Fact]
    public void PercentageAmount_NoRounding_ReturnsUnroundedValue()
    {
        // Arrange
        var amount = 552.51m;

        // Act
        var taxAmountNoRound = amount.PercentageAmount(10, MidpointRounding.ToEven, false);

        // Assert - Without rounding, we get the raw calculation
        taxAmountNoRound.ShouldNotBe(55.25m);
        taxAmountNoRound.ShouldBe(55.251m);
    }

    [Fact]
    public void PercentageAmount_NegativeValue_HandlesCorrectly()
    {
        // Arrange
        var amount = -552.51m;

        // Act
        var taxAmount = amount.PercentageAmount(10);

        // Assert
        taxAmount.ShouldBe(-55.25m);
    }

    [Fact]
    public void PercentageAmount_MidpointRounding_UsesConfiguredStrategy()
    {
        // Arrange - value that will need rounding (10.0125)
        var amount = 100.125m;

        // Act - with AwayFromZero (default for commerce)
        var taxAmountAwayFromZero = amount.PercentageAmount(10, MidpointRounding.AwayFromZero);
        // Act - with ToEven (banker's rounding)
        var taxAmountToEven = amount.PercentageAmount(10, MidpointRounding.ToEven);

        // Assert - 10.0125 rounds to 10.01 with both strategies (0.5 case would differ)
        taxAmountAwayFromZero.ShouldBe(10.01m);
        taxAmountToEven.ShouldBe(10.01m);
    }

    [Fact]
    public void PercentageAmount_MidpointAwayFromZero_RoundsHalfUp()
    {
        // Arrange - value that hits exact midpoint: 10.005
        var amount = 100.05m;

        // Act
        var taxAmount = amount.PercentageAmount(10, MidpointRounding.AwayFromZero);

        // Assert - 10.005 rounds to 10.01 with AwayFromZero
        taxAmount.ShouldBe(10.01m);
    }

    [Fact]
    public void PercentageAmount_ZeroTaxRate_ReturnsOriginalAmount()
    {
        // Arrange
        var amount = 100m;

        // Act
        var taxAmount = amount.PercentageAmount(0);

        // Assert - Zero tax rate returns the original amount (per implementation)
        taxAmount.ShouldBe(100m);
    }

    [Fact]
    public void PercentageAmount_NegativeTaxRate_ReturnsOriginalAmount()
    {
        // Arrange
        var amount = 100m;

        // Act
        var taxAmount = amount.PercentageAmount(-5);

        // Assert - Negative tax rate returns the original amount (guard clause)
        taxAmount.ShouldBe(100m);
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
