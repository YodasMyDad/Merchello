using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Models.PublishedContent;

namespace Merchello.Site.Shared.Extensions;

public static class PublishedContentExtensions
{
    /// <summary>
    /// Gets the UDI for a bit of IPublished content
    /// </summary>
    /// <param name="content"></param>
    /// <returns></returns>
    /// <exception cref="ArgumentNullException"></exception>
    /// <exception cref="InvalidOperationException"></exception>
    public static Udi GetUdi(this IPublishedContent content) {
        if (content == null) throw new ArgumentNullException(nameof(content));
        return content.ItemType switch {
            PublishedItemType.Content => Udi.Create("document", content.Key),
            PublishedItemType.Media => Udi.Create("media", content.Key),
            PublishedItemType.Member => Udi.Create("member", content.Key),
            PublishedItemType.Element => Udi.Create("element", content.Key),
            _ => throw new InvalidOperationException($"Unsupported item type: {content.ItemType}")
        };
    }

    /// <summary>
    /// Checks whether an ID exists in a path
    /// </summary>
    /// <param name="content"></param>
    /// <param name="id"></param>
    /// <param name="idsToIgnore"></param>
    /// <returns></returns>
    public static bool IdExistsInPath(this IPublishedContent content, int id, List<int>? idsToIgnore = null)
    {
        var split = content.Path.ToListInt();
        idsToIgnore?.ForEach(item => split.Remove(item));
        return split.Contains(id);
    }

    public static IPublishedContent? Next(this IPublishedContent content)
    {
        var nextPublishedContentItem = default(IPublishedContent);
        var indexedSiblings = content.SiblingsAndSelf().ToIndexedArray();
        var currentContentItem = indexedSiblings.FirstOrDefault(f => f.Content.Id == content.Id);
        if (currentContentItem.IsNotLast())
        {
            IndexedArrayItem<IPublishedContent?> nextItem = indexedSiblings[currentContentItem.Index + 1];
            nextPublishedContentItem = nextItem.Content;
        }
        return nextPublishedContentItem;
    }
    public static IPublishedContent? Previous(this IPublishedContent content)
    {
        var prevPublishedContentItem = default(IPublishedContent);
        var indexedSiblings = content.SiblingsAndSelf().ToIndexedArray();
        var currentContentItem = indexedSiblings.FirstOrDefault(f => f.Content.Id == content.Id);
        if (currentContentItem.IsNotFirst())
        {
            IndexedArrayItem<IPublishedContent> nextItem = indexedSiblings[currentContentItem.Index -1];
            prevPublishedContentItem = nextItem.Content;
        }
        return prevPublishedContentItem;
    }
}
