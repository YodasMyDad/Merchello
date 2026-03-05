using Merchello.Core.Actions.Models;

namespace Merchello.Core.Actions.Interfaces;

/// <summary>
/// Contract for custom backoffice actions.
/// Implementations are auto-discovered via ExtensionManager from any loaded assembly.
/// </summary>
public interface IMerchelloAction
{
    /// <summary>
    /// Metadata describing this action (key, display name, category, behavior, etc.).
    /// </summary>
    ActionMetadata Metadata { get; }

    /// <summary>
    /// Executes the action. Called for ServerSide and Download behaviors.
    /// Sidebar actions may return <see cref="ActionResult.Ok()"/> since their logic lives in the custom UI.
    /// </summary>
    Task<ActionResult> ExecuteAsync(ActionContext context, CancellationToken cancellationToken = default);
}
