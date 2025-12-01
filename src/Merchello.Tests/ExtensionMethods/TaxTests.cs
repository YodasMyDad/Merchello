using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;

namespace Merchello.Tests.ExtensionMethods;

public class TaxTests
{
    [Fact]
    public void Add_20_percent_to_figure()
    {
        var twentyAdd = 52.50m;
        var twentyAddTax = twentyAdd.PercentageAmount(20);
        Assert.Equal(10.5m, twentyAddTax);
    }

    [Fact]
    public void Add_10_percent_to_figure()
    {
        var tenAdd = 552.51m;
        var tenAddTax = tenAdd.PercentageAmount(10);
        Assert.Equal(55.25m, tenAddTax);
    }

    [Fact]
    public void Add_10_percent_no_rounding()
    {
        var tenAddNoRound = 552.51m;
        var tenAddTaxNoRound = tenAddNoRound.PercentageAmount(10, MidpointRounding.ToEven, false);
        Assert.NotEqual(55.25m, tenAddTaxNoRound);
    }

    [Fact]
    public void Minus_10_percent()
    {
        var tenAddminus = -552.51m;
        var tenAddTaxminus = tenAddminus.PercentageAmount(10);
        Assert.Equal(-55.25m, tenAddTaxminus);
    }

    [Fact]
    public void Tax_Rounding_Strategy_Round()
    {
        var amount = 100.125m;
        var taxAmount = amount.PercentageAmount(10, MidpointRounding.ToEven, true, TaxRoundingStrategy.Round);
        Assert.Equal(10.01m, taxAmount);
    }

    [Fact]
    public void Tax_Rounding_Strategy_Ceiling()
    {
        var amount = 100.125m;
        var taxAmount = amount.PercentageAmount(10, MidpointRounding.ToEven, true, TaxRoundingStrategy.Ceiling);
        Assert.Equal(10.02m, taxAmount);
    }

    [Fact]
    public void Tax_Rounding_Strategy_Ceiling_US_Example()
    {
        // Example: $9.99 with 6.5% tax
        var amount = 9.99m;
        var taxAmount = amount.PercentageAmount(6.5m, MidpointRounding.ToEven, true, TaxRoundingStrategy.Ceiling);
        Assert.Equal(0.65m, taxAmount); // Rounds up from 0.64935
    }
}
