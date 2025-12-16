using Umbraco.Cms.Core.Strings;

namespace Merchello.Services;

/// <summary>
/// Service for rendering TipTap rich text content with proper link, media, and block resolution.
/// </summary>
public interface IRichTextRenderer
{
    /// <summary>
    /// Renders a RichTextEditorValue JSON string to HTML with resolved links, media, and blocks.
    /// </summary>
    /// <param name="richTextJson">The JSON string containing markup and optional blocks</param>
    /// <returns>HTML-encoded string safe for Razor rendering</returns>
    IHtmlEncodedString Render(string? richTextJson);
}
