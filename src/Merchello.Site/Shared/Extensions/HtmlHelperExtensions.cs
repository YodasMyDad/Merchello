using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace Merchello.Site.Shared.Extensions;

public static class HtmlHelperExtensions
{
    /// <summary>
    ///     Creates the embed code for YouTube videos from a YouTube Url
    /// </summary>
    /// <param name="helper"></param>
    /// <param name="url"></param>
    /// <returns></returns>
    public static string EmbedYouTubeVideo(this IHtmlHelper helper, string url)
    {
        if (url.IndexOf("youtube.com", StringComparison.CurrentCultureIgnoreCase) > 0 ||
            url.IndexOf("youtu.be", StringComparison.CurrentCultureIgnoreCase) > 0)
        {
            const string pattern =
                @"(?:https?:\/\/)?(?:www\.)?(?:(?:(?:youtube.com\/watch\?[^?]*v=|youtu.be\/)([\w\-]+))(?:[^\s?]+)?)";
            const string replacement =
                "<iframe src='https://www.youtube.com/embed/$1?rel=0' loading='lazy' class='w-full aspect-video' frameborder='0' allow='accelerometer; autoplay; gyroscope' allowfullscreen></iframe>";

            var rgx = new Regex(pattern);
            url = rgx.Replace(url, replacement);
        }

        return url;
    }
}
