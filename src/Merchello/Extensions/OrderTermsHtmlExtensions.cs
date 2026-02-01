using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Html;

namespace Merchello.Extensions;

/// <summary>
/// Extension methods for rendering order terms text with {key:Label} link tokens.
/// </summary>
public static partial class OrderTermsHtmlExtensions
{
    [GeneratedRegex(@"\{(\w+):([^}]+)\}")]
    private static partial Regex LinkTokenPattern();

    /// <summary>
    /// Converts {key:Label} tokens in text into clickable anchor tags with Alpine click handlers.
    /// Example: "{terms:Terms &amp; Conditions}" becomes an anchor that calls openTermsModal('terms').
    /// </summary>
    public static IHtmlContent RenderOrderTermsText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return HtmlString.Empty;

        var html = System.Net.WebUtility.HtmlEncode(text);

        html = LinkTokenPattern().Replace(html, match =>
        {
            var key = match.Groups[1].Value;
            var label = match.Groups[2].Value;
            return $"<a href=\"#\" @click.prevent.stop=\"openTermsModal('{key}')\" class=\"text-accent underline hover:no-underline\">{label}</a>";
        });

        return new HtmlString(html);
    }
}
