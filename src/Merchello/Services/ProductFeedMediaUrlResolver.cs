using Merchello.Core.ProductFeeds.Services.Interfaces;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Services;

namespace Merchello.Services;

public class ProductFeedMediaUrlResolver(
    IMediaService mediaService,
    MediaUrlGeneratorCollection mediaUrlGenerators) : IProductFeedMediaUrlResolver
{
    public string? ResolveMediaUrl(string? imageReference)
    {
        if (string.IsNullOrWhiteSpace(imageReference))
        {
            return null;
        }

        var value = imageReference.Trim();
        if (value.StartsWith('/') || value.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            return value;
        }

        if (!Guid.TryParse(value, out var mediaKey))
        {
            return null;
        }

        var media = mediaService.GetById(mediaKey);
        if (media == null)
        {
            return null;
        }

        return mediaUrlGenerators.TryGetMediaPath(
                media.ContentType.Alias,
                media.GetValue<string>("umbracoFile"),
                out var mediaPath)
            ? mediaPath
            : null;
    }
}
