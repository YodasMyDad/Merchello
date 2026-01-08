namespace Merchello.Core.Email.Models;

/// <summary>
/// Information about an available email template on the file system.
/// </summary>
public class EmailTemplateInfo
{
    /// <summary>
    /// Relative path to the template (e.g., "OrderConfirmation.cshtml").
    /// </summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>
    /// Full file system path to the template.
    /// </summary>
    public string FullPath { get; set; } = string.Empty;

    /// <summary>
    /// Display name derived from file name (e.g., "Order Confirmation").
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// When the template file was last modified.
    /// </summary>
    public DateTime LastModified { get; set; }
}
