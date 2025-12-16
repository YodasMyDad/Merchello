using Merchello.Services;
using Umbraco.Cms.Core.Strings;

namespace Merchello.Extensions;

public static class RichTextExtensions
{
    /// <summary>
    /// Renders TipTap rich text content (RichTextEditorValue JSON) to HTML.
    /// Resolves internal links, media sources, URLs, and handles blocks.
    /// </summary>
    /// <param name="richTextJson">The RichTextEditorValue JSON string (or legacy markup)</param>
    /// <param name="renderer">The rich text renderer service</param>
    /// <returns>HTML-encoded string safe for Razor rendering</returns>
    public static IHtmlEncodedString ToTipTapHtml(
        this string? richTextJson,
        IRichTextRenderer renderer)
    {
        return renderer.Render(richTextJson);
    }
}
