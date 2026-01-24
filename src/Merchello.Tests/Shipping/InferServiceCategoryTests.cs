using Merchello.Core.Accounting.Services;
using Merchello.Core.Shipping.Models;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shipping;

/// <summary>
/// Unit tests for InvoiceService.InferServiceCategory.
/// Tests transit-time-based classification of shipping speed tiers.
/// </summary>
public class InferServiceCategoryTests
{
    [Fact]
    public void InferServiceCategory_NullOption_ReturnsNull()
    {
        var result = InvoiceService.InferServiceCategory(null);
        result.ShouldBeNull();
    }

    [Fact]
    public void InferServiceCategory_IsNextDay_ReturnsOvernight()
    {
        var option = new ShippingOptionInfo { IsNextDay = true, DaysFrom = 0 };
        var result = InvoiceService.InferServiceCategory(option);
        result.ShouldBe(ShippingServiceCategory.Overnight);
    }

    [Fact]
    public void InferServiceCategory_IsNextDay_WithDaysFrom_StillReturnsOvernight()
    {
        // IsNextDay takes priority over DaysFrom
        var option = new ShippingOptionInfo { IsNextDay = true, DaysFrom = 5 };
        var result = InvoiceService.InferServiceCategory(option);
        result.ShouldBe(ShippingServiceCategory.Overnight);
    }

    [Fact]
    public void InferServiceCategory_DaysFromZero_ReturnsNull()
    {
        var option = new ShippingOptionInfo { DaysFrom = 0, IsNextDay = false };
        var result = InvoiceService.InferServiceCategory(option);
        result.ShouldBeNull();
    }

    [Fact]
    public void InferServiceCategory_DaysFromNegative_ReturnsNull()
    {
        var option = new ShippingOptionInfo { DaysFrom = -1, IsNextDay = false };
        var result = InvoiceService.InferServiceCategory(option);
        result.ShouldBeNull();
    }

    [Fact]
    public void InferServiceCategory_DaysFrom1_ReturnsOvernight()
    {
        var option = new ShippingOptionInfo { DaysFrom = 1 };
        var result = InvoiceService.InferServiceCategory(option);
        result.ShouldBe(ShippingServiceCategory.Overnight);
    }

    [Theory]
    [InlineData(2)]
    [InlineData(3)]
    public void InferServiceCategory_DaysFrom2Or3_ReturnsExpress(int daysFrom)
    {
        var option = new ShippingOptionInfo { DaysFrom = daysFrom };
        var result = InvoiceService.InferServiceCategory(option);
        result.ShouldBe(ShippingServiceCategory.Express);
    }

    [Theory]
    [InlineData(4)]
    [InlineData(5)]
    [InlineData(6)]
    [InlineData(7)]
    public void InferServiceCategory_DaysFrom4To7_ReturnsStandard(int daysFrom)
    {
        var option = new ShippingOptionInfo { DaysFrom = daysFrom };
        var result = InvoiceService.InferServiceCategory(option);
        result.ShouldBe(ShippingServiceCategory.Standard);
    }

    [Theory]
    [InlineData(8)]
    [InlineData(10)]
    [InlineData(14)]
    [InlineData(30)]
    public void InferServiceCategory_DaysFrom8Plus_ReturnsEconomy(int daysFrom)
    {
        var option = new ShippingOptionInfo { DaysFrom = daysFrom };
        var result = InvoiceService.InferServiceCategory(option);
        result.ShouldBe(ShippingServiceCategory.Economy);
    }
}
