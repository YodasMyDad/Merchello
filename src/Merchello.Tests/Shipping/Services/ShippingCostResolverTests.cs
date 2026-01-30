using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shipping.Services;

public class ShippingCostResolverTests
{
    private readonly ShippingCostResolver _resolver = new();

    #region ResolveBaseCost - Priority Chain

    [Fact]
    public void ResolveBaseCost_StateMatch_TakesPriority()
    {
        // Arrange
        List<ShippingCost> costs =
        [
            CreateCost("*", 20m),
            CreateCost("US", 15m),
            CreateCost("US", 10m, "CA")
        ];

        // Act
        var result = _resolver.ResolveBaseCost(costs, "US", "CA", fixedCostFallback: 25m);

        // Assert
        result.ShouldBe(10m);
    }

    [Fact]
    public void ResolveBaseCost_CountryMatch_WhenNoStateMatch()
    {
        // Arrange
        List<ShippingCost> costs =
        [
            CreateCost("*", 20m),
            CreateCost("US", 15m),
            CreateCost("US", 10m, "CA")
        ];

        // Act
        var result = _resolver.ResolveBaseCost(costs, "US", "NY", fixedCostFallback: 25m);

        // Assert
        result.ShouldBe(15m);
    }

    [Fact]
    public void ResolveBaseCost_UniversalWildcard_WhenNoCountryMatch()
    {
        // Arrange
        List<ShippingCost> costs =
        [
            CreateCost("*", 20m),
            CreateCost("US", 15m)
        ];

        // Act
        var result = _resolver.ResolveBaseCost(costs, "GB", null, fixedCostFallback: 25m);

        // Assert
        result.ShouldBe(20m);
    }

    [Fact]
    public void ResolveBaseCost_FixedCostFallback_WhenNoCostsMatch()
    {
        // Arrange
        List<ShippingCost> costs =
        [
            CreateCost("US", 15m)
        ];

        // Act
        var result = _resolver.ResolveBaseCost(costs, "GB", null, fixedCostFallback: 25m);

        // Assert
        result.ShouldBe(25m);
    }

    [Fact]
    public void ResolveBaseCost_FixedCostFallback_WhenCostsEmpty()
    {
        // Act
        var result = _resolver.ResolveBaseCost([], "GB", null, fixedCostFallback: 9.99m);

        // Assert
        result.ShouldBe(9.99m);
    }

    [Fact]
    public void ResolveBaseCost_ReturnsNull_WhenNoCostsAndNoFallback()
    {
        // Act
        var result = _resolver.ResolveBaseCost([], "GB", null);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public void ResolveBaseCost_ReturnsNull_WhenNoMatchAndNoFallback()
    {
        // Arrange
        List<ShippingCost> costs =
        [
            CreateCost("US", 15m)
        ];

        // Act
        var result = _resolver.ResolveBaseCost(costs, "GB", null);

        // Assert
        result.ShouldBeNull();
    }

    #endregion

    #region ResolveBaseCost - Case Insensitivity

    [Fact]
    public void ResolveBaseCost_CaseInsensitive_CountryCode()
    {
        // Arrange
        List<ShippingCost> costs =
        [
            CreateCost("US", 15m)
        ];

        // Act
        var result = _resolver.ResolveBaseCost(costs, "us", null);

        // Assert
        result.ShouldBe(15m);
    }

    [Fact]
    public void ResolveBaseCost_CaseInsensitive_StateCode()
    {
        // Arrange
        List<ShippingCost> costs =
        [
            CreateCost("US", 10m, "CA")
        ];

        // Act
        var result = _resolver.ResolveBaseCost(costs, "us", "ca");

        // Assert
        result.ShouldBe(10m);
    }

    #endregion

    #region ResolveBaseCost - Edge Cases

    [Fact]
    public void ResolveBaseCost_CountryMatchIgnoresStateCosts()
    {
        // Arrange - only a state-specific cost, no country-level cost
        List<ShippingCost> costs =
        [
            CreateCost("US", 10m, "CA")
        ];

        // Act - requesting US with no state
        var result = _resolver.ResolveBaseCost(costs, "US", null, fixedCostFallback: 20m);

        // Assert - should fall back to fixed cost since no country-level or wildcard match
        result.ShouldBe(20m);
    }

    [Fact]
    public void ResolveBaseCost_NullState_SkipsStatePriority()
    {
        // Arrange
        List<ShippingCost> costs =
        [
            CreateCost("US", 15m),
            CreateCost("US", 10m, "CA")
        ];

        // Act
        var result = _resolver.ResolveBaseCost(costs, "US", null);

        // Assert
        result.ShouldBe(15m);
    }

    [Fact]
    public void ResolveBaseCost_ZeroCost_ReturnsZero()
    {
        // Arrange
        List<ShippingCost> costs =
        [
            CreateCost("GB", 0m)
        ];

        // Act
        var result = _resolver.ResolveBaseCost(costs, "GB", null);

        // Assert
        result.ShouldBe(0m);
    }

    #endregion

    #region ResolveWeightTierSurcharge - Priority Chain

    [Fact]
    public void ResolveWeightTierSurcharge_StateTier_TakesPriority()
    {
        // Arrange
        List<ShippingWeightTier> tiers =
        [
            CreateTier("*", null, 0, null, 5m),
            CreateTier("US", null, 0, null, 10m),
            CreateTier("US", "CA", 0, null, 15m)
        ];

        // Act
        var result = _resolver.ResolveWeightTierSurcharge(tiers, 2m, "US", "CA");

        // Assert
        result.ShouldBe(15m);
    }

    [Fact]
    public void ResolveWeightTierSurcharge_CountryTier_WhenNoStateMatch()
    {
        // Arrange
        List<ShippingWeightTier> tiers =
        [
            CreateTier("*", null, 0, null, 5m),
            CreateTier("US", null, 0, null, 10m)
        ];

        // Act
        var result = _resolver.ResolveWeightTierSurcharge(tiers, 2m, "US", "NY");

        // Assert
        result.ShouldBe(10m);
    }

    [Fact]
    public void ResolveWeightTierSurcharge_UniversalTier_WhenNoCountryMatch()
    {
        // Arrange
        List<ShippingWeightTier> tiers =
        [
            CreateTier("*", null, 0, null, 5m),
            CreateTier("US", null, 0, null, 10m)
        ];

        // Act
        var result = _resolver.ResolveWeightTierSurcharge(tiers, 2m, "GB", null);

        // Assert
        result.ShouldBe(5m);
    }

    [Fact]
    public void ResolveWeightTierSurcharge_ReturnsZero_WhenNoTiers()
    {
        // Act
        var result = _resolver.ResolveWeightTierSurcharge([], 2m, "US", null);

        // Assert
        result.ShouldBe(0m);
    }

    [Fact]
    public void ResolveWeightTierSurcharge_ReturnsZero_WhenZeroWeight()
    {
        // Arrange
        List<ShippingWeightTier> tiers =
        [
            CreateTier("*", null, 0, null, 5m)
        ];

        // Act
        var result = _resolver.ResolveWeightTierSurcharge(tiers, 0m, "US", null);

        // Assert
        result.ShouldBe(0m);
    }

    #endregion

    #region ResolveWeightTierSurcharge - Weight Range Boundaries

    [Fact]
    public void ResolveWeightTierSurcharge_MinWeightInclusive()
    {
        // Arrange - tier from 5kg
        List<ShippingWeightTier> tiers =
        [
            CreateTier("*", null, 5m, 10m, 8m)
        ];

        // Act - exactly at min boundary
        var result = _resolver.ResolveWeightTierSurcharge(tiers, 5m, "US", null);

        // Assert
        result.ShouldBe(8m);
    }

    [Fact]
    public void ResolveWeightTierSurcharge_BelowMinWeight_NoSurcharge()
    {
        // Arrange
        List<ShippingWeightTier> tiers =
        [
            CreateTier("*", null, 5m, 10m, 8m)
        ];

        // Act
        var result = _resolver.ResolveWeightTierSurcharge(tiers, 4.99m, "US", null);

        // Assert
        result.ShouldBe(0m);
    }

    [Fact]
    public void ResolveWeightTierSurcharge_MaxWeightExclusive()
    {
        // Arrange - tier up to 10kg (exclusive)
        List<ShippingWeightTier> tiers =
        [
            CreateTier("*", null, 5m, 10m, 8m)
        ];

        // Act - exactly at max boundary
        var result = _resolver.ResolveWeightTierSurcharge(tiers, 10m, "US", null);

        // Assert
        result.ShouldBe(0m);
    }

    [Fact]
    public void ResolveWeightTierSurcharge_NullMaxWeight_Unlimited()
    {
        // Arrange - open-ended tier (no max)
        List<ShippingWeightTier> tiers =
        [
            CreateTier("*", null, 10m, null, 20m)
        ];

        // Act
        var result = _resolver.ResolveWeightTierSurcharge(tiers, 100m, "US", null);

        // Assert
        result.ShouldBe(20m);
    }

    #endregion

    #region GetTotalShippingCost

    [Fact]
    public void GetTotalShippingCost_BaseCostOnly_WhenNoWeight()
    {
        // Arrange
        var option = CreateShippingOption(fixedCost: 5.99m);

        // Act
        var result = _resolver.GetTotalShippingCost(option, "GB", null);

        // Assert
        result.ShouldBe(5.99m);
    }

    [Fact]
    public void GetTotalShippingCost_BasePlusWeightSurcharge()
    {
        // Arrange
        var option = CreateShippingOption(fixedCost: 5.99m);
        option.SetShippingWeightTiers(
        [
            CreateTier("*", null, 0, null, 3m)
        ]);

        // Act
        var result = _resolver.GetTotalShippingCost(option, "GB", null, weightKg: 2m);

        // Assert
        result.ShouldBe(8.99m);
    }

    [Fact]
    public void GetTotalShippingCost_DestinationCostOverridesFixedCost()
    {
        // Arrange
        var option = CreateShippingOption(fixedCost: 5.99m);
        option.SetShippingCosts(
        [
            CreateCost("US", 14.99m)
        ]);

        // Act
        var result = _resolver.GetTotalShippingCost(option, "US", null);

        // Assert
        result.ShouldBe(14.99m);
    }

    [Fact]
    public void GetTotalShippingCost_FallsBackToFixedCost_WhenNoDestinationMatch()
    {
        // Arrange - this is the path exercised after our seed data fix
        var option = CreateShippingOption(fixedCost: 5.99m);
        // No ShippingCosts at all — relies entirely on FixedCost

        // Act
        var result = _resolver.GetTotalShippingCost(option, "GB", null);

        // Assert
        result.ShouldBe(5.99m);
    }

    [Fact]
    public void GetTotalShippingCost_ReturnsNull_WhenNoBaseCostResolvable()
    {
        // Arrange
        var option = CreateShippingOption(fixedCost: null);

        // Act
        var result = _resolver.GetTotalShippingCost(option, "GB", null);

        // Assert
        result.ShouldBeNull();
    }

    #endregion

    #region Helpers

    private static ShippingCost CreateCost(string countryCode, decimal cost, string? stateCode = null) => new()
    {
        CountryCode = countryCode,
        StateOrProvinceCode = stateCode,
        Cost = cost
    };

    private static ShippingWeightTier CreateTier(
        string countryCode, string? stateCode,
        decimal minKg, decimal? maxKg, decimal surcharge) => new()
    {
        CountryCode = countryCode,
        StateOrProvinceCode = stateCode,
        MinWeightKg = minKg,
        MaxWeightKg = maxKg,
        Surcharge = surcharge
    };

    private static ShippingOption CreateShippingOption(decimal? fixedCost) => new()
    {
        Name = "Test Option",
        FixedCost = fixedCost
    };

    #endregion
}
