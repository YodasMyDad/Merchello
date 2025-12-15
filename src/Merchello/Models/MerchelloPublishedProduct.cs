using Merchello.Core.Products.Models;
using Umbraco.Cms.Core.Models.PublishedContent;

namespace Merchello.Models;

/// <summary>
/// Virtual IPublishedContent wrapper for ProductRoot.
/// Required for Umbraco's routing pipeline and Layout compatibility.
/// When an element type is configured, exposes element properties via IPublishedContent interface.
/// </summary>
public class MerchelloPublishedProduct : IPublishedContent
{
    private readonly ProductRoot _productRoot;
    private readonly IPublishedElement? _element;

    public MerchelloPublishedProduct(
        ProductRoot productRoot,
        MerchelloProductViewModel viewModel,
        IPublishedElement? element = null)
    {
        _productRoot = productRoot;
        ViewModel = viewModel;
        _element = element;
    }

    /// <summary>
    /// The view model containing product data for Razor views.
    /// </summary>
    public MerchelloProductViewModel ViewModel { get; }

    /// <summary>
    /// The view alias used to render this product (e.g., "Gallery" -> ~/Views/Products/Gallery.cshtml).
    /// </summary>
    public string? ViewAlias => _productRoot.ViewAlias;

    // Route hijacking trigger - Umbraco finds MerchelloProductController
    // When element type is configured, creates hybrid content type that delegates property types
    public IPublishedContentType ContentType =>
        _element?.ContentType is not null
            ? new MerchelloProductContentType(_element.ContentType)
            : MerchelloProductContentType.Instance;

    // Element properties accessible via IPublishedContent interface
    public IEnumerable<IPublishedProperty> Properties =>
        _element?.Properties ?? Enumerable.Empty<IPublishedProperty>();

    public IPublishedProperty? GetProperty(string alias) =>
        _element?.GetProperty(alias);

    // IPublishedElement implementation
    public Guid Key => _productRoot.Id;

    // IPublishedContent - Required for Layout compatibility
    public int Id => _productRoot.Id.GetHashCode();
    public string Name => _productRoot.RootName ?? string.Empty;
    public string? UrlSegment => _productRoot.RootUrl;
    public int SortOrder => 0;
    public int Level => 1;
    public string Path => $"-1,{Id}";
    public int? TemplateId => null; // Not used - route hijacking handles view selection
    public int CreatorId => -1;
    public DateTime CreateDate => DateTime.MinValue;
    public int WriterId => -1;
    public DateTime UpdateDate => DateTime.UtcNow;

    public IReadOnlyDictionary<string, PublishedCultureInfo> Cultures =>
        new Dictionary<string, PublishedCultureInfo>();

    public PublishedItemType ItemType => PublishedItemType.Content;

    [Obsolete("Use IPublishedContent.ChildrenForAllCultures property instead")]
    public IPublishedContent? Parent => null;

    [Obsolete("Use IPublishedContent.ChildrenForAllCultures property instead")]
    public IEnumerable<IPublishedContent> Children => [];

    public IEnumerable<IPublishedContent> ChildrenForAllCultures => [];

    public bool IsDraft(string? culture = null) => false;
    public bool IsPublished(string? culture = null) => true;
}
