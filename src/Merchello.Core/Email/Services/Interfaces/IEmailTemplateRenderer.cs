namespace Merchello.Core.Email.Services.Interfaces;

/// <summary>
/// Renders email templates to HTML strings.
/// </summary>
/// <remarks>
/// This interface is defined in Core so EmailService can use constructor injection.
/// The implementation (EmailRazorViewRenderer) lives in the web project since it
/// requires ASP.NET Core MVC dependencies.
/// </remarks>
public interface IEmailTemplateRenderer
{
    /// <summary>
    /// Renders a template to an HTML string.
    /// </summary>
    /// <param name="viewPath">The relative path to the view (e.g., "OrderConfirmation.cshtml").</param>
    /// <param name="model">The model to pass to the view.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The rendered HTML string.</returns>
    Task<string> RenderAsync(string viewPath, object model, CancellationToken ct = default);

    /// <summary>
    /// Checks if a template exists at the specified path.
    /// </summary>
    /// <param name="viewPath">The relative path to the view.</param>
    /// <returns>True if the template exists, false otherwise.</returns>
    bool ViewExists(string viewPath);
}
