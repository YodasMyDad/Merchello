namespace Merchello.Core.Email.Models;

/// <summary>
/// Information about a token available for use in email expressions.
/// </summary>
public class TokenInfo
{
    /// <summary>
    /// The token path (e.g., "order.customerEmail").
    /// </summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>
    /// Display name for the UI (e.g., "Customer Email").
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Optional description of what this token contains.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Data type of the value (e.g., "string", "decimal", "DateTime").
    /// </summary>
    public string DataType { get; set; } = "string";
}
