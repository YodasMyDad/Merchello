namespace Merchello.Core.Email.Services.Interfaces;

/// <summary>
/// Service for compiling MJML markup to responsive HTML.
/// </summary>
public interface IMjmlCompiler
{
    /// <summary>
    /// Compiles MJML markup to responsive HTML.
    /// </summary>
    /// <param name="mjml">The MJML markup to compile.</param>
    /// <returns>The compilation result containing HTML and any errors.</returns>
    MjmlCompileResult Compile(string mjml);

    /// <summary>
    /// Determines if the content appears to be MJML markup.
    /// </summary>
    /// <param name="content">The content to check.</param>
    /// <returns>True if the content contains MJML tags, false otherwise.</returns>
    bool IsMjml(string content);
}

/// <summary>
/// Result of MJML compilation.
/// </summary>
/// <param name="Html">The compiled HTML output.</param>
/// <param name="Errors">Any errors that occurred during compilation.</param>
/// <param name="Success">Whether the compilation succeeded.</param>
public record MjmlCompileResult(string Html, IReadOnlyList<string> Errors, bool Success);
