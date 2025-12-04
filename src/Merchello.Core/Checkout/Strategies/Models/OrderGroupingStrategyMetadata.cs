namespace Merchello.Core.Checkout.Strategies.Models;

/// <summary>
/// Immutable metadata describing an order grouping strategy implementation.
/// </summary>
public readonly record struct OrderGroupingStrategyMetadata(
    string Key,
    string DisplayName,
    string? Description = null);

