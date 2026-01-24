using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shared.Providers;

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
    /// <returns>Dictionary mapping GroupId to selected SelectionKey.</returns>
    public static Dictionary<Guid, string> SelectOptions(
        IEnumerable<OrderGroup> groups,
        ShippingAutoSelectStrategy strategy = ShippingAutoSelectStrategy.Cheapest)
    {
        var selections = new Dictionary<Guid, string>();

        foreach (var group in groups)
        {
            var selected = strategy switch
            {
                ShippingAutoSelectStrategy.Cheapest => SelectCheapest(group.AvailableShippingOptions),
                ShippingAutoSelectStrategy.Fastest => SelectFastest(group.AvailableShippingOptions),
                ShippingAutoSelectStrategy.CheapestThenFastest => SelectCheapestThenFastest(group.AvailableShippingOptions),
                _ => SelectCheapest(group.AvailableShippingOptions)
            };

            if (!string.IsNullOrEmpty(selected))
            {
                selections[group.GroupId] = selected;
            }
        }

        return selections;
    }

    /// <summary>
    /// Calculates combined shipping total from selections.
    /// </summary>
    /// <param name="groups">The order groups.</param>
    /// <param name="selections">The selected shipping options by GroupId (SelectionKey format).</param>
    /// <returns>Total shipping cost.</returns>
    public static decimal CalculateCombinedTotal(
        IEnumerable<OrderGroup> groups,
        Dictionary<Guid, string> selections)
    {
        decimal total = 0;
        foreach (var group in groups)
        {
            if (selections.TryGetValue(group.GroupId, out var selectionKey))
            {
                var option = group.AvailableShippingOptions
                    .FirstOrDefault(o => o.SelectionKey == selectionKey);
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
    /// <param name="selections">The selected shipping options by GroupId (SelectionKey format).</param>
    public static void ApplySelectionsToGroups(
        IEnumerable<OrderGroup> groups,
        Dictionary<Guid, string> selections)
    {
        foreach (var group in groups)
        {
            if (selections.TryGetValue(group.GroupId, out var selectionKey))
            {
                group.SelectedShippingOptionId = selectionKey;
            }
        }
    }

    /// <summary>
    /// Validates and restores previous shipping selections from frontend.
    /// Returns valid selections where the shipping option still exists for the group.
    /// Groups without a valid previous selection will need to use fallback (e.g., auto-select cheapest).
    /// </summary>
    /// <param name="groups">The order groups with available shipping options.</param>
    /// <param name="previousSelections">Frontend selections (groupId string -> SelectionKey string).</param>
    /// <returns>Validated selections (GroupId Guid -> SelectionKey string) for groups with valid previous selections.</returns>
    public static Dictionary<Guid, string> ValidatePreviousSelections(
        IEnumerable<OrderGroup> groups,
        Dictionary<string, string>? previousSelections)
    {
        var validSelections = new Dictionary<Guid, string>();

        if (previousSelections == null || previousSelections.Count == 0)
        {
            return validSelections;
        }

        foreach (var group in groups)
        {
            var groupIdStr = group.GroupId.ToString();

            // Try to find a previous selection for this group
            if (!previousSelections.TryGetValue(groupIdStr, out var selectionKey) || string.IsNullOrEmpty(selectionKey))
            {
                continue;
            }

            // Validate the option still exists for this group by matching SelectionKey
            var optionExists = group.AvailableShippingOptions
                .Any(o => o.SelectionKey == selectionKey);

            if (optionExists)
            {
                validSelections[group.GroupId] = selectionKey;
            }
            else if (SelectionKeyExtensions.IsDynamicProvider(selectionKey))
            {
                // For dynamic providers, check if any option from the same provider exists
                // This handles cases where service codes might have changed
                if (SelectionKeyExtensions.TryParse(selectionKey, out _, out var providerKey, out _) &&
                    group.AvailableShippingOptions.Any(o => o.ProviderKey == providerKey))
                {
                    // Keep the selection - backend will validate or get fresh rates
                    validSelections[group.GroupId] = selectionKey;
                }
            }
        }

        return validSelections;
    }

    private static string? SelectCheapest(IEnumerable<ShippingOptionInfo> options)
    {
        return options
            .OrderBy(o => o.Cost)
            .ThenBy(o => o.DaysTo) // Tie-breaker: faster delivery
            .Select(o => o.SelectionKey)
            .FirstOrDefault();
    }

    private static string? SelectFastest(IEnumerable<ShippingOptionInfo> options)
    {
        return options
            .OrderBy(o => o.DaysTo)
            .ThenBy(o => o.Cost) // Tie-breaker: cheaper
            .Select(o => o.SelectionKey)
            .FirstOrDefault();
    }

    private static string? SelectCheapestThenFastest(IEnumerable<ShippingOptionInfo> options)
    {
        var optionsList = options.ToList();
        if (optionsList.Count == 0) return null;

        // Group by cost, then select fastest within cheapest group
        var cheapestCost = optionsList.Min(o => o.Cost);
        return optionsList
            .Where(o => o.Cost == cheapestCost)
            .OrderBy(o => o.DaysTo)
            .Select(o => o.SelectionKey)
            .FirstOrDefault();
    }
}
