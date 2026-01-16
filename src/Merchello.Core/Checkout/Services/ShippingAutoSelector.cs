using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Checkout.Services;

/// <summary>
/// Provides shipping option auto-selection logic for single-page and express checkout flows.
/// </summary>
public static class ShippingAutoSelector
{
    /// <summary>
    /// Auto-selects shipping options based on the specified strategy.
    /// </summary>
    /// <param name="groups">The order groups to select shipping for.</param>
    /// <param name="strategy">The selection strategy to use.</param>
    /// <returns>Dictionary mapping GroupId to selected ShippingOptionId.</returns>
    public static Dictionary<Guid, Guid> SelectOptions(
        IEnumerable<OrderGroup> groups,
        ShippingAutoSelectStrategy strategy = ShippingAutoSelectStrategy.Cheapest)
    {
        var selections = new Dictionary<Guid, Guid>();

        foreach (var group in groups)
        {
            var selected = strategy switch
            {
                ShippingAutoSelectStrategy.Cheapest => SelectCheapest(group.AvailableShippingOptions),
                ShippingAutoSelectStrategy.Fastest => SelectFastest(group.AvailableShippingOptions),
                ShippingAutoSelectStrategy.CheapestThenFastest => SelectCheapestThenFastest(group.AvailableShippingOptions),
                _ => SelectCheapest(group.AvailableShippingOptions)
            };

            if (selected.HasValue)
            {
                selections[group.GroupId] = selected.Value;
            }
        }

        return selections;
    }

    /// <summary>
    /// Calculates combined shipping total from selections.
    /// </summary>
    /// <param name="groups">The order groups.</param>
    /// <param name="selections">The selected shipping options by GroupId.</param>
    /// <returns>Total shipping cost.</returns>
    public static decimal CalculateCombinedTotal(
        IEnumerable<OrderGroup> groups,
        Dictionary<Guid, Guid> selections)
    {
        decimal total = 0;
        foreach (var group in groups)
        {
            if (selections.TryGetValue(group.GroupId, out var optionId))
            {
                var option = group.AvailableShippingOptions
                    .FirstOrDefault(o => o.ShippingOptionId == optionId);
                if (option != null)
                {
                    total += option.Cost;
                }
            }
        }
        return total;
    }

    /// <summary>
    /// Updates the SelectedShippingOptionId on each group based on selections.
    /// </summary>
    /// <param name="groups">The order groups to update.</param>
    /// <param name="selections">The selected shipping options by GroupId.</param>
    public static void ApplySelectionsToGroups(
        IEnumerable<OrderGroup> groups,
        Dictionary<Guid, Guid> selections)
    {
        foreach (var group in groups)
        {
            if (selections.TryGetValue(group.GroupId, out var optionId))
            {
                group.SelectedShippingOptionId = optionId;
            }
        }
    }

    /// <summary>
    /// Validates and restores previous shipping selections from frontend.
    /// Returns valid selections where the shipping option still exists for the group.
    /// Groups without a valid previous selection will need to use fallback (e.g., auto-select cheapest).
    /// </summary>
    /// <param name="groups">The order groups with available shipping options.</param>
    /// <param name="previousSelections">Frontend selections (groupId string -> optionId string).</param>
    /// <returns>Validated selections (GroupId Guid -> OptionId Guid) for groups with valid previous selections.</returns>
    public static Dictionary<Guid, Guid> ValidatePreviousSelections(
        IEnumerable<OrderGroup> groups,
        Dictionary<string, string>? previousSelections)
    {
        var validSelections = new Dictionary<Guid, Guid>();

        if (previousSelections == null || previousSelections.Count == 0)
        {
            return validSelections;
        }

        foreach (var group in groups)
        {
            var groupIdStr = group.GroupId.ToString();

            // Try to find a previous selection for this group
            if (!previousSelections.TryGetValue(groupIdStr, out var optionIdStr))
            {
                continue;
            }

            // Parse the option ID
            if (!Guid.TryParse(optionIdStr, out var optionId))
            {
                continue;
            }

            // Validate the option still exists for this group
            var optionExists = group.AvailableShippingOptions
                .Any(o => o.ShippingOptionId == optionId);

            if (optionExists)
            {
                validSelections[group.GroupId] = optionId;
            }
        }

        return validSelections;
    }

    private static Guid? SelectCheapest(IEnumerable<ShippingOptionInfo> options)
    {
        return options
            .OrderBy(o => o.Cost)
            .ThenBy(o => o.DaysTo) // Tie-breaker: faster delivery
            .Select(o => (Guid?)o.ShippingOptionId)
            .FirstOrDefault();
    }

    private static Guid? SelectFastest(IEnumerable<ShippingOptionInfo> options)
    {
        return options
            .OrderBy(o => o.DaysTo)
            .ThenBy(o => o.Cost) // Tie-breaker: cheaper
            .Select(o => (Guid?)o.ShippingOptionId)
            .FirstOrDefault();
    }

    private static Guid? SelectCheapestThenFastest(IEnumerable<ShippingOptionInfo> options)
    {
        var optionsList = options.ToList();
        if (optionsList.Count == 0) return null;

        // Group by cost, then select fastest within cheapest group
        var cheapestCost = optionsList.Min(o => o.Cost);
        return optionsList
            .Where(o => o.Cost == cheapestCost)
            .OrderBy(o => o.DaysTo)
            .Select(o => (Guid?)o.ShippingOptionId)
            .FirstOrDefault();
    }
}

/// <summary>
/// Strategy for auto-selecting shipping options.
/// </summary>
public enum ShippingAutoSelectStrategy
{
    /// <summary>
    /// Select the cheapest option, with faster delivery as tie-breaker.
    /// </summary>
    Cheapest = 0,

    /// <summary>
    /// Select the fastest option, with cheaper cost as tie-breaker.
    /// </summary>
    Fastest = 1,

    /// <summary>
    /// Select the cheapest option, then the fastest among equally priced options.
    /// </summary>
    CheapestThenFastest = 2
}
