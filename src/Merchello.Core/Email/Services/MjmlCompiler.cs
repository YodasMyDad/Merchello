using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Mjml.Net;

namespace Merchello.Core.Email.Services;

/// <summary>
/// Compiles MJML markup to responsive HTML using Mjml.Net.
/// </summary>
public class MjmlCompiler(ILogger<MjmlCompiler> logger) : IMjmlCompiler
{
    private readonly MjmlRenderer _renderer = new();

    public MjmlCompileResult Compile(string mjml)
    {
        if (string.IsNullOrWhiteSpace(mjml))
        {
            return new MjmlCompileResult(mjml, [], true);
        }

        // If it's not MJML, return as-is (transparent fallback)
        if (!IsMjml(mjml))
        {
            return new MjmlCompileResult(mjml, [], true);
        }

        try
        {
            var options = new MjmlOptions
            {
                Beautify = false
            };

            var (html, errors) = _renderer.Render(mjml, options);

            var errorMessages = errors
                .Select(e => $"{e.Type}: {e.Error} at position {e.Position}")
                .ToList();

            if (errorMessages.Count > 0)
            {
                foreach (var error in errorMessages)
                {
                    logger.LogWarning("MJML compilation warning: {Error}", error);
                }
            }

            // Mjml.Net returns empty string on critical errors
            if (string.IsNullOrEmpty(html))
            {
                logger.LogError("MJML compilation failed - no HTML output generated");
                return new MjmlCompileResult(mjml, errorMessages, false);
            }

            return new MjmlCompileResult(html, errorMessages, true);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "MJML compilation failed with exception");
            return new MjmlCompileResult(mjml, [ex.Message], false);
        }
    }

    public bool IsMjml(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return false;

        // Check for MJML root element or any mj- tags
        var trimmed = content.TrimStart();
        return trimmed.StartsWith("<mjml", StringComparison.OrdinalIgnoreCase) ||
               trimmed.Contains("<mj-", StringComparison.OrdinalIgnoreCase);
    }
}
