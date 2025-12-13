using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
using Microsoft.Extensions.Options;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shared;

public class CurrencyServiceTests
{
    private static CurrencyService CreateService(MidpointRounding rounding = MidpointRounding.AwayFromZero)
    {
        var settings = Options.Create(new MerchelloSettings { DefaultRounding = rounding });
        return new CurrencyService(settings);
    }

    [Fact]
    public void GetDecimalPlaces_Jpy_IsZero()
    {
        CreateService().GetDecimalPlaces("JPY").ShouldBe(0);
    }

    [Fact]
    public void GetDecimalPlaces_Usd_IsTwo()
    {
        CreateService().GetDecimalPlaces("USD").ShouldBe(2);
    }

    [Fact]
    public void GetDecimalPlaces_Kwd_IsThree()
    {
        CreateService().GetDecimalPlaces("KWD").ShouldBe(3);
    }

    [Fact]
    public void Round_Jpy_RoundsToZeroDecimals()
    {
        CreateService().Round(123.6m, "JPY").ShouldBe(124m);
    }

    [Fact]
    public void Round_Kwd_RoundsToThreeDecimals()
    {
        CreateService().Round(1.23456m, "KWD").ShouldBe(1.235m);
    }

    [Fact]
    public void ToMinorUnits_Usd_UsesTwoDecimals()
    {
        CreateService().ToMinorUnits(12.34m, "USD").ShouldBe(1234);
    }

    [Fact]
    public void ToMinorUnits_Jpy_UsesZeroDecimals()
    {
        CreateService().ToMinorUnits(123.4m, "JPY").ShouldBe(123);
    }

    [Fact]
    public void FromMinorUnits_Usd_RestoresDecimals()
    {
        CreateService().FromMinorUnits(1234, "USD").ShouldBe(12.34m);
    }

    [Fact]
    public void FromMinorUnits_Kwd_RestoresThreeDecimals()
    {
        CreateService().FromMinorUnits(1234, "KWD").ShouldBe(1.234m);
    }

    [Fact]
    public void FormatAmount_RespectsCurrencyDecimalPlaces()
    {
        var service = CreateService();
        service.FormatAmount(12.3456m, "USD").ShouldContain("12.35");
        service.FormatAmount(12.3456m, "JPY").ShouldContain("12");
    }
}

