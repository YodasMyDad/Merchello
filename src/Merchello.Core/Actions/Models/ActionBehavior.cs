namespace Merchello.Core.Actions.Models;

/// <summary>
/// Determines how an action is executed when selected in the backoffice.
/// </summary>
public enum ActionBehavior
{
    /// <summary>
    /// Executes server-side and returns a result message.
    /// </summary>
    ServerSide,

    /// <summary>
    /// Opens a sidebar modal with custom UI from an external JS module.
    /// </summary>
    Sidebar,

    /// <summary>
    /// Triggers a file download from a server endpoint.
    /// </summary>
    Download
}
