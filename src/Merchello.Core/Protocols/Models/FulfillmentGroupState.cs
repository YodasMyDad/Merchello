namespace Merchello.Core.Protocols.Models;

/// <summary>
/// A group of items that ship together (e.g., from the same warehouse).
/// </summary>
public class FulfillmentGroupState
{
    public required string GroupId { get; init; }
    public string? GroupName { get; init; }
    public required IReadOnlyList<string> LineItemIds { get; init; }
    public string? SelectedOptionId { get; init; }
    public required IReadOnlyList<FulfillmentOptionState> Options { get; init; }
}
