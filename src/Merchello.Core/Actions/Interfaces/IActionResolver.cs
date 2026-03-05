using Merchello.Core.Actions.Models;

namespace Merchello.Core.Actions.Interfaces;

/// <summary>
/// Resolves discovered <see cref="IMerchelloAction"/> implementations.
/// </summary>
public interface IActionResolver
{
    /// <summary>
    /// Gets all discovered actions.
    /// </summary>
    IReadOnlyCollection<IMerchelloAction> GetActions();

    /// <summary>
    /// Gets actions filtered by category.
    /// </summary>
    IReadOnlyCollection<IMerchelloAction> GetActionsForCategory(ActionCategory category);

    /// <summary>
    /// Gets a single action by its unique key, or null if not found.
    /// </summary>
    IMerchelloAction? GetAction(string key);
}
