namespace Merchello.Core.Actions.Dtos;

/// <summary>
/// Result DTO returned from executing a server-side action.
/// </summary>
public record ExecuteActionResultDto
{
    public bool Success { get; init; }

    public string? Message { get; init; }
}
