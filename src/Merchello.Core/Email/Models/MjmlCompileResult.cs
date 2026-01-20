namespace Merchello.Core.Email.Models;

/// <summary>
/// Result of MJML compilation.
/// </summary>
/// <param name="Html">The compiled HTML output.</param>
/// <param name="Errors">Any errors that occurred during compilation.</param>
/// <param name="Success">Whether the compilation succeeded.</param>
public record MjmlCompileResult(string Html, IReadOnlyList<string> Errors, bool Success);
