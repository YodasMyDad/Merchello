namespace Merchello.Core.Actions.Dtos;

/// <summary>
/// DTO exposing action metadata to the frontend.
/// </summary>
public record ActionDto
{
    public required string Key { get; init; }

    public required string DisplayName { get; init; }

    public required string Category { get; init; }

    public required string Behavior { get; init; }

    public string? Icon { get; init; }

    public string? Description { get; init; }

    public int SortOrder { get; init; }

    public string? SidebarJsModule { get; init; }

    public string? SidebarElementTag { get; init; }

    public string SidebarSize { get; init; } = "medium";
}
