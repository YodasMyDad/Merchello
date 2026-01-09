using Merchello.Email.Services;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace Merchello.Email.Extensions;

/// <summary>
/// Extension methods for IHtmlHelper to provide MJML email template helpers.
/// </summary>
public static class MjmlHtmlHelperExtensions
{
    /// <summary>
    /// Gets the MJML helper for building responsive email components.
    /// </summary>
    /// <param name="html">The HTML helper.</param>
    /// <returns>An MJML helper instance.</returns>
    public static IMjmlHelper Mjml(this IHtmlHelper html) => new MjmlHelper(html);
}
