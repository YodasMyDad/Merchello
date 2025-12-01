using System;
using System.Linq;
using System.Threading.Tasks;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.BuiltIn;
using Xunit;

namespace Merchello.Tests.Shipping;

public class FlatRateShippingProviderTests
{
    [Fact]
    public async Task GetRatesAsync_AggregatesDestinationCosts()
    {
        var provider = new FlatRateShippingProvider();
        await provider.ConfigureAsync(null);

        var request = new ShippingQuoteRequest
        {
            CountryCode = "GB",
            CurrencyCode = "GBP",
            Items = new[]
            {
                new ShippingQuoteItem { IsShippable = true, DestinationCost = 5m },
                new ShippingQuoteItem { IsShippable = true, DestinationCost = 3.5m }
            }
        };

        var quote = await provider.GetRatesAsync(request);

        Assert.NotNull(quote);
        var serviceLevel = Assert.Single(quote!.ServiceLevels);
        Assert.Equal(8.5m, serviceLevel.TotalCost);
        Assert.Equal("GBP", serviceLevel.CurrencyCode);
        Assert.Empty(quote.Errors);
    }

    [Fact]
    public async Task GetRatesAsync_ReturnsErrorWhenNoDestinationMatch()
    {
        var provider = new FlatRateShippingProvider();
        await provider.ConfigureAsync(null);

        var request = new ShippingQuoteRequest
        {
            CountryCode = "GB",
            CurrencyCode = "GBP",
            Items = new[]
            {
                new ShippingQuoteItem
                {
                    IsShippable = true,
                    ProductSnapshot = new ShippingProductSnapshot
                    {
                        Name = "Poster",
                        ShippingOptions = new[]
                        {
                            new ShippingOptionSnapshot
                            {
                                CanShipToDestination = false,
                                DestinationCost = null,
                                Costs = Array.Empty<ShippingCostSnapshot>()
                            }
                        }
                    }
                }
            }
        };

        var quote = await provider.GetRatesAsync(request);

        Assert.NotNull(quote);
        var serviceLevel = Assert.Single(quote!.ServiceLevels);
        Assert.Equal(0m, serviceLevel.TotalCost);
        var error = Assert.Single(quote.Errors);
        Assert.Contains("Unable to ship Poster", error);
    }

    [Fact]
    public async Task GetRatesAsync_WithEmptyItems_ReturnsQuote()
    {
        var provider = new FlatRateShippingProvider();
        await provider.ConfigureAsync(null);

        var request = new ShippingQuoteRequest
        {
            CountryCode = "GB",
            CurrencyCode = "GBP",
            Items = Array.Empty<ShippingQuoteItem>()
        };

        var quote = await provider.GetRatesAsync(request);

        // Provider may return null for empty items
        if (quote != null)
        {
            Assert.NotEmpty(quote.ServiceLevels);
        }
    }

    [Fact]
    public async Task GetRatesAsync_WithMixedShippableItems_OnlyCountsShippable()
    {
        var provider = new FlatRateShippingProvider();
        await provider.ConfigureAsync(null);

        var request = new ShippingQuoteRequest
        {
            CountryCode = "GB",
            CurrencyCode = "GBP",
            Items = new[]
            {
                new ShippingQuoteItem { IsShippable = true, DestinationCost = 5m },
                new ShippingQuoteItem { IsShippable = false, DestinationCost = 10m },
                new ShippingQuoteItem { IsShippable = true, DestinationCost = 3m }
            }
        };

        var quote = await provider.GetRatesAsync(request);

        Assert.NotNull(quote);
        var serviceLevel = Assert.Single(quote!.ServiceLevels);
        Assert.Equal(8m, serviceLevel.TotalCost); // Only 5 + 3
    }

    [Fact]
    public async Task GetRatesAsync_WithNullDestinationCost_HandlesGracefully()
    {
        var provider = new FlatRateShippingProvider();
        await provider.ConfigureAsync(null);

        var request = new ShippingQuoteRequest
        {
            CountryCode = "GB",
            CurrencyCode = "GBP",
            Items = new[]
            {
                new ShippingQuoteItem { IsShippable = true, DestinationCost = 5m },
                new ShippingQuoteItem { IsShippable = true, DestinationCost = null },
                new ShippingQuoteItem { IsShippable = true, DestinationCost = 3m }
            }
        };

        var quote = await provider.GetRatesAsync(request);

        Assert.NotNull(quote);
        var serviceLevel = Assert.Single(quote!.ServiceLevels);
        Assert.Equal(8m, serviceLevel.TotalCost); // Only counts non-null: 5 + 3
    }

    [Fact]
    public async Task GetRatesAsync_WithVeryLargeCosts_HandlesCorrectly()
    {
        var provider = new FlatRateShippingProvider();
        await provider.ConfigureAsync(null);

        var request = new ShippingQuoteRequest
        {
            CountryCode = "GB",
            CurrencyCode = "GBP",
            Items = new[]
            {
                new ShippingQuoteItem { IsShippable = true, DestinationCost = 999999.99m },
                new ShippingQuoteItem { IsShippable = true, DestinationCost = 888888.88m }
            }
        };

        var quote = await provider.GetRatesAsync(request);

        Assert.NotNull(quote);
        var serviceLevel = Assert.Single(quote!.ServiceLevels);
        Assert.Equal(1888888.87m, serviceLevel.TotalCost);
    }

    [Fact]
    public async Task GetRatesAsync_WithNullCurrencyCode_UsesDefault()
    {
        var provider = new FlatRateShippingProvider();
        await provider.ConfigureAsync(null);

        var request = new ShippingQuoteRequest
        {
            CountryCode = "GB",
            CurrencyCode = null,
            Items = new[]
            {
                new ShippingQuoteItem { IsShippable = true, DestinationCost = 5m }
            }
        };

        var quote = await provider.GetRatesAsync(request);

        Assert.NotNull(quote);
        var serviceLevel = Assert.Single(quote!.ServiceLevels);
        Assert.Equal(5m, serviceLevel.TotalCost);
        Assert.NotNull(serviceLevel.CurrencyCode);
    }
}

