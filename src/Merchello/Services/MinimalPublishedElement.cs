using Umbraco.Cms.Core.Models.PublishedContent;

namespace Merchello.Services;

/// <summary>
/// Minimal IPublishedElement implementation for block conversion owner requirement.
/// Used when we don't have a traditional Umbraco content item as owner.
/// </summary>
internal sealed class MinimalPublishedElement : IPublishedElement
{
    public IPublishedContentType ContentType { get; } = new MinimalContentType();
    public Guid Key { get; } = Guid.Empty;
    public IEnumerable<IPublishedProperty> Properties { get; } = [];
    public IPublishedProperty? GetProperty(string alias) => null;
}
