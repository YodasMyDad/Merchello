using Merchello.Core.Actions.Interfaces;
using Merchello.Core.Actions.Models;
using Merchello.Core.Shared.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Actions;

/// <summary>
/// Discovers and caches <see cref="IMerchelloAction"/> implementations via ExtensionManager.
/// </summary>
public class ActionResolver : IActionResolver, IDisposable
{
    private readonly ExtensionManager _extensionManager;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<ActionResolver> _logger;
    private readonly object _lock = new();
    private IReadOnlyCollection<IMerchelloAction>? _cachedActions;
    private IServiceScope? _actionScope;
    private bool _disposed;

    public ActionResolver(
        ExtensionManager extensionManager,
        IServiceScopeFactory serviceScopeFactory,
        ILogger<ActionResolver> logger)
    {
        _extensionManager = extensionManager;
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
    }

    /// <inheritdoc />
    public IReadOnlyCollection<IMerchelloAction> GetActions()
    {
        if (_cachedActions != null)
        {
            return _cachedActions;
        }

        lock (_lock)
        {
            // Double-check after acquiring lock
            if (_cachedActions != null)
            {
                return _cachedActions;
            }

            _actionScope?.Dispose();
            _actionScope = _serviceScopeFactory.CreateScope();

            var actions = _extensionManager.GetInstances<IMerchelloAction>(
                    predicate: null,
                    useCaching: true,
                    serviceProvider: _actionScope.ServiceProvider)
                .Where(a => a != null)
                .Cast<IMerchelloAction>()
                .ToList();

            // Validate no duplicate keys
            var duplicateKeys = actions
                .GroupBy(a => a.Metadata.Key, StringComparer.OrdinalIgnoreCase)
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToList();

            if (duplicateKeys.Count > 0)
            {
                _logger.LogWarning(
                    "Duplicate action keys detected: {DuplicateKeys}. Only the first instance of each will be used.",
                    string.Join(", ", duplicateKeys));

                actions = actions
                    .GroupBy(a => a.Metadata.Key, StringComparer.OrdinalIgnoreCase)
                    .Select(g => g.First())
                    .ToList();
            }

            _cachedActions = actions;

            _logger.LogDebug(
                "Discovered {Count} backoffice actions: {Actions}",
                actions.Count,
                string.Join(", ", actions.Select(a => a.Metadata.Key)));
        }

        return _cachedActions;
    }

    /// <inheritdoc />
    public IReadOnlyCollection<IMerchelloAction> GetActionsForCategory(ActionCategory category)
    {
        return GetActions()
            .Where(a => a.Metadata.Category == category)
            .OrderBy(a => a.Metadata.SortOrder)
            .ToList();
    }

    /// <inheritdoc />
    public IMerchelloAction? GetAction(string key)
    {
        return GetActions()
            .FirstOrDefault(a => a.Metadata.Key.Equals(key, StringComparison.OrdinalIgnoreCase));
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        if (_cachedActions != null)
        {
            foreach (var action in _cachedActions)
            {
                if (action is IDisposable disposable)
                {
                    try
                    {
                        disposable.Dispose();
                    }
                    catch
                    {
                        // Ignore disposal errors
                    }
                }
            }
        }

        _actionScope?.Dispose();
        _actionScope = null;
        _cachedActions = null;

        GC.SuppressFinalize(this);
    }
}
