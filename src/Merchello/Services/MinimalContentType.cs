using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.PublishedContent;

namespace Merchello.Services;

/// <summary>
/// Minimal IPublishedContentType for the owner element.
/// </summary>
internal sealed class MinimalContentType : IPublishedContentType
{
    public Guid Key { get; } = Guid.Empty;
    public int Id { get; } = 0;
    public string Alias { get; } = "merchelloProduct";
    public PublishedItemType ItemType { get; } = PublishedItemType.Content;
    public HashSet<string> CompositionAliases { get; } = [];
    public ContentVariation Variations { get; } = ContentVariation.Nothing;
    public bool IsElement { get; } = false;
    public IEnumerable<IPublishedPropertyType> PropertyTypes { get; } = [];
    public int GetPropertyIndex(string alias) => -1;
    public IPublishedPropertyType? GetPropertyType(string alias) => null;
    public IPublishedPropertyType? GetPropertyType(int index) => null;
}
