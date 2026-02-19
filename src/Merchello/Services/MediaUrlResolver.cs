using Merchello.Core.Shared.Services.Interfaces;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Services;

namespace Merchello.Services;

public class MediaUrlResolver(
    IMediaService mediaService,
    MediaUrlGeneratorCollection mediaUrlGenerators) : IMediaUrlResolver
{
    public string? ResolveMediaUrl(Guid? mediaKey)
    {
        if (!mediaKey.HasValue)
        {
            return null;
        }

        var media = mediaService.GetById(mediaKey.Value);
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

    public string? ResolveMediaUrl(string? mediaKey)
    {
        if (string.IsNullOrWhiteSpace(mediaKey))
        {
            return null;
        }

        if (Guid.TryParse(mediaKey.Trim(), out var parsed))
        {
            return ResolveMediaUrl(parsed);
        }

        return null;
    }
}
