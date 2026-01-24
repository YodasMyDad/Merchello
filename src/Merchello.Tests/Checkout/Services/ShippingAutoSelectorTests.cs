using Merchello.Core.Checkout.Services;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shared.Providers;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout.Services;

/// <summary>
/// Unit tests for ShippingAutoSelector.
/// Tests auto-selection strategies, combined total calculation,
/// group application, and previous selection validation.
/// </summary>
public class ShippingAutoSelectorTests
{
    #region SelectOptions - Cheapest Strategy

    [Fact]
    public void SelectOptions_Cheapest_SelectsCheapestOption()
    {
        var groupId = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateOption(cost: 15m, daysTo: 3, providerKey: "fedex", serviceCode: "EXPRESS"),
                CreateOption(cost: 5m, daysTo: 7, providerKey: "fedex", serviceCode: "GROUND"),
                CreateOption(cost: 25m, daysTo: 1, providerKey: "ups", serviceCode: "01"))
        };

        var selections = ShippingAutoSelector.SelectOptions(groups, ShippingAutoSelectStrategy.Cheapest);

        selections.Count.ShouldBe(1);
        selections[groupId].ShouldBe("dyn:fedex:GROUND");
    }

    [Fact]
    public void SelectOptions_Cheapest_TieBreaker_SelectsFasterDelivery()
    {
        var groupId = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateOption(cost: 10m, daysTo: 7, providerKey: "ups", serviceCode: "03"),
                CreateOption(cost: 10m, daysTo: 3, providerKey: "fedex", serviceCode: "EXPRESS"),
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND"))
        };

        var selections = ShippingAutoSelector.SelectOptions(groups, ShippingAutoSelectStrategy.Cheapest);

        selections[groupId].ShouldBe("dyn:fedex:EXPRESS"); // Same cost, fastest delivery
    }

    [Fact]
    public void SelectOptions_Cheapest_EmptyOptions_NoSelection()
    {
        var groupId = Guid.NewGuid();
        var groups = new[] { CreateGroup(groupId) }; // No options

        var selections = ShippingAutoSelector.SelectOptions(groups, ShippingAutoSelectStrategy.Cheapest);

        selections.ShouldBeEmpty();
    }

    [Fact]
    public void SelectOptions_Cheapest_MultipleGroups_SelectsPerGroup()
    {
        var groupId1 = Guid.NewGuid();
        var groupId2 = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId1,
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND"),
                CreateOption(cost: 20m, daysTo: 2, providerKey: "fedex", serviceCode: "EXPRESS")),
            CreateGroup(groupId2,
                CreateOption(cost: 8m, daysTo: 7, providerKey: "ups", serviceCode: "03"),
                CreateOption(cost: 30m, daysTo: 1, providerKey: "ups", serviceCode: "01"))
        };

        var selections = ShippingAutoSelector.SelectOptions(groups, ShippingAutoSelectStrategy.Cheapest);

        selections.Count.ShouldBe(2);
        selections[groupId1].ShouldBe("dyn:fedex:GROUND");
        selections[groupId2].ShouldBe("dyn:ups:03");
    }

    [Fact]
    public void SelectOptions_DefaultStrategy_IsCheapest()
    {
        var groupId = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateOption(cost: 20m, daysTo: 2, providerKey: "fedex", serviceCode: "EXPRESS"),
                CreateOption(cost: 5m, daysTo: 7, providerKey: "fedex", serviceCode: "GROUND"))
        };

        // No strategy specified - should default to Cheapest
        var selections = ShippingAutoSelector.SelectOptions(groups);

        selections[groupId].ShouldBe("dyn:fedex:GROUND");
    }

    #endregion

    #region SelectOptions - Fastest Strategy

    [Fact]
    public void SelectOptions_Fastest_SelectsFastestOption()
    {
        var groupId = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateOption(cost: 5m, daysTo: 7, providerKey: "fedex", serviceCode: "GROUND"),
                CreateOption(cost: 25m, daysTo: 1, providerKey: "ups", serviceCode: "01"),
                CreateOption(cost: 15m, daysTo: 3, providerKey: "fedex", serviceCode: "EXPRESS"))
        };

        var selections = ShippingAutoSelector.SelectOptions(groups, ShippingAutoSelectStrategy.Fastest);

        selections[groupId].ShouldBe("dyn:ups:01"); // DaysTo=1
    }

    [Fact]
    public void SelectOptions_Fastest_TieBreaker_SelectsCheaperCost()
    {
        var groupId = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateOption(cost: 30m, daysTo: 2, providerKey: "ups", serviceCode: "02"),
                CreateOption(cost: 25m, daysTo: 2, providerKey: "fedex", serviceCode: "2DAY"),
                CreateOption(cost: 35m, daysTo: 2, providerKey: "fedex", serviceCode: "EXPRESS"))
        };

        var selections = ShippingAutoSelector.SelectOptions(groups, ShippingAutoSelectStrategy.Fastest);

        selections[groupId].ShouldBe("dyn:fedex:2DAY"); // Same speed, cheapest
    }

    #endregion

    #region SelectOptions - CheapestThenFastest Strategy

    [Fact]
    public void SelectOptions_CheapestThenFastest_SelectsFastestAmongCheapest()
    {
        var groupId = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateOption(cost: 10m, daysTo: 7, providerKey: "fedex", serviceCode: "GROUND"),
                CreateOption(cost: 10m, daysTo: 3, providerKey: "ups", serviceCode: "03"),
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "HOME"),
                CreateOption(cost: 20m, daysTo: 1, providerKey: "ups", serviceCode: "01"))
        };

        var selections = ShippingAutoSelector.SelectOptions(groups, ShippingAutoSelectStrategy.CheapestThenFastest);

        // Cheapest cost is $10, fastest among $10 options is DaysTo=3
        selections[groupId].ShouldBe("dyn:ups:03");
    }

    [Fact]
    public void SelectOptions_CheapestThenFastest_OnlyCheapest_SelectsIt()
    {
        var groupId = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateOption(cost: 5m, daysTo: 7, providerKey: "fedex", serviceCode: "GROUND"),
                CreateOption(cost: 15m, daysTo: 3, providerKey: "fedex", serviceCode: "EXPRESS"))
        };

        var selections = ShippingAutoSelector.SelectOptions(groups, ShippingAutoSelectStrategy.CheapestThenFastest);

        selections[groupId].ShouldBe("dyn:fedex:GROUND"); // Only one at cheapest cost
    }

    #endregion

    #region SelectOptions - Flat-Rate Options

    [Fact]
    public void SelectOptions_Cheapest_WithFlatRate_SelectsCheapestFlatRate()
    {
        var groupId = Guid.NewGuid();
        var cheapId = Guid.NewGuid();
        var expensiveId = Guid.NewGuid();

        var groups = new[]
        {
            CreateGroup(groupId,
                CreateFlatRateOption(cheapId, "Economy", cost: 3m, daysTo: 10),
                CreateFlatRateOption(expensiveId, "Express", cost: 15m, daysTo: 2))
        };

        var selections = ShippingAutoSelector.SelectOptions(groups, ShippingAutoSelectStrategy.Cheapest);

        selections[groupId].ShouldBe($"so:{cheapId}");
    }

    [Fact]
    public void SelectOptions_Fastest_WithMixedOptions_SelectsFastest()
    {
        var groupId = Guid.NewGuid();
        var flatRateId = Guid.NewGuid();

        var groups = new[]
        {
            CreateGroup(groupId,
                CreateFlatRateOption(flatRateId, "Next Day", cost: 15m, daysTo: 1, isNextDay: true),
                CreateOption(cost: 10m, daysTo: 3, providerKey: "fedex", serviceCode: "EXPRESS"),
                CreateOption(cost: 5m, daysTo: 7, providerKey: "fedex", serviceCode: "GROUND"))
        };

        var selections = ShippingAutoSelector.SelectOptions(groups, ShippingAutoSelectStrategy.Fastest);

        selections[groupId].ShouldBe($"so:{flatRateId}"); // DaysTo=1 is fastest
    }

    #endregion

    #region CalculateCombinedTotal

    [Fact]
    public void CalculateCombinedTotal_SingleGroup_ReturnsOptionCost()
    {
        var groupId = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateOption(cost: 12.99m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND"))
        };
        var selections = new Dictionary<Guid, string>
        {
            [groupId] = "dyn:fedex:GROUND"
        };

        var total = ShippingAutoSelector.CalculateCombinedTotal(groups, selections);

        total.ShouldBe(12.99m);
    }

    [Fact]
    public void CalculateCombinedTotal_MultipleGroups_SumsCosts()
    {
        var groupId1 = Guid.NewGuid();
        var groupId2 = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId1,
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND"),
                CreateOption(cost: 20m, daysTo: 2, providerKey: "fedex", serviceCode: "EXPRESS")),
            CreateGroup(groupId2,
                CreateOption(cost: 8m, daysTo: 7, providerKey: "ups", serviceCode: "03"))
        };
        var selections = new Dictionary<Guid, string>
        {
            [groupId1] = "dyn:fedex:EXPRESS",
            [groupId2] = "dyn:ups:03"
        };

        var total = ShippingAutoSelector.CalculateCombinedTotal(groups, selections);

        total.ShouldBe(28m); // 20 + 8
    }

    [Fact]
    public void CalculateCombinedTotal_NoSelections_ReturnsZero()
    {
        var groups = new[]
        {
            CreateGroup(Guid.NewGuid(),
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND"))
        };
        var selections = new Dictionary<Guid, string>();

        var total = ShippingAutoSelector.CalculateCombinedTotal(groups, selections);

        total.ShouldBe(0m);
    }

    [Fact]
    public void CalculateCombinedTotal_InvalidSelectionKey_SkipsGroup()
    {
        var groupId = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND"))
        };
        var selections = new Dictionary<Guid, string>
        {
            [groupId] = "dyn:ups:NONEXISTENT" // Not in available options
        };

        var total = ShippingAutoSelector.CalculateCombinedTotal(groups, selections);

        total.ShouldBe(0m);
    }

    #endregion

    #region ApplySelectionsToGroups

    [Fact]
    public void ApplySelectionsToGroups_SetsSelectedShippingOptionId()
    {
        var groupId = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND"))
        };
        var selections = new Dictionary<Guid, string>
        {
            [groupId] = "dyn:fedex:GROUND"
        };

        ShippingAutoSelector.ApplySelectionsToGroups(groups, selections);

        groups[0].SelectedShippingOptionId.ShouldBe("dyn:fedex:GROUND");
    }

    [Fact]
    public void ApplySelectionsToGroups_MultipleGroups_SetsAll()
    {
        var groupId1 = Guid.NewGuid();
        var groupId2 = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId1,
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND")),
            CreateGroup(groupId2,
                CreateOption(cost: 8m, daysTo: 7, providerKey: "ups", serviceCode: "03"))
        };
        var selections = new Dictionary<Guid, string>
        {
            [groupId1] = "dyn:fedex:GROUND",
            [groupId2] = "dyn:ups:03"
        };

        ShippingAutoSelector.ApplySelectionsToGroups(groups, selections);

        groups[0].SelectedShippingOptionId.ShouldBe("dyn:fedex:GROUND");
        groups[1].SelectedShippingOptionId.ShouldBe("dyn:ups:03");
    }

    [Fact]
    public void ApplySelectionsToGroups_GroupWithoutSelection_DoesNotModify()
    {
        var groupId1 = Guid.NewGuid();
        var groupId2 = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId1,
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND")),
            CreateGroup(groupId2,
                CreateOption(cost: 8m, daysTo: 7, providerKey: "ups", serviceCode: "03"))
        };
        var selections = new Dictionary<Guid, string>
        {
            [groupId1] = "dyn:fedex:GROUND"
            // groupId2 has no selection
        };

        ShippingAutoSelector.ApplySelectionsToGroups(groups, selections);

        groups[0].SelectedShippingOptionId.ShouldBe("dyn:fedex:GROUND");
        groups[1].SelectedShippingOptionId.ShouldBeNull();
    }

    #endregion

    #region ValidatePreviousSelections

    [Fact]
    public void ValidatePreviousSelections_NullPrevious_ReturnsEmpty()
    {
        var groups = new[]
        {
            CreateGroup(Guid.NewGuid(),
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND"))
        };

        var result = ShippingAutoSelector.ValidatePreviousSelections(groups, null);

        result.ShouldBeEmpty();
    }

    [Fact]
    public void ValidatePreviousSelections_EmptyPrevious_ReturnsEmpty()
    {
        var groups = new[]
        {
            CreateGroup(Guid.NewGuid(),
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND"))
        };

        var result = ShippingAutoSelector.ValidatePreviousSelections(groups, new Dictionary<string, string>());

        result.ShouldBeEmpty();
    }

    [Fact]
    public void ValidatePreviousSelections_ValidExactMatch_ReturnsSelection()
    {
        var groupId = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND"),
                CreateOption(cost: 20m, daysTo: 2, providerKey: "fedex", serviceCode: "EXPRESS"))
        };
        var previous = new Dictionary<string, string>
        {
            [groupId.ToString()] = "dyn:fedex:EXPRESS"
        };

        var result = ShippingAutoSelector.ValidatePreviousSelections(groups, previous);

        result.Count.ShouldBe(1);
        result[groupId].ShouldBe("dyn:fedex:EXPRESS");
    }

    [Fact]
    public void ValidatePreviousSelections_OptionNoLongerAvailable_ExcludesSelection()
    {
        var groupId = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND"))
            // EXPRESS no longer available
        };
        var previous = new Dictionary<string, string>
        {
            [groupId.ToString()] = "dyn:ups:01" // UPS not available
        };

        var result = ShippingAutoSelector.ValidatePreviousSelections(groups, previous);

        result.ShouldBeEmpty();
    }

    [Fact]
    public void ValidatePreviousSelections_DynamicProvider_SameProviderDifferentService_Keeps()
    {
        var groupId = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND"),
                CreateOption(cost: 20m, daysTo: 2, providerKey: "fedex", serviceCode: "EXPRESS"))
        };
        var previous = new Dictionary<string, string>
        {
            // Previous selection used a service code that's no longer listed, but provider still available
            [groupId.ToString()] = "dyn:fedex:HOME_DELIVERY"
        };

        var result = ShippingAutoSelector.ValidatePreviousSelections(groups, previous);

        // Should keep it because fedex provider is still available
        result.Count.ShouldBe(1);
        result[groupId].ShouldBe("dyn:fedex:HOME_DELIVERY");
    }

    [Fact]
    public void ValidatePreviousSelections_DynamicProvider_ProviderNotAvailable_Excludes()
    {
        var groupId = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND"))
        };
        var previous = new Dictionary<string, string>
        {
            [groupId.ToString()] = "dyn:ups:03" // UPS provider not available for this group
        };

        var result = ShippingAutoSelector.ValidatePreviousSelections(groups, previous);

        result.ShouldBeEmpty();
    }

    [Fact]
    public void ValidatePreviousSelections_FlatRateOption_ExactMatch_Keeps()
    {
        var groupId = Guid.NewGuid();
        var optionId = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateFlatRateOption(optionId, "Standard", cost: 5m, daysTo: 5))
        };
        var previous = new Dictionary<string, string>
        {
            [groupId.ToString()] = $"so:{optionId}"
        };

        var result = ShippingAutoSelector.ValidatePreviousSelections(groups, previous);

        result.Count.ShouldBe(1);
        result[groupId].ShouldBe($"so:{optionId}");
    }

    [Fact]
    public void ValidatePreviousSelections_FlatRateOption_NotAvailable_Excludes()
    {
        var groupId = Guid.NewGuid();
        var availableId = Guid.NewGuid();
        var previousId = Guid.NewGuid(); // Different option
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateFlatRateOption(availableId, "Standard", cost: 5m, daysTo: 5))
        };
        var previous = new Dictionary<string, string>
        {
            [groupId.ToString()] = $"so:{previousId}" // Not in available options
        };

        var result = ShippingAutoSelector.ValidatePreviousSelections(groups, previous);

        result.ShouldBeEmpty();
    }

    [Fact]
    public void ValidatePreviousSelections_EmptySelectionKey_Skips()
    {
        var groupId = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId,
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND"))
        };
        var previous = new Dictionary<string, string>
        {
            [groupId.ToString()] = "" // Empty selection
        };

        var result = ShippingAutoSelector.ValidatePreviousSelections(groups, previous);

        result.ShouldBeEmpty();
    }

    [Fact]
    public void ValidatePreviousSelections_MultipleGroups_ValidatesEachIndependently()
    {
        var groupId1 = Guid.NewGuid();
        var groupId2 = Guid.NewGuid();
        var groups = new[]
        {
            CreateGroup(groupId1,
                CreateOption(cost: 10m, daysTo: 5, providerKey: "fedex", serviceCode: "GROUND")),
            CreateGroup(groupId2,
                CreateOption(cost: 8m, daysTo: 7, providerKey: "ups", serviceCode: "03"))
        };
        var previous = new Dictionary<string, string>
        {
            [groupId1.ToString()] = "dyn:fedex:GROUND",  // Valid
            [groupId2.ToString()] = "dyn:fedex:EXPRESS"   // Invalid (fedex not in group2)
        };

        var result = ShippingAutoSelector.ValidatePreviousSelections(groups, previous);

        result.Count.ShouldBe(1);
        result.ShouldContainKey(groupId1);
        result.ShouldNotContainKey(groupId2);
    }

    #endregion

    #region Helper Methods

    private static OrderGroup CreateGroup(Guid groupId, params ShippingOptionInfo[] options)
    {
        return new OrderGroup
        {
            GroupId = groupId,
            GroupName = "Test Group",
            WarehouseId = Guid.NewGuid(),
            LineItems = [],
            AvailableShippingOptions = options.ToList()
        };
    }

    private static ShippingOptionInfo CreateOption(
        decimal cost,
        int daysTo,
        string providerKey,
        string serviceCode,
        int daysFrom = 0)
    {
        return new ShippingOptionInfo
        {
            ShippingOptionId = Guid.Empty,
            Name = $"{providerKey} {serviceCode}",
            ProviderKey = providerKey,
            ServiceCode = serviceCode,
            Cost = cost,
            DaysFrom = daysFrom > 0 ? daysFrom : daysTo - 1,
            DaysTo = daysTo
        };
    }

    private static ShippingOptionInfo CreateFlatRateOption(
        Guid optionId,
        string name,
        decimal cost,
        int daysTo,
        bool isNextDay = false)
    {
        return new ShippingOptionInfo
        {
            ShippingOptionId = optionId,
            Name = name,
            ProviderKey = "flat-rate",
            Cost = cost,
            DaysFrom = isNextDay ? 0 : daysTo - 1,
            DaysTo = isNextDay ? 0 : daysTo,
            IsNextDay = isNextDay
        };
    }

    #endregion
}
