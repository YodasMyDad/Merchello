namespace Merchello.Core.Actions.Models;

/// <summary>
/// Metadata describing a custom backoffice action.
/// </summary>
public record ActionMetadata
{
    /// <summary>
    /// Unique key identifying this action (e.g., "my-company.generate-packing-slip").
    /// </summary>
    public required string Key { get; init; }

    /// <summary>
    /// Display name shown in the dropdown.
    /// </summary>
    public required string DisplayName { get; init; }

    /// <summary>
    /// Which page category this action appears on.
    /// </summary>
    public required ActionCategory Category { get; init; }

    /// <summary>
    /// How the action executes when clicked.
    /// </summary>
    public required ActionBehavior Behavior { get; init; }

    /// <summary>
    /// Optional icon class (e.g., "icon-document").
    /// </summary>
    public string? Icon { get; init; }

    /// <summary>
    /// Optional description shown as tooltip.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Sort order within the dropdown. Lower values appear first.
    /// </summary>
    public int SortOrder { get; init; } = 1000;

    /// <summary>
    /// For Sidebar behavior: JS module path relative to the web root
    /// (e.g., "/_content/MyPackage/my-action-panel.js").
    /// </summary>
    public string? SidebarJsModule { get; init; }

    /// <summary>
    /// For Sidebar behavior: custom element tag name
    /// (e.g., "my-action-panel").
    /// </summary>
    public string? SidebarElementTag { get; init; }

    /// <summary>
    /// For Sidebar behavior: modal size ("small", "medium", "large").
    /// </summary>
    public string SidebarSize { get; init; } = "medium";
}
