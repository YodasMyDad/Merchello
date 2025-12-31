namespace Merchello.Core.Checkout.Strategies.Interfaces;

/// <summary>
/// Resolves the active order grouping strategy based on configuration.
/// </summary>
public interface IOrderGroupingStrategyResolver
{
    /// <summary>
    /// Gets the configured order grouping strategy.
    /// Falls back to the default warehouse-based strategy if no custom strategy is configured.
    /// </summary>
    /// <returns>The active order grouping strategy.</returns>
    IOrderGroupingStrategy GetStrategy();

    /// <summary>
    /// Gets all available order grouping strategies discovered in the application.
    /// </summary>
    /// <returns>Collection of all available strategies.</returns>
    IReadOnlyCollection<IOrderGroupingStrategy> GetAvailableStrategies();
}

