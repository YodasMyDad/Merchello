using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Reflection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Checkout.Strategies;

/// <summary>
/// Resolves the active order grouping strategy based on configuration.
/// Uses ExtensionManager for type discovery, consistent with other provider patterns.
/// </summary>
public class OrderGroupingStrategyResolver : IOrderGroupingStrategyResolver
{
    private readonly ExtensionManager _extensionManager;
    private readonly MerchelloSettings _settings;
    private readonly ILogger<OrderGroupingStrategyResolver> _logger;
    private IReadOnlyCollection<IOrderGroupingStrategy>? _cachedStrategies;

    public OrderGroupingStrategyResolver(
        ExtensionManager extensionManager,
        IOptions<MerchelloSettings> settings,
        ILogger<OrderGroupingStrategyResolver> logger)
    {
        _extensionManager = extensionManager;
        _settings = settings.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public IOrderGroupingStrategy GetStrategy()
    {
        var strategies = GetAvailableStrategies();

        // If a custom strategy is configured, try to find it
        if (!string.IsNullOrWhiteSpace(_settings.OrderGroupingStrategy))
        {
            var configuredStrategy = FindStrategyByTypeOrKey(_settings.OrderGroupingStrategy, strategies);

            if (configuredStrategy != null)
            {
                _logger.LogDebug(
                    "Using configured order grouping strategy: {StrategyKey}",
                    configuredStrategy.Metadata.Key);
                return configuredStrategy;
            }

            _logger.LogWarning(
                "Configured order grouping strategy '{ConfiguredStrategy}' not found. Falling back to default.",
                _settings.OrderGroupingStrategy);
        }

        // Fall back to default strategy
        var defaultStrategy = strategies.FirstOrDefault(s =>
            s.Metadata.Key.Equals("default-warehouse", StringComparison.OrdinalIgnoreCase));

        if (defaultStrategy != null)
        {
            return defaultStrategy;
        }

        // If somehow no default exists, return the first available
        if (strategies.Count > 0)
        {
            _logger.LogWarning(
                "Default order grouping strategy not found. Using first available: {StrategyKey}",
                strategies.First().Metadata.Key);
            return strategies.First();
        }

        throw new InvalidOperationException(
            "No order grouping strategies found. Ensure DefaultOrderGroupingStrategy is registered.");
    }

    /// <inheritdoc />
    public IReadOnlyCollection<IOrderGroupingStrategy> GetAvailableStrategies()
    {
        if (_cachedStrategies != null)
        {
            return _cachedStrategies;
        }

        var strategies = _extensionManager.GetInstances<IOrderGroupingStrategy>(useCaching: true)
            .Where(s => s != null)
            .Cast<IOrderGroupingStrategy>()
            .ToList();

        // Validate no duplicate keys
        var duplicateKeys = strategies
            .GroupBy(s => s.Metadata.Key, StringComparer.OrdinalIgnoreCase)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        if (duplicateKeys.Count > 0)
        {
            _logger.LogWarning(
                "Duplicate order grouping strategy keys detected: {DuplicateKeys}. Only the first instance of each will be used.",
                string.Join(", ", duplicateKeys));

            strategies = strategies
                .GroupBy(s => s.Metadata.Key, StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .ToList();
        }

        _cachedStrategies = strategies;

        _logger.LogDebug(
            "Discovered {Count} order grouping strategies: {Strategies}",
            strategies.Count,
            string.Join(", ", strategies.Select(s => s.Metadata.Key)));

        return _cachedStrategies;
    }

    private static IOrderGroupingStrategy? FindStrategyByTypeOrKey(
        string configuredValue,
        IReadOnlyCollection<IOrderGroupingStrategy> strategies)
    {
        // First try to match by key (simpler configuration)
        var byKey = strategies.FirstOrDefault(s =>
            s.Metadata.Key.Equals(configuredValue, StringComparison.OrdinalIgnoreCase));

        if (byKey != null)
        {
            return byKey;
        }

        // Then try to match by fully qualified type name
        var byType = strategies.FirstOrDefault(s =>
            s.GetType().FullName?.Equals(configuredValue, StringComparison.OrdinalIgnoreCase) == true ||
            s.GetType().AssemblyQualifiedName?.Equals(configuredValue, StringComparison.OrdinalIgnoreCase) == true);

        return byType;
    }
}

