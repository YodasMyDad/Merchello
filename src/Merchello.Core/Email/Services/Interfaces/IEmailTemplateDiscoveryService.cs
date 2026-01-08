using Merchello.Core.Email.Models;

namespace Merchello.Core.Email.Services.Interfaces;

/// <summary>
/// Discovers available email templates from the file system.
/// </summary>
public interface IEmailTemplateDiscoveryService
{
    /// <summary>
    /// Gets all available email templates.
    /// </summary>
    IReadOnlyList<EmailTemplateInfo> GetAvailableTemplates();

    /// <summary>
    /// Checks if a template exists.
    /// </summary>
    /// <param name="templatePath">The template path (e.g., "OrderConfirmation.cshtml").</param>
    bool TemplateExists(string templatePath);

    /// <summary>
    /// Gets a template by its path.
    /// </summary>
    /// <param name="templatePath">The template path.</param>
    EmailTemplateInfo? GetTemplate(string templatePath);

    /// <summary>
    /// Gets the full file system path for a template.
    /// </summary>
    /// <param name="templatePath">The template path.</param>
    string? GetFullPath(string templatePath);
}
