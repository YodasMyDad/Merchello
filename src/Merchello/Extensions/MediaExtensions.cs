using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PublishedCache;

namespace Merchello.Extensions;

public static class MediaExtensions
{
    /// <summary>
    /// Resolves a collection of media GUID strings to IPublishedContent media items.
    /// </summary>
    public static IEnumerable<IPublishedContent> ToMedia(
        this IEnumerable<string> mediaGuids,
        IPublishedMediaCache mediaCache)
    {
        foreach (var guidString in mediaGuids)
        {
            if (Guid.TryParse(guidString, out var guid))
            {
                var media = mediaCache.GetById(guid);
                if (media != null)
                {
                    yield return media;
                }
            }
        }
    }
}
