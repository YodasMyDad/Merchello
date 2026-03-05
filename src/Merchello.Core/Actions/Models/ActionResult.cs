namespace Merchello.Core.Actions.Models;

/// <summary>
/// Result returned from executing a custom backoffice action.
/// </summary>
public record ActionResult
{
    public bool Success { get; init; }

    public string? Message { get; init; }

    /// <summary>
    /// For Download behavior: the file bytes.
    /// </summary>
    public byte[]? FileBytes { get; init; }

    /// <summary>
    /// For Download behavior: the file name.
    /// </summary>
    public string? FileName { get; init; }

    /// <summary>
    /// For Download behavior: the content type (e.g., "application/pdf").
    /// </summary>
    public string? ContentType { get; init; }

    public static ActionResult Ok(string? message = null) => new() { Success = true, Message = message };

    public static ActionResult Fail(string message) => new() { Success = false, Message = message };
}
