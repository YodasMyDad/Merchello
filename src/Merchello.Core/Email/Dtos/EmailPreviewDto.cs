namespace Merchello.Core.Email.Dtos;

/// <summary>
/// DTO for email preview results.
/// </summary>
public class EmailPreviewDto
{
    /// <summary>
    /// The resolved To address(es).
    /// </summary>
    public string To { get; set; } = string.Empty;

    /// <summary>
    /// The resolved CC address(es), if any.
    /// </summary>
    public string? Cc { get; set; }

    /// <summary>
    /// The resolved BCC address(es), if any.
    /// </summary>
    public string? Bcc { get; set; }

    /// <summary>
    /// The resolved From address.
    /// </summary>
    public string From { get; set; } = string.Empty;

    /// <summary>
    /// The resolved subject line.
    /// </summary>
    public string Subject { get; set; } = string.Empty;

    /// <summary>
    /// The rendered HTML body.
    /// </summary>
    public string Body { get; set; } = string.Empty;

    /// <summary>
    /// Whether the preview was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if preview failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Warning messages (e.g., template not found).
    /// </summary>
    public List<string> Warnings { get; set; } = [];
}
