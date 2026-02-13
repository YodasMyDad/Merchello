using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.BuiltIn;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shipping.Services;
using Merchello.Core.Shipping.Services.Interfaces;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shipping;

public class FlatRateShippingProviderTests
{
    private static FlatRateShippingProvider CreateProvider()
    {
        var settings = Options.Create(new MerchelloSettings { StoreCurrencyCode = "GBP" });
        var exchangeRateCacheMock = new Mock<IExchangeRateCache>();
        exchangeRateCacheMock.Setup(x => x.GetRateQuoteAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ExchangeRateQuote(1m, DateTime.UtcNow, "mock"));
        var currencyServiceMock = new Mock<ICurrencyService>();
        currencyServiceMock.Setup(x => x.Round(It.IsAny<decimal>(), It.IsAny<string>()))
            .Returns((decimal amount, string _) => Math.Round(amount, 2));
        var postcodeMatcher = new PostcodeMatcher();
        return new FlatRateShippingProvider(settings, exchangeRateCacheMock.Object, currencyServiceMock.Object, postcodeMatcher);
    }

    private readonly FlatRateShippingProvider _provider = CreateProvider();

    #region Helper Methods

    private static ShippingQuoteRequest CreateRequest(
        decimal weightKg = 0,
        string countryCode = "GB",
        string? stateCode = null,
        string? postalCode = null,
        List<ShippingOptionSnapshot>? options = null)
    {
        var optionId = Guid.NewGuid();
        var defaultOptions = options ?? [CreateOption(optionId)];

        return new ShippingQuoteRequest
        {
            CountryCode = countryCode,
            RegionCode = stateCode,
            PostalCode = postalCode,
            CurrencyCode = "GBP",
            Items =
            [
                new ShippingQuoteItem
                {
                    IsShippable = true,
                    TotalWeightKg = weightKg,
                    ProductSnapshot = new ShippingProductSnapshot
                    {
                        ProductId = Guid.NewGuid(),
                        Name = "Test Product",
                        WeightKg = weightKg,
                        ShippingOptions = defaultOptions
                    }
                }
            ]
        };
    }

    private static ShippingOptionSnapshot CreateOption(
        Guid? id = null,
        string name = "Standard",
        List<ShippingCostSnapshot>? costs = null,
        List<ShippingWeightTierSnapshot>? tiers = null,
        List<ShippingPostcodeRuleSnapshot>? postcodeRules = null,
        bool canShip = true,
        decimal? destinationCost = null)
    {
        var resolvedDestinationCost = destinationCost;
        if (!resolvedDestinationCost.HasValue && costs is { Count: > 0 })
        {
            resolvedDestinationCost = costs[0].Cost;
        }

        return new ShippingOptionSnapshot
        {
            Id = id ?? Guid.NewGuid(),
            Name = name,
            DaysFrom = 3,
            DaysTo = 5,
            CanShipToDestination = canShip,
            DestinationCost = resolvedDestinationCost,
            Costs = costs ?? [],
            WeightTiers = tiers ?? [],
            PostcodeRules = postcodeRules ?? []
        };
    }

    private static ShippingCostSnapshot CreateCost(
        string countryCode,
        decimal cost,
        string? stateCode = null)
    {
        return new ShippingCostSnapshot
        {
            CountryCode = countryCode,
            RegionCode = stateCode,
            Cost = cost
        };
    }

    private static ShippingWeightTierSnapshot CreateTier(
        string countryCode,
        decimal minKg,
        decimal? maxKg,
        decimal surcharge,
        string? stateCode = null)
    {
        return new ShippingWeightTierSnapshot
        {
            CountryCode = countryCode,
            RegionCode = stateCode,
            MinWeightKg = minKg,
            MaxWeightKg = maxKg,
            Surcharge = surcharge
        };
    }

    private static ShippingPostcodeRuleSnapshot CreatePostcodeRule(
        string countryCode,
        string pattern,
        PostcodeMatchType matchType,
        PostcodeRuleAction action,
        decimal surcharge = 0m)
    {
        return new ShippingPostcodeRuleSnapshot
        {
            CountryCode = countryCode,
            Pattern = pattern,
            MatchType = matchType,
            Action = action,
            Surcharge = surcharge
        };
    }

    #endregion

    #region ResolveWeightTierSurcharge Tests

    [Fact]
    public async Task GetRates_NoWeightTiers_ReturnsBaseCostOnly()
    {
        // Arrange
        var option = CreateOption(costs: [CreateCost("GB", 10m)], tiers: []);
        var request = CreateRequest(weightKg: 5m, options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(10m);
    }

    [Fact]
    public async Task GetRates_ZeroWeight_NoSurchargeApplied()
    {
        // Arrange
        var option = CreateOption(
            costs: [CreateCost("GB", 10m)],
            tiers: [CreateTier("GB", 0m, 5m, 5m)]);
        var request = CreateRequest(weightKg: 0m, options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(10m); // No surcharge for 0 weight
    }

    [Fact]
    public async Task GetRates_WeightWithinTier_AddsSurcharge()
    {
        // Arrange
        var option = CreateOption(
            costs: [CreateCost("GB", 10m)],
            tiers: [CreateTier("GB", 0m, 10m, 5m)]);
        var request = CreateRequest(weightKg: 5m, options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(15m); // 10 + 5 surcharge
    }

    [Fact]
    public async Task GetRates_WeightAtMinBoundary_IncludesTier()
    {
        // Arrange - MinWeightKg is inclusive
        var option = CreateOption(
            costs: [CreateCost("GB", 10m)],
            tiers: [CreateTier("GB", 5m, 10m, 3m)]);
        var request = CreateRequest(weightKg: 5m, options: [option]); // Exactly at min

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(13m); // Tier applies
    }

    [Fact]
    public async Task GetRates_WeightAtMaxBoundary_ExcludesTier()
    {
        // Arrange - MaxWeightKg is exclusive
        var option = CreateOption(
            costs: [CreateCost("GB", 10m)],
            tiers: [CreateTier("GB", 0m, 5m, 3m)]);
        var request = CreateRequest(weightKg: 5m, options: [option]); // Exactly at max

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(10m); // Tier does NOT apply
    }

    [Fact]
    public async Task GetRates_NullMaxWeight_TreatsAsUnlimited()
    {
        // Arrange
        var option = CreateOption(
            costs: [CreateCost("GB", 10m)],
            tiers: [CreateTier("GB", 20m, null, 15m)]); // 20kg+ tier
        var request = CreateRequest(weightKg: 100m, options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(25m); // Applies to any weight >= 20
    }

    [Fact]
    public async Task GetRates_StateTierPriority_BeatsCountryTier()
    {
        // Arrange
        var option = CreateOption(
            costs: [CreateCost("US", 10m)],
            tiers:
            [
                CreateTier("US", 0m, 10m, 5m),              // Country tier
                CreateTier("US", 0m, 10m, 8m, "CA")         // State tier (higher priority)
            ]);
        var request = CreateRequest(weightKg: 5m, countryCode: "US", stateCode: "CA", options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(18m); // Uses state tier (8), not country (5)
    }

    [Fact]
    public async Task GetRates_CountryTierPriority_BeatsUniversalTier()
    {
        // Arrange
        var option = CreateOption(
            costs: [CreateCost("GB", 10m)],
            tiers:
            [
                CreateTier("*", 0m, 10m, 2m),              // Universal tier
                CreateTier("GB", 0m, 10m, 5m)              // Country tier (higher priority)
            ]);
        var request = CreateRequest(weightKg: 5m, options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(15m); // Uses country tier (5), not universal (2)
    }

    [Fact]
    public async Task GetRates_CaseInsensitiveCountryMatching()
    {
        // Arrange
        var option = CreateOption(
            costs: [CreateCost("gb", 10m)],  // lowercase
            tiers: [CreateTier("GB", 0m, 10m, 5m)]);  // uppercase
        var request = CreateRequest(weightKg: 5m, countryCode: "Gb", options: [option]); // mixed

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(15m);
    }

    [Fact]
    public async Task GetRates_WeightExceedsAllTiers_NoSurcharge()
    {
        // Arrange
        var option = CreateOption(
            costs: [CreateCost("GB", 10m)],
            tiers:
            [
                CreateTier("GB", 0m, 5m, 2m),
                CreateTier("GB", 5m, 10m, 5m)
                // No tier for 10kg+
            ]);
        var request = CreateRequest(weightKg: 15m, options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(10m); // No matching tier
    }

    #endregion

    #region ResolveBaseCost Tests

    [Fact]
    public async Task GetRates_NoCosts_ReturnsErrorAndNoServiceLevel()
    {
        // Arrange
        var option = CreateOption(costs: [], tiers: []);
        var request = CreateRequest(options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.ShouldBeEmpty();
        quote.Errors.ShouldContain(e => e.Contains("No base shipping cost"));
    }

    [Fact]
    public async Task GetRates_UsesPreResolvedDestinationCost()
    {
        // Arrange
        var option = CreateOption(
            costs: [CreateCost("GB", 99m)],
            destinationCost: 7.5m);
        var request = CreateRequest(countryCode: "GB", options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.Count.ShouldBe(1);
        quote.ServiceLevels.First().TotalCost.ShouldBe(7.5m);
    }

    [Fact]
    public async Task GetRates_ExactStateMatch_UsesStateCost()
    {
        // Arrange
        var option = CreateOption(costs:
        [
            CreateCost("US", 15m),           // Country level
            CreateCost("US", 12m, "CA")      // State level
        ], destinationCost: 12m);
        var request = CreateRequest(countryCode: "US", stateCode: "CA", options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(12m);
    }

    [Fact]
    public async Task GetRates_NoStateMatch_FallsBackToCountry()
    {
        // Arrange
        var option = CreateOption(costs:
        [
            CreateCost("US", 15m),           // Country level
            CreateCost("US", 12m, "CA")      // State level (different state)
        ]);
        var request = CreateRequest(countryCode: "US", stateCode: "NY", options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(15m); // Falls back to country
    }

    [Fact]
    public async Task GetRates_NoCountryMatch_FallsBackToUniversal()
    {
        // Arrange
        var option = CreateOption(costs:
        [
            CreateCost("*", 20m),            // Universal
            CreateCost("US", 15m)            // Different country
        ]);
        var request = CreateRequest(countryCode: "GB", options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(20m); // Falls back to universal
    }

    [Fact]
    public async Task GetRates_ZeroCost_ReturnsFreeShipping()
    {
        // Arrange
        var option = CreateOption(costs: [CreateCost("GB", 0m)]);
        var request = CreateRequest(options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(0m);
    }

    [Fact]
    public async Task GetRates_CostPriority_StateOverCountryOverUniversal()
    {
        // Arrange
        var option = CreateOption(costs:
        [
            CreateCost("*", 25m),            // Universal (priority 3)
            CreateCost("US", 20m),           // Country (priority 2)
            CreateCost("US", 15m, "CA")      // State (priority 1)
        ], destinationCost: 15m);
        var request = CreateRequest(countryCode: "US", stateCode: "CA", options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(15m); // Uses state cost
    }

    #endregion

    #region FindCommonShippingOptions Tests

    [Fact]
    public async Task GetRates_NoShippableItems_ReturnsNull()
    {
        // Arrange
        var request = new ShippingQuoteRequest
        {
            CountryCode = "GB",
            Items = [new ShippingQuoteItem { IsShippable = false }]
        };

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldBeNull();
    }

    [Fact]
    public async Task GetRates_SingleItem_ReturnsAllItsOptions()
    {
        // Arrange
        var option1 = CreateOption(name: "Standard", costs: [CreateCost("GB", 5m)]);
        var option2 = CreateOption(name: "Express", costs: [CreateCost("GB", 10m)]);
        var request = CreateRequest(options: [option1, option2]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.Count.ShouldBe(2);
    }

    [Fact]
    public async Task GetRates_MultipleItems_ReturnsIntersection()
    {
        // Arrange
        var sharedOptionId = Guid.NewGuid();
        var option1Only = CreateOption(name: "Option1Only", costs: [CreateCost("GB", 5m)]);
        var sharedOption = CreateOption(id: sharedOptionId, name: "Shared", costs: [CreateCost("GB", 8m)]);

        var request = new ShippingQuoteRequest
        {
            CountryCode = "GB",
            Items =
            [
                new ShippingQuoteItem
                {
                    IsShippable = true,
                    ProductSnapshot = new ShippingProductSnapshot
                    {
                        ShippingOptions = [option1Only, sharedOption]
                    }
                },
                new ShippingQuoteItem
                {
                    IsShippable = true,
                    ProductSnapshot = new ShippingProductSnapshot
                    {
                        ShippingOptions = [sharedOption] // Only shared option
                    }
                }
            ]
        };

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.Count.ShouldBe(1);
        quote.ServiceLevels.First().ServiceName.ShouldBe("Shared");
    }

    [Fact]
    public async Task GetRates_NoCommonOptions_ReturnsEmptyWithError()
    {
        // Arrange
        var option1 = CreateOption(name: "Option1", costs: [CreateCost("GB", 5m)]);
        var option2 = CreateOption(name: "Option2", costs: [CreateCost("GB", 8m)]);

        var request = new ShippingQuoteRequest
        {
            CountryCode = "GB",
            Items =
            [
                new ShippingQuoteItem
                {
                    IsShippable = true,
                    ProductSnapshot = new ShippingProductSnapshot { ShippingOptions = [option1] }
                },
                new ShippingQuoteItem
                {
                    IsShippable = true,
                    ProductSnapshot = new ShippingProductSnapshot { ShippingOptions = [option2] }
                }
            ]
        };

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.ShouldBeEmpty();
        quote.Errors.ShouldContain(e => e.Contains("No shipping options available"));
    }

    [Fact]
    public async Task GetRates_CannotShipToDestination_FiltersOut()
    {
        // Arrange
        var canShip = CreateOption(name: "Available", costs: [CreateCost("GB", 5m)], canShip: true);
        var cannotShip = CreateOption(name: "Unavailable", costs: [CreateCost("GB", 8m)], canShip: false);
        var request = CreateRequest(options: [canShip, cannotShip]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.Count.ShouldBe(1);
        quote.ServiceLevels.First().ServiceName.ShouldBe("Available");
    }

    #endregion

    #region GetRatesAsync Integration Tests

    [Fact]
    public async Task GetRates_MultipleOptions_SortedByCost()
    {
        // Arrange
        var expensive = CreateOption(name: "Express", costs: [CreateCost("GB", 15m)]);
        var cheap = CreateOption(name: "Economy", costs: [CreateCost("GB", 5m)]);
        var medium = CreateOption(name: "Standard", costs: [CreateCost("GB", 10m)]);
        var request = CreateRequest(options: [expensive, cheap, medium]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        var levels = quote.ServiceLevels.ToList();
        levels[0].TotalCost.ShouldBe(5m);   // Economy first
        levels[1].TotalCost.ShouldBe(10m);  // Standard second
        levels[2].TotalCost.ShouldBe(15m);  // Express last
    }

    [Fact]
    public async Task GetRates_ServiceCode_ContainsOptionId()
    {
        // Arrange
        var optionId = Guid.NewGuid();
        var option = CreateOption(id: optionId, costs: [CreateCost("GB", 10m)]);
        var request = CreateRequest(options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().ServiceCode.ShouldBe($"flat-{optionId}");
    }

    [Fact]
    public async Task GetRates_ExtendedProperties_ContainsShippingOptionId()
    {
        // Arrange
        var optionId = Guid.NewGuid();
        var option = CreateOption(id: optionId, costs: [CreateCost("GB", 10m)]);
        var request = CreateRequest(options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        var props = quote.ServiceLevels.First().ExtendedProperties;
        props.ShouldNotBeNull();
        props.ShouldContainKey("ShippingOptionId");
        props["ShippingOptionId"].ShouldBe(optionId.ToString());
    }

    [Fact]
    public async Task GetRates_NegativeCostAfterCalculation_ClampsToZero()
    {
        // Arrange - Edge case: if somehow cost goes negative
        var option = CreateOption(costs: [CreateCost("GB", -5m)]); // Invalid but possible data
        var request = CreateRequest(options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(0m); // Clamped to 0
    }

    [Fact]
    public async Task GetRates_CompleteScenario_BasePlusWeightSurcharge()
    {
        // Arrange - Real-world scenario
        var option = CreateOption(
            name: "Standard Delivery",
            costs:
            [
                CreateCost("*", 15m),        // Universal base
                CreateCost("GB", 5m),        // UK base
                CreateCost("GB", 3m, "LON")  // London base
            ],
            tiers:
            [
                CreateTier("*", 0m, 5m, 0m),     // 0-5kg: no surcharge
                CreateTier("*", 5m, 10m, 3m),    // 5-10kg: £3 surcharge
                CreateTier("*", 10m, null, 8m),  // 10kg+: £8 surcharge
                CreateTier("GB", 5m, 10m, 2m)    // UK-specific: 5-10kg only £2
            ],
            destinationCost: 3m);
        var request = CreateRequest(
            weightKg: 7.5m,
            countryCode: "GB",
            stateCode: "LON",
            options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert
        // Base: £3 (London) + Weight surcharge: £2 (UK tier for 5-10kg) = £5
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(5m);
    }

    [Fact]
    public async Task GetRates_IsAvailableFor_ReturnsTrueForShippableItems()
    {
        // Arrange
        var request = CreateRequest(options: [CreateOption(costs: [CreateCost("GB", 10m)])]);

        // Act
        var isAvailable = _provider.IsAvailableFor(request);

        // Assert
        isAvailable.ShouldBeTrue();
    }

    [Fact]
    public async Task GetRates_IsAvailableFor_ReturnsFalseForNoShippableItems()
    {
        // Arrange
        var request = new ShippingQuoteRequest
        {
            CountryCode = "GB",
            Items = [new ShippingQuoteItem { IsShippable = false }]
        };

        // Act
        var isAvailable = _provider.IsAvailableFor(request);

        // Assert
        isAvailable.ShouldBeFalse();
    }

    [Fact]
    public void Metadata_HasCorrectValues()
    {
        // Assert
        _provider.Metadata.Key.ShouldBe("flat-rate");
        _provider.Metadata.DisplayName.ShouldBe("Flat Rate Shipping");
        _provider.Metadata.SupportsRealTimeRates.ShouldBeFalse();
        _provider.Metadata.SupportsDeliveryDateSelection.ShouldBeTrue();
    }

    #endregion

    #region Postcode Rule Tests

    [Fact]
    public async Task GetRates_BlockedPostcode_ExcludesOption()
    {
        // Arrange - Block Isle of Man
        var option = CreateOption(
            costs: [CreateCost("GB", 10m)],
            postcodeRules: [
                CreatePostcodeRule("GB", "IM", PostcodeMatchType.Prefix, PostcodeRuleAction.Block)
            ]);
        var request = CreateRequest(
            countryCode: "GB",
            postalCode: "IM1 1AA",
            options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert - Option should be blocked (no service levels)
        quote.ShouldNotBeNull();
        quote.ServiceLevels.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetRates_NonBlockedPostcode_IncludesOption()
    {
        // Arrange - Block Isle of Man, but ship to London
        var option = CreateOption(
            costs: [CreateCost("GB", 10m)],
            postcodeRules: [
                CreatePostcodeRule("GB", "IM", PostcodeMatchType.Prefix, PostcodeRuleAction.Block)
            ]);
        var request = CreateRequest(
            countryCode: "GB",
            postalCode: "SW1A 1AA",
            options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert - Option should be available
        quote.ShouldNotBeNull();
        quote.ServiceLevels.Count.ShouldBe(1);
        quote.ServiceLevels.First().TotalCost.ShouldBe(10m);
    }

    [Fact]
    public async Task GetRates_PostcodeSurcharge_AddsSurcharge()
    {
        // Arrange - Northern Ireland surcharge
        var option = CreateOption(
            costs: [CreateCost("GB", 10m)],
            postcodeRules: [
                CreatePostcodeRule("GB", "BT", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 12.50m)
            ]);
        var request = CreateRequest(
            countryCode: "GB",
            postalCode: "BT1 5AA",
            options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert - Base + surcharge
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(22.50m); // 10 + 12.50
    }

    [Fact]
    public async Task GetRates_PostcodeSurchargeStacksWithWeight_AddsBoth()
    {
        // Arrange - Highland surcharge + weight tier
        var option = CreateOption(
            costs: [CreateCost("GB", 10m)],
            tiers: [CreateTier("GB", 5m, 10m, 5m)],  // 5-10kg weight surcharge
            postcodeRules: [
                CreatePostcodeRule("GB", "IV", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 8m)
            ]);
        var request = CreateRequest(
            weightKg: 7m,  // Triggers weight tier
            countryCode: "GB",
            postalCode: "IV25 1AB",
            options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert - Base + weight + postcode
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(23m); // 10 + 5 + 8
    }

    [Fact]
    public async Task GetRates_NoPostcodeProvided_SkipsRulesReturnsNormalRate()
    {
        // Arrange - Highland surcharge configured
        var option = CreateOption(
            costs: [CreateCost("GB", 10m)],
            postcodeRules: [
                CreatePostcodeRule("GB", "IV", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 8m)
            ]);
        var request = CreateRequest(
            countryCode: "GB",
            postalCode: null,  // No postcode provided
            options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert - Rules skipped, normal rate returned
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(10m);
    }

    [Fact]
    public async Task GetRates_UkOutcodeRange_BlocksWithinRange()
    {
        // Arrange - Block Scottish Highlands IV21-IV28
        var option = CreateOption(
            costs: [CreateCost("GB", 10m)],
            postcodeRules: [
                CreatePostcodeRule("GB", "IV21-IV28", PostcodeMatchType.OutcodeRange, PostcodeRuleAction.Block)
            ]);

        // Act - Within range
        var request1 = CreateRequest(countryCode: "GB", postalCode: "IV25 1AB", options: [option]);
        var quote1 = await _provider.GetRatesAsync(request1);

        // Assert - Blocked
        quote1.ShouldNotBeNull();
        quote1.ServiceLevels.ShouldBeEmpty();

        // Act - Outside range
        var request2 = CreateRequest(countryCode: "GB", postalCode: "IV10 1AB", options: [option]);
        var quote2 = await _provider.GetRatesAsync(request2);

        // Assert - Not blocked
        quote2.ShouldNotBeNull();
        quote2.ServiceLevels.Count.ShouldBe(1);
    }

    [Fact]
    public async Task GetRates_NumericRange_AppliesSurcharge()
    {
        // Arrange - Alaska (996xx-997xx) surcharge
        var option = CreateOption(
            costs: [CreateCost("US", 15m)],
            postcodeRules: [
                CreatePostcodeRule("US", "99600-99799", PostcodeMatchType.NumericRange, PostcodeRuleAction.Surcharge, 25m)
            ]);

        // Act - Alaska zip
        var request = CreateRequest(
            countryCode: "US",
            postalCode: "99701",
            options: [option]);
        var quote = await _provider.GetRatesAsync(request);

        // Assert - Base + surcharge
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(40m); // 15 + 25
    }

    [Fact]
    public async Task GetRates_WrongCountryRule_DoesNotApply()
    {
        // Arrange - GB rule applied to US postcode
        var option = CreateOption(
            costs: [CreateCost("US", 15m)],
            postcodeRules: [
                CreatePostcodeRule("GB", "IM", PostcodeMatchType.Prefix, PostcodeRuleAction.Block)
            ]);
        var request = CreateRequest(
            countryCode: "US",
            postalCode: "IM123", // Looks like IM prefix but country is US
            options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert - Rule doesn't apply (different country)
        quote.ShouldNotBeNull();
        quote.ServiceLevels.Count.ShouldBe(1);
        quote.ServiceLevels.First().TotalCost.ShouldBe(15m);
    }

    [Fact]
    public async Task GetRates_MultipleRulesSpecificity_MostSpecificWins()
    {
        // Arrange - Overlapping rules with different specificity
        var option = CreateOption(
            costs: [CreateCost("GB", 10m)],
            postcodeRules: [
                CreatePostcodeRule("GB", "IV", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 5m),   // Less specific
                CreatePostcodeRule("GB", "IV21-IV28", PostcodeMatchType.OutcodeRange, PostcodeRuleAction.Surcharge, 15m), // More specific
            ]);
        var request = CreateRequest(
            countryCode: "GB",
            postalCode: "IV25 1AB",  // Matches both rules
            options: [option]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert - Range is more specific, so 15m surcharge wins
        quote.ShouldNotBeNull();
        quote.ServiceLevels.First().TotalCost.ShouldBe(25m); // 10 + 15
    }

    [Fact]
    public async Task GetRates_BlockedPostcodeMultipleOptions_ExcludesOnlyBlocked()
    {
        // Arrange - Two options, only one is blocked for IM postcodes
        var blocked = CreateOption(
            name: "Standard",
            costs: [CreateCost("GB", 5m)],
            postcodeRules: [
                CreatePostcodeRule("GB", "IM", PostcodeMatchType.Prefix, PostcodeRuleAction.Block)
            ]);
        var available = CreateOption(
            name: "Express",
            costs: [CreateCost("GB", 15m)]);  // No postcode rules

        var request = CreateRequest(
            countryCode: "GB",
            postalCode: "IM1 1AA",
            options: [blocked, available]);

        // Act
        var quote = await _provider.GetRatesAsync(request);

        // Assert - Only Express is available
        quote.ShouldNotBeNull();
        quote.ServiceLevels.Count.ShouldBe(1);
        quote.ServiceLevels.First().ServiceName.ShouldBe("Express");
    }

    [Fact]
    public async Task GetRates_ExactMatchBlock_BlocksSpecificPostcode()
    {
        // Arrange - Block exact postcode
        var option = CreateOption(
            costs: [CreateCost("GB", 10m)],
            postcodeRules: [
                CreatePostcodeRule("GB", "IV27 4AA", PostcodeMatchType.Exact, PostcodeRuleAction.Block)
            ]);

        // Act - Exact match
        var request1 = CreateRequest(countryCode: "GB", postalCode: "IV27 4AA", options: [option]);
        var quote1 = await _provider.GetRatesAsync(request1);

        // Assert - Blocked
        quote1.ShouldNotBeNull();
        quote1.ServiceLevels.ShouldBeEmpty();

        // Act - Different postcode in same area
        var request2 = CreateRequest(countryCode: "GB", postalCode: "IV27 4AB", options: [option]);
        var quote2 = await _provider.GetRatesAsync(request2);

        // Assert - Not blocked
        quote2.ShouldNotBeNull();
        quote2.ServiceLevels.Count.ShouldBe(1);
    }

    #endregion
}

